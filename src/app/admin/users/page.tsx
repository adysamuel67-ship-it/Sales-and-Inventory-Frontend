'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { adminAPI } from '@/lib/api'
import { extractArray, isSuperAdminUser } from '@/lib/utils'

interface UserRecord {
  user_id: number
  name: string
  email: string
  role: string
  is_verified?: boolean
  is_active?: boolean
  business_id?: number
  phone?: string
  date_joined?: string
  created_at?: string
  last_login?: string
  businesses?: any[]
  [key: string]: any
}

export default function AdminUsersPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
    if (profileLoaded && isAuthenticated && user && !isSuperAdminUser(user)) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileLoaded, user, router])

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      let res
      try {
        res = await adminAPI.listAllUsers()
      } catch {
        res = await adminAPI.listUsers()
      }
      setUsers(extractArray(res.data))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e: any) => e.msg).join(', ') : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profileLoaded && isAuthenticated && isSuperAdminUser(user)) loadUsers()
  }, [profileLoaded, isAuthenticated, user])

  const handleToggleActive = async (userId: number) => {
    try {
      await adminAPI.activateUser(userId)
      setSuccess('User updated')
      loadUsers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to update user')
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await adminAPI.deleteUser(userId)
      setSuccess('User deleted')
      loadUsers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete user')
    }
  }

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await adminAPI.updateUser(userId, { role: newRole })
      setSuccess('Role updated')
      loadUsers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to update role')
    }
  }

  const handleVerifyUser = async (email: string) => {
    try {
      await adminAPI.verifyUser(email)
      setSuccess('User verified successfully')
      loadUsers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to verify user')
    }
  }

  const handleUserClick = async (u: UserRecord) => {
    setDetailLoading(true)
    setSelectedUser(u)
    try {
      const res = await adminAPI.getUser(u.user_id)
      const data = res.data
      setSelectedUser({
        ...u,
        name: data.name || u.name,
        email: data.email || u.email,
        phone: data.phone || u.phone || '',
        role: data.role || u.role,
        is_verified: data.is_verified ?? u.is_verified,
        is_active: data.is_active ?? u.is_active,
        date_joined: data.date_joined || data.created_at || u.date_joined || u.created_at || '',
        last_login: data.last_login || '',
        businesses: data.businesses || data.memberships || [],
      })
    } catch {
      // Use whatever we have from the list
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredUsers = useMemo(
    () => users.filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.toLowerCase().includes(search.toLowerCase())
    ),
    [users, search]
  )

  if (isLoading || !isAuthenticated || !profileLoaded || !isSuperAdminUser(user)) {
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-neutral-light mt-1">Manage platform users and roles</p>
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
          placeholder="Search users by name, email, or phone..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Phone</th>
                  <th className="text-center px-5 py-3 font-medium">Role</th>
                  <th className="text-center px-5 py-3 font-medium">Verified</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.user_id} className="border-t border-gray-50 table-row-hover cursor-pointer" onClick={() => handleUserClick(u)}>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{u.name}</td>
                    <td className="px-5 py-3.5 text-neutral-light">{u.email}</td>
                    <td className="px-5 py-3.5 text-neutral-light">{u.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => { e.stopPropagation(); handleRoleChange(u.user_id, e.target.value) }}
                        disabled={u.user_id === user?.id}
                        className="text-xs font-medium rounded-lg border border-gray-200 px-2 py-1 focus:border-primary outline-none bg-white disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="cashier">Cashier</option>
                        <option value="viewer">Viewer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {u.is_verified ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">
                          Verified
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleVerifyUser(u.email) }}
                          disabled={u.user_id === user?.id}
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-warning-light text-warning hover:bg-warning/10 transition-colors disabled:opacity-50"
                          title="Click to verify this user"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(u.user_id) }}
                          disabled={u.user_id === user?.id}
                          className="text-xs text-primary hover:underline font-medium disabled:opacity-50"
                        >
                          Activate
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(u.user_id) }}
                          disabled={u.user_id === user?.id}
                          className="text-xs text-danger hover:underline font-medium disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-neutral-light text-sm">
            {search ? 'No users match your search' : 'No users found'}
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 bg-gradient-to-br from-primary to-primary-dark rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white truncate">{selectedUser.name}</h3>
                  <p className="text-white/70 text-sm truncate">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {detailLoading ? (
                <div className="py-6 text-center">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surfaceAlt rounded-xl p-3">
                      <p className="text-[10px] text-neutral-light uppercase tracking-wider mb-1">Role</p>
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                        {(selectedUser.role || 'user').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="bg-surfaceAlt rounded-xl p-3">
                      <p className="text-[10px] text-neutral-light uppercase tracking-wider mb-1">Status</p>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        selectedUser.is_verified ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                      }`}>
                        {selectedUser.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm bg-surfaceAlt rounded-xl p-3">
                      <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <div>
                        <p className="text-[10px] text-neutral-light">Phone</p>
                        <span className="text-gray-700 font-medium">{selectedUser.phone || '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm bg-surfaceAlt rounded-xl p-3">
                      <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <div>
                        <p className="text-[10px] text-neutral-light">User ID</p>
                        <span className="text-gray-700 font-medium">#{selectedUser.user_id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm bg-surfaceAlt rounded-xl p-3">
                      <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      <div>
                        <p className="text-[10px] text-neutral-light">Joined</p>
                        <span className="text-gray-700 font-medium">
                          {selectedUser.date_joined || selectedUser.created_at
                            ? new Date(selectedUser.date_joined || selectedUser.created_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {selectedUser.last_login && (
                      <div className="flex items-center gap-3 text-sm bg-surfaceAlt rounded-xl p-3">
                        <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-[10px] text-neutral-light">Last Login</p>
                          <span className="text-gray-700 font-medium">
                            {new Date(selectedUser.last_login).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}

                    {Array.isArray(selectedUser.businesses) && selectedUser.businesses.length > 0 && (
                      <div className="bg-surfaceAlt rounded-xl p-3">
                        <p className="text-[10px] text-neutral-light uppercase tracking-wider mb-2">Businesses</p>
                        <div className="space-y-1.5">
                          {selectedUser.businesses.map((biz: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                                {(biz.name || biz.business_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-gray-700 font-medium truncate">{biz.name || biz.business_name || `Business #${biz.business_id || idx}`}</span>
                              {biz.role && (
                                <span className="text-[10px] text-neutral-light capitalize ml-auto shrink-0">{biz.role}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 rounded-b-2xl">
              {!selectedUser.is_verified && (
                <button
                  onClick={() => { handleVerifyUser(selectedUser.email); setSelectedUser(null) }}
                  disabled={selectedUser.user_id === user?.id}
                  className="px-4 py-2.5 bg-warning text-white rounded-xl text-sm font-medium hover:bg-warning-dark transition-colors disabled:opacity-50"
                >
                  Verify User
                </button>
              )}
              <button
                onClick={() => { handleToggleActive(selectedUser.user_id); setSelectedUser(null) }}
                disabled={selectedUser.user_id === user?.id}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                Toggle Active
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
