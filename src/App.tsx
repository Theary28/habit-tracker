import { lazy, Suspense, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'
import { OfflineBanner, UpdateToast } from './pwa.js'
import './App.css'

// Tracker carries the CRUD, avatar upload, and offline sync code; signed-out visitors never download it
const Tracker = lazy(() => import('./Tracker.tsx'))

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [offline, setOffline] = useState(() => !navigator.onLine)

  useEffect(() => {
    const setOnline = () => setOffline(false)
    const setOfflineState = () => setOffline(true)
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOfflineState)
    return () => { window.removeEventListener('online', setOnline); window.removeEventListener('offline', setOfflineState) }
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  // The session alone decides the screen, so the URL just mirrors it
  useEffect(() => {
    if (authLoading) return
    const path = session ? '/' : '/login'
    if (window.location.pathname !== path) window.history.replaceState(null, '', path)
  }, [authLoading, session])

  if (authLoading) return <div className="loading-screen">Loading your space...</div>
  return <><OfflineBanner offline={offline} /><UpdateToast />
    {session ? <Suspense fallback={<div className="loading-screen">Loading your habits...</div>}><Tracker session={session} /></Suspense> : <AuthPage />}
  </>
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

export default App
