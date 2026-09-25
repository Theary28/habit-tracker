import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { HabitsContext } from './habitsContext'
import type { Habit } from './habitsContext'
import { supabase } from './supabase'

const today = () => new Date().toISOString().slice(0, 10)

// Same queries as the web Tracker
async function fetchHabits(userId: string): Promise<{ habits: Habit[]; error: string }> {
  if (!supabase) return { habits: [], error: '' }
  const [{ data, error: queryError }, { data: logs, error: logsError }] = await Promise.all([
    supabase.from('habits').select('id, name, color, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('daily_logs').select('habit_id, completed').eq('user_id', userId).eq('logged_on', today()),
  ])
  if (queryError || logsError) return { habits: [], error: (queryError ?? logsError)?.message ?? 'Unable to load your habits.' }
  const completedIds = new Set((logs ?? []).filter((log) => log.completed).map((log) => log.habit_id))
  return { habits: (data ?? []).map((habit) => ({ ...habit, completed: completedIds.has(habit.id) })), error: '' }
}

// Lifted into a provider so the List and Add screens share one copy of the habits
export function HabitsProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [habits, setHabits] = useState<Habit[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const userId = session?.user.id ?? null
  const loading = refreshing || (userId !== null && loadedFor !== userId)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) { setHabits([]); setLoadedFor(null) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true
    void fetchHabits(userId).then((result) => {
      if (!active) return
      setHabits(result.habits); setError(result.error); setLoadedFor(userId)
    })
    return () => { active = false }
  }, [userId])

  const refresh = useCallback(async () => {
    if (!userId) return
    setRefreshing(true)
    const result = await fetchHabits(userId)
    setHabits(result.habits); setError(result.error); setRefreshing(false)
  }, [userId])

  async function addHabit(name: string) {
    if (!supabase || !userId || !name.trim()) return false
    setError('')
    const { data, error: queryError } = await supabase.from('habits').insert({ name: name.trim(), user_id: userId }).select('id, name, color, created_at').single()
    if (queryError) { setError(queryError.message); return false }
    setHabits((current) => [...current, { ...data, completed: false }])
    return true
  }

  async function toggleHabit(habit: Habit) {
    if (!supabase || !userId) return
    setError('')
    const { error: queryError } = await supabase.from('daily_logs').upsert({ habit_id: habit.id, user_id: userId, logged_on: today(), completed: !habit.completed }, { onConflict: 'habit_id,logged_on' })
    if (queryError) setError(queryError.message)
    else setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, completed: !item.completed } : item))
  }

  return <HabitsContext.Provider value={{ session, authLoading, habits, loading, error, addHabit, toggleHabit, refresh }}>{children}</HabitsContext.Provider>
}
