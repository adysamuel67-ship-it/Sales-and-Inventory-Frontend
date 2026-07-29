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
import Button from '@/components/ui/Button'
import AlertBadge from '@/components/ui/AlertBadge'

const OTP_LENGTH = 7

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''))
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendTimer, setResendTimer] = useState(120)
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

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await authAPI.forgotPassword(email.trim())
      setSuccess('Verification code sent to your email')
      setResendTimer(120)
      setCanResend(false)
      setStep('otp')
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }

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

  const handleReset = async () => {
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete code')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain an uppercase letter')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain a digit')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authAPI.verifyForgotPassword({ email: email.trim(), otp: code, password })
      setStep('success')
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
    setCanResend(false)
    setResendTimer(120)
    setError('')
    setSuccess('')
    try {
      await authAPI.forgotPassword(email.trim())
      setSuccess('Verification code resent!')
    } catch (err: any) {
      setError(parseApiError(err))
    }
  }

  if (step === 'success') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
            </View>
            <Text style={styles.title}>Password Reset Successful</Text>
            <Text style={styles.subtitle}>
              Your password has been reset. You can now sign in with your new password.
            </Text>
          </View>
          <Button title="Go to Login" onPress={() => router.replace('/(auth)/login')} size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  if (step === 'otp') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('email')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.subtitle}>
              Enter the code sent to{'\n'}
              <Text style={{ fontWeight: '600', color: Colors.text }}>{email}</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Min 8 chars, 1 uppercase, 1 digit"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          <Button title="Reset Password" onPress={handleReset} loading={loading} disabled={loading} size="lg" />

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
        {success ? <AlertBadge message={success} type="success" /> : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <Button
            title="Send Reset Code"
            onPress={handleSendCode}
            loading={loading}
            disabled={loading}
            size="lg"
          />
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
  form: {},
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 13, fontSize: 16, color: Colors.text },
  eyeBtn: { padding: 8 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  otpInput: {
    width: 42, height: 52, borderWidth: 2, borderColor: Colors.border, borderRadius: BORDER_RADIUS.lg,
    textAlign: 'center', fontSize: 20, fontWeight: '700', color: Colors.text,
    backgroundColor: Colors.surface,
  },
  otpFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  resendRow: { alignItems: 'center', marginTop: 20 },
  resendLink: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  timerText: { fontSize: 14, color: Colors.textLight },
})
