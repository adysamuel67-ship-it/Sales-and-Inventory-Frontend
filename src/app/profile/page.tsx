'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { profileAPI, adminAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'

const roleColorMap: Record<string, string> = {
  super_admin: 'bg-red-50 text-red-700 ring-1 ring-red-100',
  admin: 'bg-purple-50 text-purple-700 ring-1 ring-purple-100',
  manager: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  cashier: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  viewer: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  user: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
}

const roleLabelMap: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  viewer: 'Viewer',
  user: 'User',
}

const iconCls = 'w-5 h-5 shrink-0'

function RoleBadge({ role }: { role: string }) {
  const label = roleLabelMap[role] || role
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${roleColorMap[role] || roleColorMap.user}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
      {label}
    </span>
  )
}

function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-100">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      Unverified
    </span>
  )
}

function StatTile({
  label,
  value,
  icon,
  onClick,
  className = '',
}: {
  label: string
  value: string
  icon: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const interactive = !!onClick
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-gray-200 shadow-sm px-4 py-4 flex items-center gap-3 ${interactive ? 'cursor-pointer hover:border-blue-200 hover:shadow-md transition-all' : ''} ${className}`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-light font-medium">{label}</p>
        <p className="text-base font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  iconClsCls = 'bg-blue-50 text-blue-600',
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode
  iconClsCls?: string
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClsCls}`}>{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-neutral-light mt-0.5">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      <div className="text-sm font-medium text-gray-900">{children}</div>
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U'
  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || '---'
  const displayRole = user?.role || 'user'
  const businessRole = user?.business_role || ''
  const displayPhone = user?.phone || ''
  const isVerified_ = user?.is_verified === true
  const businessCount = businesses?.length || 0
  const memberSince = user?.created_at ? new Date(user.created_at) : null
  const formattedDate = memberSince && !isNaN(memberSince.getTime()) ? memberSince.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }) : ''

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-16">

        {/* Page header */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Account</p>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-neutral-light mt-1">Manage your personal information and business memberships</p>
        </div>

        {error && (
          <div className="mb-4 bg-danger-light text-danger text-sm px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-success-light text-success text-sm px-4 py-3 rounded-xl border border-green-100 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {/* Profile hero */}
        <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-16 sm:h-20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-gray-200" />
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-8 sm:-mt-10">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 ring-4 ring-surface flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0 sm:pb-0.5">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{displayName}</h2>
                <p className="text-sm text-neutral-light truncate">{displayEmail}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0 sm:pb-0.5">
                <RoleBadge role={displayRole} />
                <VerificationBadge verified={isVerified_} />
              </div>
            </div>
            {displayPhone && (
              <p className="text-sm text-neutral-light mt-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {displayPhone}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
            <StatTile
              label="Businesses"
              value={String(businessCount)}
              onClick={businessCount > 0 ? () => setShowBusinessDropdown(!showBusinessDropdown) : undefined}
              icon={
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <svg className={`${iconCls} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
              }
            />
            <StatTile
              label="Status"
              value={isVerified_ ? 'Verified' : 'Unverified'}
              icon={
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVerified_ ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  {isVerified_ ? (
                    <svg className={`${iconCls} text-emerald-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className={`${iconCls} text-amber-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  )}
                </div>
              }
            />
            <StatTile
              label="Role"
              value={roleLabelMap[displayRole] || displayRole}
              icon={
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <svg className={`${iconCls} text-purple-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              }
            />
            <StatTile
              label="Joined"
              value={formattedDate || '---'}
              icon={
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <svg className={`${iconCls} text-slate-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
              }
            />
          </div>

          {showBusinessDropdown && businessCount > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowBusinessDropdown(false)} />
              <div className="absolute top-full left-0 mt-2 w-72 bg-surface rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">Your Businesses</p>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {businesses?.map((biz: any) => (
                    <button
                      key={biz.business_id}
                      onClick={() => {
                        setShowBusinessDropdown(false)
                        router.push(`/business/${biz.business_id}/dashboard`)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        currentBusiness?.business_id === biz.business_id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        currentBusiness?.business_id === biz.business_id
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {biz.name?.charAt(0)?.toUpperCase() || 'B'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{biz.name}</p>
                        {currentBusiness?.business_id === biz.business_id && (
                          <p className="text-[10px] font-medium text-blue-600/70">Current</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Business Membership */}
        {currentBusiness && (
          <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 mt-4">
            <SectionHeader
              icon={
                <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
              }
              iconClsCls="bg-blue-50 text-blue-600"
              title="Business Membership"
              subtitle="Your role and membership details"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
              <DetailRow label="Business">{currentBusiness.name}</DetailRow>
              <DetailRow label="Role in Business">
                {businessRole ? <RoleBadge role={businessRole} /> : <span className="text-gray-500">Not assigned to a business</span>}
              </DetailRow>
              <DetailRow label="Businesses Joined">{businessCount}</DetailRow>
            </div>
          </div>
        )}

        {/* Personal Information */}
        <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 mt-4">
          <SectionHeader
            icon={
              <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
            iconClsCls="bg-purple-50 text-purple-600"
            title="Personal Information"
            subtitle="Your personal details and contact information"
            action={
              !editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-surface border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-h-[40px]"
                >
                  Edit Profile
                </button>
              ) : undefined
            }
          />

          {!editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
              <DetailRow label="Full Name">{displayName}</DetailRow>
              <DetailRow label="Email Address">
                <div className="flex flex-wrap items-center gap-2">
                  {displayEmail}
                  <VerificationBadge verified={isVerified_} />
                </div>
              </DetailRow>
              <DetailRow label="Phone Number">{displayPhone || '---'}</DetailRow>
              <DetailRow label="Role">
                <RoleBadge role={displayRole} />
              </DetailRow>
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={displayEmail}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-light mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <input
                    type="text"
                    value={roleLabelMap[displayRole] || displayRole}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    if (user) {
                      setForm({ name: user.name || '', phone: user.phone || '' })
                    }
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-surface rounded-2xl border border-red-200 shadow-sm overflow-hidden mt-4">
          <div className="px-5 sm:px-6 py-5 flex items-center gap-4 border-b border-red-100">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <svg className={`${iconCls} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-900">Danger Zone</h3>
              <p className="text-xs text-red-600/70 mt-0.5">Irreversible actions that affect your account</p>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">Delete Account</p>
              <p className="text-xs text-neutral-light mt-0.5">Permanently delete your account and all associated data</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors min-h-[40px]"
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delete Account</h3>
                <p className="text-sm text-neutral-light mt-2">
                  Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be removed.
                </p>
              </div>
              <div className="px-5 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete My Account'
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}