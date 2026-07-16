'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { adminAPI } from '@/lib/api'
import KpiCard from '@/components/KpiCard'

export default function AdminDashboardPage() {
  const { isAuthenticated, isLoading, profileLoaded, isVerified, user } = useAuth()
  const router = useRouter()
  const [userCount, setUserCount] = useState(0)
  const [businessCount, setBusinessCount] = useState(0)
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) router.replace('/verify')
    if (profileLoaded && isAuthenticated && isVerified && user && user.role !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileLoaded, isVerified, user, router])

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'super_admin') return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [usersRes, businessesRes] = await Promise.allSettled([
          adminAPI.listAllUsers(),
          adminAPI.listUsers(),
        ])
        if (cancelled) return

        if (usersRes.status === 'fulfilled') {
          const users = Array.isArray(usersRes.value.data) ? usersRes.value.data : []
          setUserCount(users.length)
          setRecentUsers(users.slice(0, 10))
        }

        if (businessesRes.status === 'fulfilled') {
          const data = businessesRes.value.data
          setBusinessCount(Array.isArray(data) ? data.length : 0)
        }
      } catch (err: any) {
        if (!cancelled) setError('Failed to load admin data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [isAuthenticated, user])

  if (isLoading || !isAuthenticated || !profileLoaded || user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-neutral-light mt-1">Platform overview and management</p>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <KpiCard
          title="Total Users"
          value={loading ? '---' : userCount.toLocaleString()}
          subtitle="Registered accounts"
          icon="👥"
          color="primary"
        />
        <KpiCard
          title="Total Businesses"
          value={loading ? '---' : businessCount.toLocaleString()}
          subtitle="Active businesses"
          icon="🏢"
          color="success"
        />
        <KpiCard
          title="Your Role"
          value="Super Admin"
          subtitle="Full platform access"
          icon="🛡️"
          color="warning"
        />
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Users</h2>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : recentUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-center px-5 py-3 font-medium">Role</th>
                  <th className="text-center px-5 py-3 font-medium">Verified</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u: any) => (
                  <tr key={u.user_id ?? u.id} className="border-t border-gray-50 table-row-hover">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{u.name}</td>
                    <td className="px-5 py-3.5 text-neutral-light">{u.email}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'super_admin' ? 'bg-african-gold/20 text-african-gold'
                          : u.role === 'admin' ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.is_verified ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                      }`}>
                        {u.is_verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-neutral-light text-sm">No users found</div>
        )}
      </div>
    </DashboardLayout>
  )
}
