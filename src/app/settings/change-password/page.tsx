'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import { LockIcon, CheckCircleIcon } from '@/components/ui/Icons'
import { useAuth } from '@/lib/auth'
import { authAPI } from '@/lib/api'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]'

function PasswordCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs font-medium ${met ? 'text-success' : 'text-gray-400'}`}>
      <CheckCircleIcon className={`w-4 h-4 ${met ? 'text-success' : 'text-gray-300'}`} />
      {label}
    </li>
  )
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, profileLoaded, user, currentBusiness, logout } = useAuth()

  const backPath = currentBusiness?.business_id
    ? `/business/${currentBusiness.business_id}/settings`
    : '/profile'

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [codeSent, setCodeSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((r) => r - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendTimer])

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const goTo = (s: 1 | 2 | 3) => {
    if (s === 2 && !codeSent) return
    if (s === 3 && !otpVerified) return
    setError('')
    setSuccess('')
    setStep(s)
  }

  const handleSendCode = async () => {
    setError('')
    setSuccess('')
    if (!oldPassword) {
      setError('Please enter your current password')
      return
    }
    if (!user?.email) {
      setError('Unable to identify your account. Please log in again.')
      return
    }
    setSending(true)
    try {
      await authAPI.sendChangePasswordCode(user.email)
      setCodeSent(true)
      setStep(2)
      setSuccess(`A 7-digit verification code has been sent to ${user.email}`)
      setResendTimer(120)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to send verification code')
    } finally {
      setSending(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 6) inputRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 7)
    if (pasted) {
      const next = pasted.split('').concat(Array(7).fill('')).slice(0, 7)
      setOtp(next)
      const nextEmpty = next.findIndex((c) => !c)
      inputRefs.current[nextEmpty === -1 ? 6 : nextEmpty]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    setSuccess('')
    const fullCode = otp.join('')
    if (fullCode.length !== 7) {
      setError('Please enter the full 7-digit code')
      return
    }
    setVerifying(true)
    try {
      await authAPI.verifyChangePasswordOtp(fullCode)
      setOtpVerified(true)
      setStep(3)
      setSuccess('Code verified. Now set your new password.')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Invalid verification code')
    } finally {
      setVerifying(false)
    }
  }

  const validateNewPassword = (pw: string): string => {
    if (pw.length < 8) return 'Password must be at least 8 characters'
    if (!/\d/.test(pw)) return 'Password must contain at least one number'
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter'
    return ''
  }

  const handleUpdatePassword = async () => {
    setError('')
    setSuccess('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    const invalid = validateNewPassword(newPassword)
    if (invalid) {
      setError(invalid)
      return
    }
    setUpdating(true)
    try {
      await authAPI.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        conf_password: confirmPassword,
        otp: otp.join(''),
      })
      setSuccess('Password changed successfully. Signing you out...')
      successTimerRef.current = setTimeout(() => {
        logout()
        router.replace('/login')
      }, 1500)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg || String(d)).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to update password')
      }
    } finally {
      setUpdating(false)
    }
  }

  if (isLoading || !isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const email = user?.email || 'your registered email'

  const passwordChecked = {
    length: newPassword.length >= 8,
    number: /\d/.test(newPassword),
    uppercase: /[A-Z]/.test(newPassword),
  }

  const steps = [
    { id: 1, label: 'Confirm Identity' },
    { id: 2, label: 'Verify Code' },
    { id: 3, label: 'New Password' },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-16">
        <PageHeader
          eyebrow="Security"
          title="Change Password"
          subtitle="Verify your identity before updating your account password"
          backLink={backPath}
          backLabel="Back to Settings"
        />

        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        {success && (
          <div className="mb-4">
            <Alert kind="success">{success}</Alert>
          </div>
        )}

        <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b border-gray-200 bg-primary/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LockIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Account Security</h2>
              <p className="text-xs text-neutral-light mt-0.5">
                We&apos;ll send a one-time code to <span className="font-medium text-gray-600">{email}</span> to confirm it&apos;s really you.
              </p>
            </div>
          </div>

          <div className="px-5 sm:px-6 pt-5">
            <div className="flex items-center">
              {steps.map((s, i) => {
                const active = step === s.id
                const done = step > s.id
                const reachable = s.id === 1 || (s.id === 2 && codeSent) || (s.id === 3 && otpVerified)
                return (
                  <div key={s.id} className="flex items-center flex-1 last:flex-none">
                    <button
                      type="button"
                      onClick={() => goTo(s.id as 1 | 2 | 3)}
                      disabled={!reachable}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          done
                            ? 'bg-success text-white'
                            : active
                            ? 'bg-primary text-white ring-4 ring-primary/15'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {done ? <CheckCircleIcon className="w-4 h-4" /> : s.id}
                      </span>
                      <span className={`text-xs font-semibold ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {s.label}
                      </span>
                    </button>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-px mx-3 ${done ? 'bg-success' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-5 sm:px-6 py-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sending || !oldPassword}
                  className="w-full py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
                <p className="text-xs text-neutral-light text-center">
                  A confirmation code will be sent to {email}
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1.5">Enter Verification Code</p>
                  <p className="text-xs text-neutral-light mb-3">
                    Enter the 7-digit code sent to {email}
                    {resendTimer > 0 && (
                      <>
                        {' '}· Resend in{' '}
                        <span className="text-primary font-semibold">
                          {Math.floor(resendTimer / 60)}:{String(resendTimer % 60).padStart(2, '0')}
                        </span>
                      </>
                    )}
                  </p>
                  <div className="flex gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-10 h-12 sm:w-12 text-center text-lg font-bold rounded-xl border-2 outline-none transition-all ${
                          otp[i]
                            ? 'border-primary bg-primary-light text-primary'
                            : 'border-gray-200 bg-gray-50 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifying || otp.join('').length !== 7}
                  className="w-full py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {verifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </button>
                {resendTimer === 0 && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sending}
                    className="w-full text-center text-sm text-primary font-semibold hover:underline disabled:opacity-60"
                  >
                    {sending ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                    className={inputCls}
                  />
                  <ul className="mt-2.5 space-y-1.5">
                    <PasswordCheck met={passwordChecked.length} label="At least 8 characters" />
                    <PasswordCheck met={passwordChecked.number} label="At least one number" />
                    <PasswordCheck met={passwordChecked.uppercase} label="At least one uppercase letter" />
                  </ul>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    className={inputCls}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-1.5 text-xs text-danger font-medium">Passwords do not match</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={updating || success !== ''}
                  className="w-full py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {updating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}