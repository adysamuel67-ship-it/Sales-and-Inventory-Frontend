import React, { useState, useRef } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/lib/auth'
import { authAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import BusinessBotLogo from '@/components/BusinessBotLogo'
import AlertBadge from '@/components/ui/AlertBadge'
import GradientHero from '@/components/ui/GradientHero'

const { width } = Dimensions.get('window')

const features = [
  { icon: 'bar-chart' as const, color: '#2563EB', bg: '#EFF6FF', title: 'Sales Tracking', desc: 'Real-time sales monitoring' },
  { icon: 'cube' as const, color: '#059669', bg: '#ECFDF5', title: 'Inventory', desc: 'Smart stock management' },
  { icon: 'people' as const, color: '#7C3AED', bg: '#F5F3FF', title: 'Team Control', desc: 'Multi-user roles & access' },
  { icon: 'trending-up' as const, color: '#D97706', bg: '#FEF3C7', title: 'Analytics', desc: 'AI-powered insights' },
]

const testimonials = [
  { name: 'Kwame A.', role: 'Retail Owner', text: 'BusinessBot transformed how I track sales. I know my numbers every single day.', rating: 5 },
  { name: 'Ama D.', role: 'Pharmacy Manager', text: 'Low-stock alerts alone saved me thousands. The best investment for my business.', rating: 5 },
  { name: 'Kofi M.', role: 'Restaurant Owner', text: 'Managing my team and inventory from one app? Game changer.', rating: 5 },
]

const stats = [
  { value: '2,500+', label: 'Businesses' },
  { value: '50K+', label: 'Sales Tracked' },
  { value: '99.9%', label: 'Uptime' },
]

export default function LoginScreen() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

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

      await AsyncStorage.setItem('token', accessToken)
      if (refreshToken) await AsyncStorage.setItem('refresh_token', refreshToken)

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
        router.replace('/(tabs)/dashboard')
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

  const handleTestimonialScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / (width - 64))
    setTestimonialIndex(index)
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
        <GradientHero height={248} topInset={72} bubbles>
          <View style={styles.heroContent}>
            <View style={styles.logoContainer}>
              <BusinessBotLogo size={52} />
            </View>
            <Text style={styles.heroTitle}>BusinessBot</Text>
            <Text style={styles.heroTagline}>Smart Sales & Inventory{'\n'}Tracking System</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </GradientHero>

        {/* ── Feature Showcase ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why BusinessBot?</Text>
          <Text style={styles.sectionSubtitle}>Everything you need to run your business smarter</Text>
          <View style={styles.featureGrid}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon} size={22} color={f.color} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Testimonial ── */}
        <View style={styles.testimonialSection}>
          <Text style={styles.sectionTitle}>Loved by Business Owners</Text>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleTestimonialScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.testimonialScroll}
          >
            {testimonials.map((t, i) => (
              <View key={i} style={styles.testimonialCard}>
                <View style={styles.testimonialStars}>
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Ionicons key={j} name="star" size={14} color="#F59E0B" />
                  ))}
                </View>
                <Text style={styles.testimonialText}>"{t.text}"</Text>
                <View style={styles.testimonialAuthor}>
                  <View style={styles.testimonialAvatar}>
                    <Text style={styles.testimonialAvatarText}>{t.name[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.testimonialName}>{t.name}</Text>
                    <Text style={styles.testimonialRole}>{t.role}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.testimonialDots}>
            {testimonials.map((_, i) => (
              <View key={i} style={[styles.tDot, i === testimonialIndex && styles.tDotActive]} />
            ))}
          </View>
        </View>

        {/* ── Login Form ── */}
        <View style={styles.formSection}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to your account</Text>
          </View>

          {error ? <AlertBadge message={error} type="error" /> : null}
          {success ? <AlertBadge message={success} type="success" /> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
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
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
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

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotLink}>Forgot Password?</Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loginText}>Signing in...</Text>
              </View>
            ) : (
              <View style={styles.loginContent}>
                <Text style={styles.loginText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Signup CTA ── */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <Ionicons name="rocket-outline" size={28} color={Colors.primary} />
            <View style={styles.ctaTextBlock}>
              <Text style={styles.ctaTitle}>New to BusinessBot?</Text>
              <Text style={styles.ctaDesc}>Start your 14-day free trial. No credit card required.</Text>
            </View>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
                <Text style={styles.ctaButtonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* ── Trust Bar ── */}
        <View style={styles.trustBar}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
            <Text style={styles.trustText}>Bank-Level Security</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="cloud-done" size={16} color={Colors.primary} />
            <Text style={styles.trustText}>Cloud Backed Up</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="phone-portrait" size={16} color={Colors.purple} />
            <Text style={styles.trustText}>Works Offline</Text>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  /* ── Hero ── */
  heroContent: { alignItems: 'center', position: 'relative', zIndex: 1, paddingHorizontal: 24 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroTagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.8)',
    marginTop: 6, textAlign: 'center', lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginTop: 28, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BORDER_RADIUS.xl, paddingVertical: 16, paddingHorizontal: 12,
    marginHorizontal: 20,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },

  /* ── Sections ── */
  section: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: Colors.textLight, marginBottom: 16 },

  /* ── Features ── */
  featureGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  featureCard: {
    width: (width - 50) / 2,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  featureDesc: { fontSize: 12, color: Colors.textLight, lineHeight: 17 },

  /* ── Testimonials ── */
  testimonialSection: { paddingTop: 28, paddingBottom: 8, paddingLeft: 20 },
  testimonialScroll: { paddingRight: 20 },
  testimonialCard: {
    width: width - 64,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.xl,
    padding: 20, marginRight: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  testimonialStars: { flexDirection: 'row', gap: 2, marginBottom: 10 },
  testimonialText: {
    fontSize: 14, color: Colors.text, lineHeight: 22,
    fontStyle: 'italic', marginBottom: 14,
  },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testimonialAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  testimonialAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  testimonialName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  testimonialRole: { fontSize: 11, color: Colors.textLight },
  testimonialDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  tDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  tDotActive: { width: 20, backgroundColor: Colors.primary },

  /* ── Form ── */
  formSection: {
    marginHorizontal: 20, marginTop: 24,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.xxl,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  formHeader: { marginBottom: 20 },
  formTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  formSubtitle: { fontSize: 14, color: Colors.textLight, marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 13, fontSize: 16, color: Colors.text },
  eyeButton: { padding: 8 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 18, marginTop: 2 },
  forgotLink: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  loginButton: {
    backgroundColor: Colors.primary, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
  },
  loginButtonDisabled: { backgroundColor: '#93B4F5' },
  loginContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  /* ── CTA ── */
  ctaSection: { paddingHorizontal: 20, marginTop: 20 },
  ctaCard: {
    backgroundColor: Colors.primaryLight, borderRadius: BORDER_RADIUS.xl,
    padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  ctaTextBlock: { alignItems: 'center', marginVertical: 12 },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  ctaDesc: { fontSize: 13, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  ctaButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  /* ── Trust Bar ── */
  trustBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    marginTop: 24, paddingHorizontal: 20,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 11, fontWeight: '600', color: Colors.textLight },
})
