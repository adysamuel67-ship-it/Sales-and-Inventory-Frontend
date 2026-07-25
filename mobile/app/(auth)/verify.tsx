import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { authAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import AlertBadge from '@/components/ui/AlertBadge'

const OTP_LENGTH = 6

export default function VerifyScreen() {
  const router = useRouter()
  const { pendingVerificationEmail, fetchProfile, fetchBusinesses } = useAuth()
  const email = pendingVerificationEmail || ''
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendTimer, setResendTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputs = useRef<(any | null)[]>([])

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(t)
    } else {
      setCanResend(true)
    }
  }, [resendTimer])

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) text = text.slice(-1)
    const newOtp = [...otp]
    newOtp[index] = text
    setOtp(newOtp)
    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code')
      return
    }
    if (!email) {
      setError('No email to verify. Please sign up again.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authAPI.verifyEmail({ email, code })
      setSuccess('Email verified successfully!')
      await fetchProfile()
      await fetchBusinesses()
      router.replace('/(tabs)/dashboard')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 400 || status === 422) setError('Invalid verification code')
      else if (status === 500) setError('Server error. Please try again later.')
      else setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setCanResend(false)
    setResendTimer(60)
    try {
      await authAPI.sendVerification(email)
      setSuccess('Verification code resent!')
    } catch (err: any) {
      setError(parseApiError(err))
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
            <Ionicons name="mail-open-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to{'\n'}
            <Text style={{ fontWeight: '600', color: Colors.text }}>{email || 'your email'}</Text>
          </Text>
        </View>

        {error ? <AlertBadge message={error} type="error" /> : null}
        {success ? <AlertBadge message={success} type="success" /> : null}

        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref: any) => { inputs.current[index] = ref }}
              style={[styles.otpInput, digit ? styles.otpFilled : null]}
              value={digit}
              onChangeText={(t: string) => handleOtpChange(t, index)}
              onKeyPress={({ nativeEvent }: any) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <Button title="Verify Email" onPress={handleVerify} loading={loading} disabled={loading} size="lg" />

        <View style={styles.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>Resend code in {resendTimer}s</Text>
          )}
        </View>
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
  subtitle: { fontSize: 15, color: Colors.textLight, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },
  otpInput: {
    width: 48, height: 56, borderWidth: 2, borderColor: Colors.border, borderRadius: BORDER_RADIUS.lg,
    textAlign: 'center', fontSize: 22, fontWeight: '700', color: Colors.text,
    backgroundColor: Colors.surface,
  },
  otpFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  resendRow: { alignItems: 'center', marginTop: 20 },
  resendLink: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  timerText: { fontSize: 14, color: Colors.textLight },
})
