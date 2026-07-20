'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { profileAPI } from '@/lib/api'

export default function ProfilePage() {
  const { isAuthenticated, isLoading, profileLoaded, isVerified, user, fetchProfile, businesses } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) router.replace('/verify')
  }, [profileLoaded, isAuthenticated, isVerified, router])

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const userId = user?.id
      if (!userId) throw new Error('No user ID')
      await profileAPI.updateProfile(userId, {
        name: form.name,
        phone: form.phone,
      })
      await fetchProfile()
      setSuccess('Profile updated successfully!')
      setEditing(false)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to update profile')
      }
    } finally {
      setLoading(false)
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
  const businessCount = businesses?.length || 1
  const memberSince = user?.created_at ? new Date(user.created_at) : null
  const formattedDate = memberSince ? memberSince.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) : ''

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-16">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-neutral-light mt-1">Manage your account settings</p>
        </div>

        {error && (
          <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-success-light text-success text-sm p-3 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="relative px-6 py-12 bg-gradient-to-br from-primary via-primary-dark to-primary">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
            </div>
            <div className="relative flex flex-col items-center text-center gap-4">
              <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {initial}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{user?.name || 'User'}</h2>
                <p className="text-white/70 text-sm mt-1">{user?.email || ''}</p>
                {user?.phone && (
                  <p className="text-white/60 text-sm mt-0.5">{user.phone}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider bg-white/15 text-white px-3 py-1 rounded-full">
                    {user?.role || 'user'}
                  </span>
                  {user?.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider bg-emerald-400/20 text-emerald-100 px-3 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider bg-amber-400/20 text-amber-100 px-3 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Unverified
                    </span>
                  )}
                </div>
              </div>
              {formattedDate && <p className="text-white/50 text-xs mt-1">Member since {formattedDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 -mt-4">
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-light font-medium">Businesses</p>
                <p className="text-lg font-bold text-gray-900">{businessCount}</p>
              </div>
            </div>
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${user?.is_verified ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                {user?.is_verified ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-light font-medium">Status</p>
                <p className="text-sm font-bold text-gray-900">{user?.is_verified ? 'Verified' : 'Unverified'}</p>
              </div>
            </div>
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-light font-medium">Role</p>
                <p className="text-sm font-bold text-gray-900 capitalize">{user?.role || 'user'}</p>
              </div>
            </div>
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-light font-medium">Joined</p>
                <p className="text-sm font-bold text-gray-900">{formattedDate || '---'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
              <p className="text-sm text-neutral-light mt-0.5">Your personal details and contact information</p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/15 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {!editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-sm font-medium text-gray-900">{user?.name || '---'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{user?.email || '---'}</p>
                  {user?.is_verified ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Verified</span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Unverified</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Phone Number</p>
                <p className="text-sm font-medium text-gray-900">{user?.phone || '---'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Role</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{user?.role || 'user'}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <input
                    type="text"
                    value={user?.role || 'user'}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-not-allowed capitalize"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center gap-2"
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
                      setForm({
                        name: user.name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                      })
                    }
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
            <p className="text-sm text-neutral-light mt-0.5">Update your account password</p>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Password management is handled by your administrator</p>
              <p className="text-sm text-neutral-light mt-1">Contact an administrator to change your password.</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border-2 border-red-200 shadow-sm p-6 mt-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-red-900">Danger Zone</h3>
              <p className="text-sm text-red-600/70 mt-0.5">Irreversible actions that affect your account</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-red-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete Account</p>
              <p className="text-xs text-neutral-light mt-0.5">Permanently delete your account and all associated data</p>
            </div>
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-red-300 bg-red-50 border border-red-200 rounded-xl cursor-not-allowed opacity-60"
            >
              Delete Account
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
