import React, { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native'
import { useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { authAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import BusinessBotLogo from '@/components/BusinessBotLogo'
import AlertBadge from '@/components/ui/AlertBadge'
import GradientHero from '@/components/ui/GradientHero'

const { width } = Dimensions.get('window')

const benefits = [
  { icon: 'time-outline' as const, color: '#2563EB', bg: '#EFF6FF', title: 'Save 10+ Hours/Week', desc: 'Automate manual tracking and focus on growth' },
  { icon: 'trending-up-outline' as const, color: '#059669', bg: '#ECFDF5', title: 'Boost Revenue 30%', desc: 'Data-driven decisions with real-time analytics' },
  { icon: 'shield-checkmark-outline' as const, color: '#7C3AED', bg: '#F5F3FF', title: 'Zero Data Loss', desc: 'Cloud backup with bank-level encryption' },
  { icon: 'people-outline' as const, color: '#D97706', bg: '#FEF3C7', title: 'Team Collaboration', desc: 'Role-based access for your entire team' },
]

const howItWorks = [
  { step: '1', title: 'Create Account', desc: 'Sign up in 30 seconds' },
  { step: '2', title: 'Add Products', desc: 'Import or add your inventory' },
  { step: '3', title: 'Track Sales', desc: 'Record and monitor every transaction' },
  { step: '4', title: 'Grow Business', desc: 'Get insights and make smarter decisions' },
]

export default function SignupScreen() {
  const router = useRouter()
  const { setPendingVerification } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter'
    if (!/[0-9]/.test(pw)) return 'Password must contain a digit'
    return null
  }

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields')
      return
    }
    const pwError = validatePassword(password)
    if (pwError) { setError(pwError); return }

    setLoading(true)
    setError('')
    try {
      await authAPI.signUp({ name: name.trim(), email: email.trim(), password, phone: phone.trim() })
      setPendingVerification(email.trim())
      router.replace('/(auth)/verify')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 422) setError('Email already registered or invalid input')
      else if (status === 500) setError('Server error. Please try again later.')
      else setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <GradientHero height={250} topInset={72} bubbles>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <View style={styles.logoContainer}>
              <BusinessBotLogo size={48} />
            </View>
            <Text style={styles.heroTitle}>Start Free Today</Text>
            <Text style={styles.heroTagline}>Join 2,500+ businesses already{'\n'}growing with BusinessBot</Text>
          </View>

          {/* Social proof avatars */}
          <View style={styles.socialProof}>
            <View style={styles.avatarStack}>
              {['K', 'A', 'M', 'E'].map((l, i) => (
                <View key={i} style={[styles.miniAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i, backgroundColor: ['#2563EB', '#059669', '#7C3AED', '#D97706'][i] }]}>
                  <Text style={styles.miniAvatarText}>{l}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.socialProofText}>Trusted by business owners across Ghana</Text>
          </View>
        </GradientHero>

        {/* ── Benefits ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why You'll Love It</Text>
          <Text style={styles.sectionSubtitle}>Real results from real business owners</Text>
          {benefits.map((b, i) => (
            <View key={i} style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: b.bg }]}>
                <Ionicons name={b.icon} size={22} color={b.color} />
              </View>
              <View style={styles.benefitTextBlock}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          ))}
        </View>

        {/* ── How It Works ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.sectionSubtitle}>Up and running in under 2 minutes</Text>
          <View style={styles.stepsRow}>
            {howItWorks.map((s, i) => (
              <View key={i} style={styles.stepItem}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>{s.step}</Text>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
                {i < howItWorks.length - 1 && (
                  <View style={styles.stepConnector} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── Signup Form ── */}
        <View style={styles.formSection}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Create Your Account</Text>
            <Text style={styles.formSubtitle}>14-day free trial, no credit card required</Text>
          </View>

          {error ? <AlertBadge message={error} type="error" /> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone number (optional)"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Min 8 characters, 1 uppercase, 1 digit"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <PasswordHints password={password} />
          </View>

          <TouchableOpacity
            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.signupContent}>
              <Text style={styles.signupText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* ── Trust Bar ── */}
        <View style={styles.trustBar}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
            <Text style={styles.trustText}>256-bit Encryption</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="card-outline" size={16} color={Colors.primary} />
            <Text style={styles.trustText}>No Credit Card</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="close-circle-outline" size={16} color={Colors.purple} />
            <Text style={styles.trustText}>Cancel Anytime</Text>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function PasswordHints({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One digit', met: /[0-9]/.test(password) },
  ]
  return (
    <View style={hintStyles.container}>
      {checks.map((c) => (
        <View key={c.label} style={hintStyles.row}>
          <Ionicons name={c.met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={c.met ? Colors.success : Colors.textLight} />
          <Text style={[hintStyles.text, c.met && hintStyles.met]}>{c.label}</Text>
        </View>
      ))}
    </View>
  )
}

const hintStyles = StyleSheet.create({
  container: { marginTop: 8, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 12, color: Colors.textLight },
  met: { color: Colors.success },
})

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  /* ── Hero ── */
  backBtn: {
    position: 'absolute', left: 20, top: 8,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  heroContent: { alignItems: 'center', position: 'relative', zIndex: 1, paddingTop: 8, paddingHorizontal: 24 },
  logoContainer: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroTagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)',
    marginTop: 6, textAlign: 'center', lineHeight: 21,
  },
  socialProof: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 20, justifyContent: 'center',
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  socialProofText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  /* ── Sections ── */
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: Colors.text, marginBottom: 3 },
  sectionSubtitle: { fontSize: 13, color: Colors.textLight, marginBottom: 14 },

  /* ── Benefits ── */
  benefitCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.xl,
    padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  benefitIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitTextBlock: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  benefitDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  /* ── How It Works ── */
  stepsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  stepNumber: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  stepTitle: { fontSize: 11, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  stepDesc: { fontSize: 10, color: Colors.textLight, textAlign: 'center', marginTop: 2 },
  stepConnector: {
    position: 'absolute', top: 16, right: -8,
    width: 16, height: 2, backgroundColor: Colors.border,
  },

  /* ── Form ── */
  formSection: {
    marginHorizontal: 20, marginTop: 24,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.xxl,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  formHeader: { marginBottom: 18 },
  formTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  formSubtitle: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: Colors.text },
  eyeBtn: { padding: 8 },
  signupButton: {
    backgroundColor: Colors.primary, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  signupButtonDisabled: { backgroundColor: '#93B4F5' },
  signupContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signupText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  loginRow: {
    flexDirection: 'row', justifyContent: 'center', marginTop: 18,
  },
  loginText: { fontSize: 14, color: Colors.textLight },
  loginLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  /* ── Trust Bar ── */
  trustBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    marginTop: 24, paddingHorizontal: 20,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 11, fontWeight: '600', color: Colors.textLight },
})
