import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type Habit = { id: number; name: string; color: string; created_at: string; completed: boolean }

export type HabitsContextValue = {
  session: Session | null
  authLoading: boolean
  habits: Habit[]
  loading: boolean
  error: string
  addHabit: (name: string) => Promise<boolean>
  toggleHabit: (habit: Habit) => Promise<void>
  refresh: () => Promise<void>
}

export const HabitsContext = createContext<HabitsContextValue | null>(null)

export function useHabits() {
  const value = useContext(HabitsContext)
  if (!value) throw new Error('useHabits must be used inside HabitsProvider')
  return value
}
