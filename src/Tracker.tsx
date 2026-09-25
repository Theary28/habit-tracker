import { Component, useEffect, useState } from 'react'
import type { ErrorInfo, FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase.js'
import { flushPendingHabits, getPendingHabits, queueHabit } from './offlineQueue.js'

type Habit = { id: number; name: string; color: string; created_at: string; completed: boolean; pendingId?: string }
const MAX_AVATAR_SIZE = 1024 * 1024

type ErrorBoundaryProps = { section: string; children: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Error in ${this.props.section}`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return <div className="section-fallback"><strong>{this.props.section} unavailable</strong><button className="text-button" onClick={() => this.setState({ hasError: false })}>Try again</button></div>
    }
    return this.props.children
  }
}

function AvatarUploader({ userId }: { userId: string }) {
  const [avatarUrl, setAvatarUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!supabase) return
      const { data, error: queryError } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle()
      if (active && queryError) setError(queryError.message)
      if (active && data?.avatar_url) setAvatarUrl(data.avatar_url)
    }
    void loadProfile()
    return () => { active = false }
  }, [userId])

  async function uploadAvatar(file: File) {
    if (!supabase) return
    setUploading(true); setError('')
    const path = `${userId}/avatar`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) { setError(`Avatar upload failed: ${uploadError.message}`); setUploading(false); return }
    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: profileError } = await supabase.from('profiles').upsert({ id: userId, avatar_url: publicData.publicUrl, updated_at: new Date().toISOString() }).select('id, avatar_url').single()
    if (profileError) setError(`Profile save failed: ${profileError.message}`)
    else setAvatarUrl(`${publicData.publicUrl}?v=${Date.now()}`)
    setUploading(false)
  }

  function processFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); setPreviewUrl(''); return }
    if (file.size > MAX_AVATAR_SIZE) { setError('Images must be 1 MB or smaller.'); setPreviewUrl(''); return }
    setError(''); setFileName(file.name)
    setPreviewUrl(URL.createObjectURL(file))
    void uploadAvatar(file)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) { processFile(event.target.files?.[0]) }

  const displayUrl = previewUrl || avatarUrl
  return <div className={`avatar-uploader ${dragActive ? 'is-dragging' : ''}`} onDragEnter={() => setDragActive(true)} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); processFile(event.dataTransfer.files[0]) }}>
    <div className="avatar-frame">{displayUrl ? <img src={displayUrl} alt="Your profile avatar" width={58} height={58} loading="lazy" decoding="async" /> : <span>{userId.slice(0, 2).toUpperCase()}</span>}</div>
    <div className="avatar-copy"><div className="avatar-heading"><span>Profile image</span><span className="avatar-status">{uploading ? 'Uploading' : 'Ready'}</span></div><p className="avatar-hint">Drop an image here, or choose one</p><label className="avatar-button" htmlFor="avatar-file">Choose image</label><input className="avatar-input" id="avatar-file" accept="image/*" type="file" onChange={handleFileChange} /><p className="avatar-meta">{fileName || 'JPG, PNG, or GIF · max 1 MB'}</p>{error && <p className="notice error avatar-error">{error}</p>}</div>
  </div>
}

export default function Tracker({ session }: { session: Session }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabit, setNewHabit] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [error, setError] = useState('')
  const userId = session.user.id

  useEffect(() => {
    let active = true
    async function loadHabits() {
      if (!supabase) return
      setLoading(true)
      const [{ data, error: queryError }, { data: logs, error: logsError }] = await Promise.all([
        supabase.from('habits').select('id, name, color, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('daily_logs').select('habit_id, completed').eq('user_id', userId).eq('logged_on', new Date().toISOString().slice(0, 10)),
      ])
      if (active) {
        if (queryError || logsError) setError((queryError ?? logsError)?.message ?? 'Unable to load your habits.')
        else {
          const completedIds = new Set((logs ?? []).filter((log) => log.completed).map((log) => log.habit_id))
          const savedHabits = (data ?? []).map((habit) => ({ ...habit, completed: completedIds.has(habit.id) }))
          const queuedHabits = getPendingHabits(userId).map((habit, index) => ({ id: -(index + 1), name: habit.name, color: '#e58b54', created_at: habit.createdAt, completed: false, pendingId: habit.clientId }))
          setHabits([...savedHabits, ...queuedHabits])
        }
        setLoading(false)
      }
    }
    void loadHabits()
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    async function syncQueuedHabits() {
      const synced = await flushPendingHabits(userId)
      if (synced.length) setHabits((current) => current.map((habit) => {
        const match = synced.find((item) => item.pending.clientId === habit.pendingId)
        return match ? { ...match.saved, completed: false } : habit
      }))
    }
    window.addEventListener('online', syncQueuedHabits)
    if (navigator.onLine) void syncQueuedHabits()
    return () => window.removeEventListener('online', syncQueuedHabits)
  }, [userId])

  async function addHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const name = newHabit.trim(); if (!supabase || !name) return
    setSaving(true); setError('')
    if (!navigator.onLine) {
      const pending = queueHabit(userId, name)
      setHabits((current) => [...current, { id: -Date.now(), name, color: '#e58b54', created_at: pending.createdAt, completed: false, pendingId: pending.clientId }])
      setNewHabit(''); setSaving(false); return
    }
    const { data, error: queryError } = await supabase.from('habits').insert({ name, user_id: userId }).select('id, name, color, created_at').single()
    if (queryError) setError(queryError.message); else if (data) { setHabits((current) => [...current, { ...data, completed: false }]); setNewHabit('') }
    setSaving(false)
  }

  async function updateHabit(habit: Habit, name: string) {
    if (!supabase || !name.trim()) return
    setSaving(true); setError('')
    const { data, error: queryError } = await supabase.from('habits').update({ name: name.trim() }).eq('id', habit.id).eq('user_id', userId).select('id, name, color, created_at').single()
    if (queryError) setError(queryError.message); else if (data) { setHabits((current) => current.map((item) => item.id === habit.id ? { ...data, completed: habit.completed } : item)); setEditingId(null) }
    setSaving(false)
  }

  async function deleteHabit(habit: Habit) {
    if (!supabase) return
    setSaving(true); setError('')
    const { error: queryError } = await supabase.from('habits').delete().eq('id', habit.id).eq('user_id', userId)
    if (queryError) setError(queryError.message); else setHabits((current) => current.filter((item) => item.id !== habit.id))
    setSaving(false)
  }

  async function toggleHabit(habit: Habit) {
    if (!supabase) return
    setSaving(true); setError('')
    const loggedOn = new Date().toISOString().slice(0, 10)
    const { error: queryError } = await supabase.from('daily_logs').upsert({ habit_id: habit.id, user_id: userId, logged_on: loggedOn, completed: !habit.completed }, { onConflict: 'habit_id,logged_on' })
    if (queryError) setError(queryError.message)
    else setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, completed: !item.completed } : item))
    setSaving(false)
  }

  async function signOut() { await supabase?.auth.signOut() }

  async function shareHabits() {
    const text = `Daymark: ${habits.length} active habit${habits.length === 1 ? '' : 's'}.`
    try {
      if (navigator.share) { await navigator.share({ title: 'Daymark', text, url: window.location.origin }); return }
      if (navigator.clipboard) await navigator.clipboard.writeText(`${text} ${window.location.origin}`)
      else {
        const fallback = document.createElement('textarea')
        fallback.value = `${text} ${window.location.origin}`; document.body.appendChild(fallback); fallback.select(); document.execCommand('copy'); fallback.remove()
      }
      setShareStatus('Copied to clipboard')
    } catch (shareError) {
      // Closing the native share sheet rejects with AbortError; that is not a failure worth reporting
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return
      setShareStatus('Unable to share right now')
    }
    window.setTimeout(() => setShareStatus(''), 2500)
  }

  return <main className="tracker-shell">
    <ErrorBoundary section="Navigation"><header className="topbar"><div className="brand"><span className="mark">D</span><span>daymark</span></div><button className="text-button" onClick={signOut}>Sign out</button></header></ErrorBoundary>
    <ErrorBoundary section="Stats"><section className="tracker-intro"><div><p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>Your everyday,<br /><em>made tangible.</em></h1></div><div className="stats-side"><div className="streak"><strong>{habits.length}</strong><span>active<br />rhythms</span></div><AvatarUploader userId={userId} /></div></section></ErrorBoundary>
    <ErrorBoundary section="Habit list"><section className="habit-section"><div className="section-heading"><div><p className="eyebrow">Your habits</p><h2>Keep showing up.</h2></div><span className="habit-count">{habits.length.toString().padStart(2, '0')}</span></div>
      <form className="add-form" onSubmit={addHabit}><input aria-label="New habit" placeholder="What will you practice?" value={newHabit} onChange={(event) => setNewHabit(event.target.value)} /><button className="primary-button" disabled={saving || !newHabit.trim()} type="submit">Add habit <span>+</span></button></form>
      {error && <p className="notice error">{error}</p>}
      {loading ? <p className="empty-state">Gathering your rhythms...</p> : habits.length === 0 ? <div className="empty-state"><span className="empty-mark">○</span><p>No habits yet. Start with one small promise.</p></div> : <div className="habit-list">{habits.map((habit, index) => <article className={`habit-row ${habit.completed ? 'completed' : ''} ${habit.pendingId ? 'queued' : ''}`} key={habit.pendingId ?? habit.id}><button className="complete-button" disabled={saving || !!habit.pendingId} onClick={() => void toggleHabit(habit)} type="button" aria-label={`${habit.completed ? 'Uncomplete' : 'Complete'} ${habit.name}`}>{habit.completed ? '✓' : ''}</button><span className="habit-number">0{index + 1}</span><span className="habit-dot" style={{ backgroundColor: habit.color }}></span>{editingId === habit.id ? <input className="edit-input" autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void updateHabit(habit, editingName); if (event.key === 'Escape') setEditingId(null) }} /> : <span className="habit-name">{habit.name}{habit.pendingId && <span className="queued-badge">Queued · syncs when online</span>}</span>}<div className="habit-actions">{editingId === habit.id ? <button className="icon-button" disabled={saving} onClick={() => void updateHabit(habit, editingName)} type="button" aria-label="Save habit">✓</button> : <button className="icon-button" disabled={!!habit.pendingId} onClick={() => { setEditingId(habit.id); setEditingName(habit.name) }} type="button" aria-label={`Edit ${habit.name}`}>✎</button>}<button className="icon-button danger-button" disabled={saving || !!habit.pendingId} onClick={() => void deleteHabit(habit)} type="button" aria-label={`Delete ${habit.name}`}>×</button></div></article>)}</div>}
    </section></ErrorBoundary>
    <footer className="footer-note"><span>Your data belongs to you · {session.user.email}</span><span className="share-group"><span className="share-status" role="status">{shareStatus}</span><button className="share-button" type="button" onClick={() => void shareHabits()}>Share</button></span></footer>
  </main>
}

