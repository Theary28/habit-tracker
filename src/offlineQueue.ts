import { supabase } from './lib/supabase.js'

export type PendingHabit = { clientId: string; userId: string; name: string; createdAt: string }

const storageKey = (userId: string) => `daymark:pending-habits:${userId}`

export function getPendingHabits(userId: string): PendingHabit[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as PendingHabit[]
  } catch {
    return []
  }
}

export function queueHabit(userId: string, name: string): PendingHabit {
  const habit = { clientId: crypto.randomUUID(), userId, name, createdAt: new Date().toISOString() }
  localStorage.setItem(storageKey(userId), JSON.stringify([...getPendingHabits(userId), habit]))
  return habit
}

function removePendingHabit(habit: PendingHabit) {
  localStorage.setItem(storageKey(habit.userId), JSON.stringify(getPendingHabits(habit.userId).filter((item) => item.clientId !== habit.clientId)))
}

export async function flushPendingHabits(userId: string) {
  if (!supabase) return []
  const synced: { pending: PendingHabit; saved: { id: number; name: string; color: string; created_at: string } }[] = []
  for (const pending of getPendingHabits(userId)) {
    const { data, error } = await supabase.from('habits').insert({ name: pending.name, user_id: userId }).select('id, name, color, created_at').single()
    if (error || !data) break
    removePendingHabit(pending)
    synced.push({ pending, saved: data })
  }
  return synced
}