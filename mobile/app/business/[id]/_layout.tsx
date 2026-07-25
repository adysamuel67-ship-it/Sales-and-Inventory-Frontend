import { Stack } from 'expo-router'

export default function BusinessLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="sales" />
      <Stack.Screen name="products" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="debts" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="requests" />
    </Stack>
  )
}
