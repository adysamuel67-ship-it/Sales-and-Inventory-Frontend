'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import { authAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export default function VerifyPage() {
  const router = useRouter()
  const { user, fetchProfile, fetchBusinesses, logout } = useAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const userId = user?.id

  useEffect(() => {
    if (!userId) {
      router.replace('/login')
    }
  }, [userId, router])

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendTimer])

  const sendOtp = useCallback(async () => {
    if (!userId) return
    setSending(true)
    setError('')
    setSuccess('')
    try {
      await authAPI.sendVerification()
      setSuccess('Verification code sent to your email.')
      setResendTimer(60)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to send verification code.')
    } finally {
      setSending(false)
    }
  }, [userId])

  useEffect(() => {
    sendOtp()
  }, [sendOtp])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      const newCode = pasted.split('').concat(Array(6).fill('')).slice(0, 6)
      setCode(newCode)
      const nextEmpty = newCode.findIndex((c) => !c)
      inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code.')
      return
    }
    if (!userId) {
      setError('Session expired. Please log in again.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authAPI.verifyEmail({ user_id: userId, code: fullCode })
      const profileUser = await fetchProfile()
      if (profileUser?.is_verified) {
        await fetchBusinesses()
        router.push('/dashboard')
      } else {
        setError('Verification failed. Please try again.')
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg || JSON.stringify(e)).join(', '))
      } else if (typeof detail === 'string' && detail) {
        setError(detail)
      } else {
        setError('Invalid verification code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  if (!userId) return null

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Enter the 6-digit code sent to your email"
      mode="verify"
    >
      <div className="mb-5 p-3.5 bg-primary-light rounded-xl border border-primary/10 auth-animate-fade-up">
        <p className="text-sm text-primary font-medium text-center flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {user?.email || 'your email'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-danger-light text-danger text-sm p-3.5 rounded-xl flex items-start gap-2.5 border border-danger/10 auth-animate-fade-up">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-success-light text-success text-sm p-3.5 rounded-xl flex items-start gap-2.5 border border-success/10 auth-animate-fade-up">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <div className="flex justify-center gap-3 auth-animate-fade-up auth-delay-1" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all ${
                digit
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-gray-200 bg-gray-50 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'
              }`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || code.join('').length !== 6}
          className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] auth-animate-fade-up auth-delay-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </button>

        <div className="text-center auth-animate-fade-up auth-delay-3">
          {resendTimer > 0 ? (
            <p className="text-sm text-neutral-light">
              Resend code in{' '}
              <span className="text-primary font-semibold">{resendTimer}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={sendOtp}
              disabled={sending}
              className="text-sm text-primary font-semibold hover:underline disabled:opacity-60 flex items-center justify-center gap-1.5 mx-auto"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend verification code
                </>
              )}
            </button>
          )}
        </div>

        <div className="text-center auth-animate-fade-up auth-delay-4">
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-neutral-light hover:text-gray-700 transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Use a different account
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
