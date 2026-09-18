import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter'
import { AuthProvider } from '@/lib/auth'
import { Colors } from '@/lib/constants'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Slot />
    </AuthProvider>
  )
}