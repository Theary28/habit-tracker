import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    if (!supabase) return
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  return <View className="flex-1 justify-center bg-canvas px-6">
    <Text className="mb-4 text-xs uppercase tracking-widest text-orange">Daymark / personal rhythms</Text>
    <Text className="mb-10 text-5xl font-semibold text-ink">Small promises, kept visible.</Text>
    <View className="bg-paper p-6">
      {!isSupabaseConfigured && <Text className="mb-4 bg-[#f7e9e4] p-3 text-sm text-[#934b3d]">Add your Supabase values to mobile/.env to connect this app.</Text>}
      <Text className="mb-2 text-xs uppercase text-muted">Email</Text>
      <TextInput className="mb-4 border border-line p-3 text-ink" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Text className="mb-2 text-xs uppercase text-muted">Password</Text>
      <TextInput className="mb-4 border border-line p-3 text-ink" secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={() => void signIn()} />
      {!!error && <Text className="mb-4 bg-[#f7e9e4] p-3 text-sm text-[#934b3d]">{error}</Text>}
      <Pressable disabled={loading || !isSupabaseConfigured} onPress={() => void signIn()} className={`items-center bg-green p-4 ${loading ? 'opacity-50' : ''}`}>
        <Text className="font-semibold text-white">{loading ? 'Working...' : 'Enter your day'}</Text>
      </Pressable>
    </View>
  </View>
}
