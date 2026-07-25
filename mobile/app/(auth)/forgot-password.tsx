import React, { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { authAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import Button from '@/components/ui/Button'
import AlertBadge from '@/components/ui/AlertBadge'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authAPI.sendVerification(email.trim())
      setSent(true)
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>Enter your email and we'll send you a reset code</Text>
        </View>

        {error ? <AlertBadge message={error} type="error" /> : null}

        {sent ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
            <Text style={styles.successTitle}>Code Sent!</Text>
            <Text style={styles.successMessage}>
              We've sent a verification code to {email}. Please check your inbox and use the code to reset your password.
            </Text>
            <Button
              title="Go to Login"
              onPress={() => router.replace('/(auth)/login')}
              size="lg"
              style={{ marginTop: 20 }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <Button
              title="Send Reset Code"
              onPress={handleSend}
              loading={loading}
              disabled={loading}
              size="lg"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, backgroundColor: Colors.background, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  backBtn: { position: 'absolute', left: 0, top: 0 },
  iconContainer: {
    width: 80, height: 80, borderRadius: BORDER_RADIUS.xxl, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textLight, marginTop: 8, textAlign: 'center' },
  form: {},
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: Colors.text,
  },
  successBox: { alignItems: 'center', padding: 20 },
  successTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 12 },
  successMessage: { fontSize: 14, color: Colors.textLight, marginTop: 8, textAlign: 'center', lineHeight: 22 },
})
