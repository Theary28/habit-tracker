import { Link } from 'expo-router'
import { FlatList, Pressable, Text, View } from 'react-native'
import { useHabits } from '../lib/habitsContext'
import type { Habit } from '../lib/habitsContext'
import { shareText } from '../lib/share'
import { supabase } from '../lib/supabase'

function HabitRow({ habit, index, onToggle }: { habit: Habit; index: number; onToggle: () => void }) {
  return <View className={`flex-row items-center gap-3 border-b border-line py-4 ${habit.completed ? 'opacity-60' : ''}`}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: habit.completed }} accessibilityLabel={`${habit.completed ? 'Uncomplete' : 'Complete'} ${habit.name}`} onPress={onToggle} className={`h-7 w-7 items-center justify-center rounded-full border ${habit.completed ? 'border-green bg-green' : 'border-line'}`}>
      {habit.completed && <Text className="text-paper">✓</Text>}
    </Pressable>
    <Text className="text-xs text-muted">{String(index + 1).padStart(2, '0')}</Text>
    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: habit.color }} />
    <Text className={`flex-1 text-base text-ink ${habit.completed ? 'line-through' : ''}`}>{habit.name}</Text>
  </View>
}

export default function HabitListScreen() {
  const { session, habits, loading, error, toggleHabit, refresh } = useHabits()

  async function share() {
    await shareText(`Daymark: ${habits.length} active habit${habits.length === 1 ? '' : 's'}.`)
  }

  return <FlatList
    className="flex-1 bg-canvas"
    contentContainerClassName="px-5 pb-10"
    data={habits}
    keyExtractor={(habit) => String(habit.id)}
    renderItem={({ item, index }) => <HabitRow habit={item} index={index} onToggle={() => void toggleHabit(item)} />}
    refreshing={loading}
    onRefresh={() => void refresh()}
    ListHeaderComponent={<View className="pb-4 pt-6">
      <Text className="mb-3 text-xs uppercase tracking-widest text-orange">Your habits</Text>
      <Text className="mb-6 text-4xl font-semibold text-ink">Keep showing up.</Text>
      <Link href="/add" asChild><Pressable className="items-center bg-green px-4 py-4"><Text className="font-semibold text-white">Add habit  +</Text></Pressable></Link>
      {!!error && <Text className="mt-4 bg-[#f7e9e4] p-3 text-sm text-[#934b3d]">{error}</Text>}
    </View>}
    ListEmptyComponent={loading ? null : <View className="items-center py-12"><Text className="mb-2 text-3xl text-line">○</Text><Text className="text-muted">No habits yet. Start with one small promise.</Text></View>}
    ListFooterComponent={<View className="mt-8 flex-row items-center justify-between">
      <Text className="flex-1 text-xs text-muted" numberOfLines={1}>{session?.user.email}</Text>
      <Pressable onPress={() => void share()} className="border border-green px-4 py-2"><Text className="text-green">Share</Text></Pressable>
      <Pressable onPress={() => void supabase?.auth.signOut()} className="ml-3 py-2"><Text className="text-muted">Sign out</Text></Pressable>
    </View>}
  />
}
