import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'
import './App.css'

type Habit = { id: number; name: string; color: string; created_at: string; completed: boolean }

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (authLoading) return <div className="loading-screen">Loading your space...</div>
  return <BrowserRouter><Routes>
    <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
    <Route path="/" element={<ProtectedRoute session={session}>{session && <Tracker session={session} />}</ProtectedRoute>} />
    <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
  </Routes></BrowserRouter>
}

function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return session ? <>{children}</> : <Navigate to="/login" replace />
}

function AuthPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setLoading(true); setError(''); setMessage('')
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (result.error) setError(result.error.message)
    else if (mode === 'sign-up' && !result.data.session) setMessage('Check your email to confirm your account.')
    setLoading(false)
  }

  return <main className="auth-layout">
    <section className="auth-intro"><p className="eyebrow">DAYMARK / PERSONAL RHYTHMS</p><h1>Small promises,<br /><em>kept visible.</em></h1><p className="intro-copy">A quiet place to notice the habits that make your days feel like yours.</p></section>
    <section className="auth-panel" aria-label="Account access">
      <div className="panel-heading"><span className="mark">D</span><span>Welcome back</span></div>
      {!isSupabaseConfigured && <p className="notice error">Add your Supabase values to `.env` to connect this app.</p>}
      <div className="mode-tabs"><button className={mode === 'sign-in' ? 'active' : ''} onClick={() => setMode('sign-in')} type="button">Sign in</button><button className={mode === 'sign-up' ? 'active' : ''} onClick={() => setMode('sign-up')} type="button">Create account</button></div>
      <form onSubmit={handleSubmit}><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="notice error">{error}</p>}{message && <p className="notice success">{message}</p>}<button className="primary-button" disabled={loading || !isSupabaseConfigured} type="submit">{loading ? 'Working...' : mode === 'sign-in' ? 'Enter your day' : 'Start tracking'}</button></form>
    </section>
  </main>
}

function Tracker({ session }: { session: Session }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabit, setNewHabit] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
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
          setHabits((data ?? []).map((habit) => ({ ...habit, completed: completedIds.has(habit.id) })))
        }
        setLoading(false)
      }
    }
    void loadHabits()
    return () => { active = false }
  }, [userId])

  async function addHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const name = newHabit.trim(); if (!supabase || !name) return
    setSaving(true); setError('')
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

  async function signOut() { await supabase?.auth.signOut(); navigate('/login') }

  return <main className="tracker-shell">
    <header className="topbar"><div className="brand"><span className="mark">D</span><span>daymark</span></div><button className="text-button" onClick={signOut}>Sign out</button></header>
    <section className="tracker-intro"><div><p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>Your everyday,<br /><em>made tangible.</em></h1></div><div className="streak"><strong>{habits.length}</strong><span>active<br />rhythms</span></div></section>
    <section className="habit-section"><div className="section-heading"><div><p className="eyebrow">Your habits</p><h2>Keep showing up.</h2></div><span className="habit-count">{habits.length.toString().padStart(2, '0')}</span></div>
      <form className="add-form" onSubmit={addHabit}><input aria-label="New habit" placeholder="What will you practice?" value={newHabit} onChange={(event) => setNewHabit(event.target.value)} /><button className="primary-button" disabled={saving || !newHabit.trim()} type="submit">Add habit <span>+</span></button></form>
      {error && <p className="notice error">{error}</p>}
      {loading ? <p className="empty-state">Gathering your rhythms...</p> : habits.length === 0 ? <div className="empty-state"><span className="empty-mark">○</span><p>No habits yet. Start with one small promise.</p></div> : <div className="habit-list">{habits.map((habit, index) => <article className={`habit-row ${habit.completed ? 'completed' : ''}`} key={habit.id}><button className="complete-button" disabled={saving} onClick={() => void toggleHabit(habit)} type="button" aria-label={`${habit.completed ? 'Uncomplete' : 'Complete'} ${habit.name}`}>{habit.completed ? '✓' : ''}</button><span className="habit-number">0{index + 1}</span><span className="habit-dot" style={{ backgroundColor: habit.color }}></span>{editingId === habit.id ? <input className="edit-input" autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void updateHabit(habit, editingName); if (event.key === 'Escape') setEditingId(null) }} /> : <span className="habit-name">{habit.name}</span>}<div className="habit-actions">{editingId === habit.id ? <button className="icon-button" disabled={saving} onClick={() => void updateHabit(habit, editingName)} type="button" aria-label="Save habit">✓</button> : <button className="icon-button" onClick={() => { setEditingId(habit.id); setEditingName(habit.name) }} type="button" aria-label={`Edit ${habit.name}`}>✎</button>}<button className="icon-button danger-button" disabled={saving} onClick={() => void deleteHabit(habit)} type="button" aria-label={`Delete ${habit.name}`}>×</button></div></article>)}</div>}
    </section>
    <footer className="footer-note">Your data belongs to you · {session.user.email}</footer>
  </main>
}

export default App