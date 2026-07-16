'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import { authAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export default function VerifyPage() {
  const router = useRouter()
  const { pendingVerificationEmail, setPendingVerification, fetchProfile, fetchBusinesses, logout } = useAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const email = pendingVerificationEmail

  useEffect(() => {
    if (!email) {
      router.replace('/login')
    }
  }, [email, router])

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendTimer])

  const sendOtp = useCallback(async () => {
    if (!email) return
    setSending(true)
    setError('')
    setSuccess('')
    try {
      await authAPI.sendVerification(email)
      setSuccess('Verification code sent to your email.')
      setResendTimer(60)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to send verification code.')
    } finally {
      setSending(false)
    }
  }, [email])

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
    setError('')
    setLoading(true)
    try {
      await authAPI.verifyEmail({ email: email!, code: fullCode })
      const profileUser = await fetchProfile()
      if (profileUser?.is_verified) {
        setPendingVerification(null)
        await fetchBusinesses()
        router.push('/dashboard')
      } else {
        setError('Verification failed. Please try again.')
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg || JSON.stringify(e)).join(', '))
      } else if (typeof detail === 'string') {
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
    setPendingVerification(null)
    router.replace('/login')
  }

  if (!email) return null

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Enter the 6-digit code sent to your email"
    >
      <div className="mb-4 p-3 bg-primary-light rounded-xl">
        <p className="text-sm text-primary font-medium text-center">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="bg-success-light text-success text-sm p-3 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        <div className="flex justify-center gap-3" onPaste={handlePaste}>
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
              className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || code.join('').length !== 6}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        <div className="text-center">
          {resendTimer > 0 ? (
            <p className="text-sm text-neutral-light">
              Resend code in {resendTimer}s
            </p>
          ) : (
            <button
              type="button"
              onClick={sendOtp}
              disabled={sending}
              className="text-sm text-primary font-medium hover:underline disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Resend verification code'}
            </button>
          )}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-neutral-light hover:underline"
          >
            Use a different account
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
