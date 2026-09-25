import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useHabits } from '../lib/habitsContext'

export default function AddHabitScreen() {
  const { addHabit, error } = useHabits()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const saved = await addHabit(name)
    setSaving(false)
    if (saved) router.back()
  }

  return <View className="flex-1 bg-canvas px-5 pt-8">
    <Text className="mb-2 text-xs uppercase tracking-widest text-muted">New habit</Text>
    <TextInput autoFocus className="mb-4 border border-line p-4 text-base text-ink" placeholder="What will you practice?" placeholderTextColor="#65716b" value={name} onChangeText={setName} onSubmitEditing={() => void submit()} returnKeyType="done" />
    {!!error && <Text className="mb-4 bg-[#f7e9e4] p-3 text-sm text-[#934b3d]">{error}</Text>}
    <Pressable disabled={saving || !name.trim()} onPress={() => void submit()} className={`items-center bg-green p-4 ${saving || !name.trim() ? 'opacity-50' : ''}`}>
      <Text className="font-semibold text-white">{saving ? 'Saving...' : 'Add habit'}</Text>
    </Pressable>
  </View>
}
