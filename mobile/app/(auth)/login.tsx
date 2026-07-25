import React, { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { authAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import { Colors } from '@/lib/constants'
import Button from '@/components/ui/Button'
import AlertBadge from '@/components/ui/AlertBadge'

export default function LoginScreen() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authAPI.login({ email: email.trim(), password })
      const data = res.data
      const accessToken = data.access_token || data.token
      const refreshToken = data.refresh_token
      if (!accessToken) throw new Error('No token received')

      const { profileAPI, businessAPI } = await import('@/lib/api')
      const profileRes = await profileAPI.getMyProfile()
      const userData = profileRes.data

      const userObj = {
        id: userData.user_id ?? userData.id,
        name: userData.name || userData.full_name || email.split('@')[0],
        email: userData.email || email,
        phone: userData.phone || '',
        role: userData.role || 'user',
        is_verified: userData.is_verified ?? true,
        is_active: userData.is_active ?? true,
        business_id: userData.business_id || userData.business?.id || undefined,
      }
      await login(accessToken, userObj, refreshToken)
      setSuccess('Login successful!')

      const bizRes = await businessAPI.myBusinesses()
      const bizData = Array.isArray(bizRes.data) ? bizRes.data : []
      if (bizData.length > 0) {
        router.replace('/(tabs)/dashboard')
      } else {
        router.replace('/(tabs)/more')
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        setError('Invalid email or password')
      } else if (status === 422) {
        setError('Invalid input. Please check your credentials.')
      } else if (status === 500) {
        setError('Server error. Please try again later.')
      } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('Network')) {
        setError('Network error. Please check your connection.')
      } else {
        setError(parseApiError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="briefcase" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to manage your business</Text>
        </View>

        {error ? <AlertBadge message={error} type="error" /> : null}
        {success ? <AlertBadge message={success} type="success" /> : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={Colors.textLight}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <Ionicons
                name={rememberMe ? 'checkbox' : 'square-outline'}
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </TouchableOpacity>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity>
                <Text style={styles.forgotLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            size="lg"
          />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 72, height: 72, borderRadius: 18, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textLight, marginTop: 6 },
  form: { gap: 4 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: Colors.text,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { padding: 10 },
  optionsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, marginTop: 4,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkboxLabel: { fontSize: 14, color: Colors.text },
  forgotLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signupText: { fontSize: 14, color: Colors.textLight },
  signupLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
})
