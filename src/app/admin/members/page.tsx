'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { adminAPI } from '@/lib/api'
import { extractArray, isPlatformAdmin } from '@/lib/utils'

interface MemberRecord {
  user_id: number
  name: string
  email: string
  role: string
  is_verified?: boolean
  is_active?: boolean
  business_id?: number
  business_name?: string
}

export default function AdminMembersPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
    if (profileLoaded && isAuthenticated && user && !isPlatformAdmin(user)) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileLoaded, user, router])

  const loadMembers = async () => {
    setLoading(true)
    setError('')
    try {
      let allMembers: MemberRecord[] = []

      try {
        const res = await adminAPI.listMembers()
        allMembers = extractArray(res.data).map((m: any) => ({
          user_id: m.user_id ?? m.id,
          name: m.name,
          email: m.email,
          role: m.role || 'user',
          is_verified: m.is_verified,
          is_active: m.is_active,
          business_id: m.business_id,
          business_name: m.business_name || m.business?.name || '',
        }))
      } catch {
        const usersRes = await adminAPI.listAllUsers()
        allMembers = extractArray(usersRes.value?.data || usersRes.data).map((u: any) => ({
          user_id: u.user_id ?? u.id,
          name: u.name,
          email: u.email,
          role: u.role || 'user',
          is_verified: u.is_verified,
          is_active: u.is_active,
          business_id: u.business_id,
          business_name: u.business_name || u.business?.name || '',
        }))
      }

      setMembers(allMembers)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profileLoaded && isAuthenticated && isPlatformAdmin(user)) loadMembers()
  }, [profileLoaded, isAuthenticated, user])

  const handleToggleActive = async (userId: number) => {
    try {
      await adminAPI.activateUser(userId)
      setSuccess('Member updated')
      loadMembers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to update member')
    }
  }

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await adminAPI.updateUser(userId, { role: newRole })
      setSuccess('Role updated')
      loadMembers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to update role')
    }
  }

  const filteredMembers = useMemo(
    () => members.filter(
      (m) =>
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
    ),
    [members, search]
  )

  if (isLoading || !isAuthenticated || !profileLoaded || !isPlatformAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-neutral-light mt-1">View and manage all platform members</p>
        </div>
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

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members by name or email..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neutral-light mt-3">Loading members...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-center px-5 py-3 font-medium">Role</th>
                  <th className="text-center px-5 py-3 font-medium">Verified</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.user_id} className="border-t border-gray-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                          {m.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{m.name}</span>
                          {m.business_name && (
                            <p className="text-xs text-neutral-light">{m.business_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-light">{m.email}</td>
                    <td className="px-5 py-3.5 text-center">
                      <select
                        value={m.role || 'user'}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        disabled={m.user_id === user?.id}
                        className="text-xs font-medium rounded-lg border border-gray-200 px-2 py-1 focus:border-primary outline-none bg-white disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="cashier">Cashier</option>
                        <option value="viewer">Viewer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.is_verified ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                      }`}>
                        {m.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleActive(m.user_id)}
                        disabled={m.user_id === user?.id}
                        className="text-xs text-primary hover:underline font-medium disabled:opacity-50"
                      >
                        {m.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-neutral-light text-sm">
            {search ? 'No members match your search' : 'No members found'}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
