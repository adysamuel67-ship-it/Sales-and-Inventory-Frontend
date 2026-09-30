'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardHeader } from '@/components/ui/Card'
import Field, { disposalInputClass, inputClass } from '@/components/ui/Field'
import PageHeader from '@/components/ui/PageHeader'
import { PageSpinner } from '@/components/ui/Spinner'
import { useAuth } from '@/lib/auth'
import { profileAPI, adminAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import { COMPANY_NAME, SUPPORT_EMAIL, SUPPORT_EMAIL_SUBJECT, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/site'

const roleColorMap: Record<string, 'purple' | 'blue' | 'emerald' | 'amber' | 'slate'> = {
  super_admin: 'purple',
  admin: 'blue',
  manager: 'emerald',
  cashier: 'amber',
  viewer: 'slate',
  user: 'slate',
}

const roleLabelMap: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  viewer: 'Viewer',
  user: 'User',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      color={roleColorMap[role] || 'slate'}
      icon={
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      }
    >
      {roleLabelMap[role] || role}
    </Badge>
  )
}

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <Badge
      color={verified ? 'emerald' : 'amber'}
      icon={
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          {verified ? (
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          )}
        </svg>
      }
    >
      {verified ? 'Verified' : 'Unverified'}
    </Badge>
  )
}

