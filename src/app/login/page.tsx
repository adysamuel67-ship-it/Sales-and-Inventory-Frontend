'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import { authAPI, tryProactiveRefresh, isTokenExpired } from '@/lib/api'
import { useAuth } from '@/lib/auth'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, fetchProfile, fetchBusinesses } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setRegistered(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      const data = res.data
      const access_token = data.access_token || data.token
      const refreshToken = data.refresh_token || null
      const user = data.user || (data.id ? { id: data.id, name: data.name || form.email, email: data.email || form.email, phone: data.phone || '', role: data.role || 'user' } : null)
      if (!access_token) {
        setError('Login failed: no access token returned')
        setLoading(false)
        return
      }
      login(access_token, user, refreshToken)

      if (isTokenExpired(access_token, 60) && refreshToken) {
        await tryProactiveRefresh()
      }

      let profileUser: any = null
      try {
        profileUser = await fetchProfile()
      } catch {
        // Profile fetch failed — continue with login response user
      }

      if (!profileUser && user) {
        profileUser = user
      }

      if (profileUser && !profileUser.is_verified) {
        router.push('/verify')
        return
      }

      try {
        await fetchBusinesses()
      } catch {
        // Businesses fetch failed — continue anyway
      }

      const storedBizId = localStorage.getItem('current_business_id')
      if (storedBizId) {
        router.push(`/business/${storedBizId}/dashboard`)
      } else {
        router.push('/businesses')
      }
    } catch (err: any) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      const msg = err.response?.data?.message || err.response?.data?.msg || err.response?.data?.error
      const rawMessage = err.message
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg || JSON.stringify(e)).join(', '))
      } else if (typeof detail === 'string' && detail) {
        setError(detail)
      } else if (typeof msg === 'string' && msg) {
        setError(msg)
      } else if (rawMessage && /network|fetch|econnrefused|timeout/i.test(rawMessage)) {
        setError('Unable to connect to the server. Please try again later.')
      } else if (status === 401) {
        setError('Invalid email or password. Please try again.')
      } else if (status === 422) {
        setError('Invalid request. Please check your email format and try again.')
      } else if (status && status >= 500) {
        setError('Server error. Please try again in a few moments.')
      } else {
        setError('Login failed. Check your credentials and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your Business Bot dashboard"
      mode="login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {registered && (
          <div className="bg-success-light text-success text-sm p-3.5 rounded-xl flex items-start gap-2.5 border border-success/10 auth-animate-fade-up">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Account created successfully! Please sign in to continue.</span>
          </div>
        )}
        {error && (
          <div className="bg-danger-light text-danger text-sm p-3.5 rounded-xl flex items-start gap-2.5 border border-danger/10 auth-animate-fade-up">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="auth-animate-fade-up auth-delay-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-gray-50 focus:bg-white ${
              emailFocused ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
            }`}
            placeholder="you@example.com"
          />
        </div>

        <div className="auth-animate-fade-up auth-delay-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition-all bg-gray-50 focus:bg-white ${
                passwordFocused ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-light hover:text-gray-600 transition-colors p-1"
            >
              {showPassword ? (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 auth-animate-fade-up auth-delay-3">
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
              rememberMe
                ? 'bg-primary border-primary'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            {rememberMe && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <span className="text-sm text-gray-600">Remember me on this device</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] auth-animate-fade-up auth-delay-3"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing you in...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        <p className="text-center text-sm text-neutral-light mt-2 auth-animate-fade-up auth-delay-4">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Create one for free
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
