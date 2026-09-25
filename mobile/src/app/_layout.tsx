import '../../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { HabitsProvider } from '../lib/habits'
import { useHabits } from '../lib/habitsContext'

function RootStack() {
  const { session, authLoading } = useHabits()
  if (authLoading) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color="#315b4d" /></View>

  return <Stack screenOptions={{ headerStyle: { backgroundColor: '#f3f0e8' }, headerTintColor: '#24312e', headerShadowVisible: false, contentStyle: { backgroundColor: '#f3f0e8' } }}>
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="index" options={{ title: 'daymark' }} />
      <Stack.Screen name="add" options={{ title: 'New habit', presentation: 'modal' }} />
    </Stack.Protected>
    <Stack.Protected guard={!session}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack.Protected>
  </Stack>
}

export default function RootLayout() {
  return <HabitsProvider>
    <StatusBar style="dark" />
    <RootStack />
  </HabitsProvider>
}