function StatTile({
  label,
  value,
  icon,
  onClick,
}: {
  label: string
  value: string
  icon: React.ReactNode
  onClick?: () => void
}) {
  const interactive = !!onClick
  const Tag = interactive ? 'button' : 'div'
  return (
    <Tag
      {...(interactive ? { type: 'button' as const, onClick } : {})}
      className={`rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors ${
        interactive ? 'cursor-pointer hover:border-primary/40 hover:bg-slate-50' : ''
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">{icon}</div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold tracking-tight text-slate-900 truncate">{value}</p>
    </Tag>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-200 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-slate-900">{children}</div>
    </div>
  )
}

export default function ProfilePage() {
  const { isAuthenticated, isLoading, profileLoaded, user, fetchProfile, businesses, currentBusiness, logout, setBusinessRole } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ name: '', phone: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false)
  const isUnverified = user?.is_verified === false

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && isUnverified) router.replace('/verify')
  }, [profileLoaded, isAuthenticated, isUnverified, router])

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '' })
    }
  }, [user])

  useEffect(() => {
    if (!user?.id || !profileLoaded || !currentBusiness) return
    if (user.business_role) return
    adminAPI.getMemberByUser(user.id).then((res) => {
      const data = res.data
      let memberRole: string | undefined
      if (Array.isArray(data)) {
        const bizMember = data.find((m: any) => String(m.business_id) === String(currentBusiness.business_id))
        if (bizMember) memberRole = bizMember.role
        else if (data.length > 0) memberRole = data[0].role
      } else if (data && typeof data === 'object') {
        memberRole = data.role
      }
      if (memberRole) setBusinessRole(memberRole)
      else if (currentBusiness.role) setBusinessRole(currentBusiness.role)
    }).catch(() => {
      if (currentBusiness.role) setBusinessRole(currentBusiness.role)
    })
  }, [user?.id, user?.business_role, profileLoaded, currentBusiness, setBusinessRole])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError('Name is required')
      setLoading(false)
      return
    }

    try {
      const userId = user?.id
      if (!userId) throw new Error('No user ID')

      const payload: { name: string; phone?: string } = { name: trimmedName }
      const trimmedPhone = form.phone.trim()
      if (trimmedPhone) {
        payload.phone = trimmedPhone
      }

      await profileAPI.updateProfile(userId, payload)

      try {
        await fetchProfile()
      } catch {
        // Update succeeded but profile refresh failed; data will sync on next navigation
      }

      setSuccess('Profile updated successfully!')
      setEditing(false)
    } catch (err: any) {
      setError(parseApiError(err) || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.id) return
    setDeleting(true)
    setError('')
    try {
      await profileAPI.deleteProfile(user.id)
      logout()
      router.replace('/login')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to delete account')
      }
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading || !isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <PageSpinner />
      </div>
    )
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U'
  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || '—'
  const displayRole = user?.role || 'user'
  const businessRole = user?.business_role || ''
  const displayPhone = user?.phone || ''
  const isVerified_ = user?.is_verified === true
  const businessCount = businesses?.length || 0
  const memberSince = user?.created_at ? new Date(user.created_at) : null
  const formattedDate = memberSince && !isNaN(memberSince.getTime()) ? memberSince.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) : ''

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-16">

        <PageHeader
          eyebrow="Account"
          title="Profile"
          subtitle="Manage your personal information and business memberships"
        />

        {error && <Alert kind="error" className="mb-4">{error}</Alert>}
        {success && <Alert kind="success" className="mb-4">{success}</Alert>}

        {/* Identity */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/10 via-primary/[0.04] to-transparent sm:h-24" />
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-10 sm:-mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 ring-4 ring-white flex items-center justify-center text-white text-3xl font-bold shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 sm:pb-1">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">{displayName}</h2>
                  <p className="text-sm text-slate-500 truncate">{displayEmail}</p>
                  {displayPhone && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      {displayPhone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pb-1">
                <RoleBadge role={displayRole} />
                <VerificationBadge verified={isVerified_} />
              </div>
            </div>
          </div>
        </Card>

        {/* At a glance */}
        <div className="relative">
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div>
              <StatTile
                label="Businesses"
                value={String(businessCount)}
                onClick={businessCount > 0 ? () => setShowBusinessDropdown(!showBusinessDropdown) : undefined}
                icon={
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                }
              />
            </div>
            <div>
              <StatTile
                label="Status"
                value={isVerified_ ? 'Verified' : 'Unverified'}
                icon={
                  isVerified_ ? (
                    <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  )
                }
              />
            </div>
            <div>
              <StatTile
                label="Role"
                value={roleLabelMap[displayRole] || displayRole}
                icon={
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                }
              />
            </div>
            <div>
              <StatTile
                label="Joined"
                value={formattedDate || '—'}
                icon={
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                }
              />
            </div>
          </dl>

          {showBusinessDropdown && businessCount > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowBusinessDropdown(false)} />
              <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Your Businesses</p>
                <div className="max-h-64 overflow-y-auto p-2">
                  {businesses?.map((biz: any) => {
                    const isCurrent = currentBusiness?.business_id === biz.business_id
                    return (
                      <button
                        key={biz.business_id}
                        onClick={() => {
                          setShowBusinessDropdown(false)
                          router.push(`/business/${biz.business_id}/dashboard`)
                        }}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          isCurrent ? 'bg-primary/5 text-primary' : 'text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCurrent ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {biz.name?.charAt(0)?.toUpperCase() || 'B'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{biz.name}</span>
                          {isCurrent && <span className="block text-[10px] font-medium text-primary/70">Current</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Business Membership */}
        {currentBusiness && (
          <Card className="mt-4">
            <CardHeader
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
              }
              title="Business Membership"
              subtitle="Your role and membership details"
            />
            <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <DetailRow label="Business">{currentBusiness.name}</DetailRow>
              <DetailRow label="Role in Business">
                {businessRole ? <RoleBadge role={businessRole} /> : <span className="text-slate-500">Not assigned to a business</span>}
              </DetailRow>
              <DetailRow label="Businesses Joined">{businessCount}</DetailRow>
            </div>
          </Card>
        )}

        {/* Personal Information */}
        <Card className="mt-4">
          <CardHeader
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
            title="Personal Information"
            subtitle="Your personal details and contact information"
            action={
              !editing ? (
                <Button variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button>
              ) : undefined
            }
          />

          {!editing ? (
            <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <DetailRow label="Full Name">{displayName}</DetailRow>
              <DetailRow label="Email Address">
                <div className="flex flex-wrap items-center gap-2">
                  {displayEmail}
                  <VerificationBadge verified={isVerified_} />
                </div>
              </DetailRow>
              <DetailRow label="Phone Number">{displayPhone || '—'}</DetailRow>
              <DetailRow label="Role">
                <RoleBadge role={displayRole} />
              </DetailRow>
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <Field label="Full Name" htmlFor="profile-name" required>
                  <input
                    id="profile-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Email Address" htmlFor="profile-email" hint="Email cannot be changed">
                  <input id="profile-email" type="email" value={displayEmail} disabled className={disposalInputClass} />
                </Field>
                <Field label="Phone Number" htmlFor="profile-phone">
                  <input
                    id="profile-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 0241234567"
                    className={inputClass}
                  />
                </Field>
                <Field label="Role">
                  <input type="text" value={roleLabelMap[displayRole] || displayRole} disabled className={disposalInputClass} />
                </Field>
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button type="submit" loading={loading}>Save Changes</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false)
                    if (user) {
                      setForm({ name: user.name || '', phone: user.phone || '' })
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Support */}
        <Card className="mt-4">
          <CardHeader
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            }
            title="Need help?"
            subtitle={`Business Bot is built and supported by ${COMPANY_NAME}`}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] leading-relaxed text-slate-600">
              Something not working, or a question about your account? Send us an email and a person picks up.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                SUPPORT_EMAIL_SUBJECT
              )}&body=${encodeURIComponent(
                `From: ${user?.name || 'A Business Bot user'}${user?.email ? ` <${user.email}>` : ''}\n\nWhat is not working, or what do you need help with?\n\n`
              )}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-primary/40 hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Prefer to talk? Call us and we will pick up.
            </p>
            <a
              href={`tel:${SUPPORT_PHONE_TEL}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold tabular-nums text-slate-900 transition-colors hover:border-primary/40 hover:bg-slate-50"
            >
              {SUPPORT_PHONE_DISPLAY}
            </a>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="mt-4 border-red-200">
          <CardHeader
            icon={
              <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
            title="Danger Zone"
            subtitle="Irreversible actions that affect your account"
          />
          <div className="mt-4 flex flex-col gap-3 border-t border-red-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Delete Account</p>
              <p className="mt-0.5 text-[13px] text-slate-500">Permanently delete your account and all associated data</p>
            </div>
            <Button variant="dangerOutline" onClick={() => setShowDeleteConfirm(true)} className="shrink-0">
              Delete Account
            </Button>
          </div>
        </Card>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <div className="absolute inset-0 bg-slate-900/50" />
            <div
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <svg className="w-7 h-7 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Delete Account</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be removed.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <Button variant="danger" loading={deleting} onClick={handleDeleteAccount} className="flex-1">
                  Yes, Delete My Account
                </Button>
                <Button variant="ghost" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
