'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { adminAPI } from '@/lib/api'
import { extractArray } from '@/lib/utils'

interface UserRecord {
  user_id: number
  name: string
  email: string
  role: string
  is_verified?: boolean
  business_id?: number
  phone?: string
}

export default function AdminUsersPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
    if (!isLoading && isAuthenticated && user && user.role !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, user, router])

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminAPI.listAllUsers()
      setUsers(extractArray(res.data))
    } catch (err: any) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'super_admin') loadUsers()
  }, [isAuthenticated, user])

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

  const handleVerifyUser = async (userId: number) => {
    try {
      await adminAPI.verifyUser(userId)
      setSuccess('User verified successfully')
      loadUsers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to verify user')
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

  if (isLoading || !isAuthenticated || user?.role !== 'super_admin') {
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
                  <tr key={u.user_id} className="border-t border-gray-50 table-row-hover">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{u.name}</td>
                    <td className="px-5 py-3.5 text-neutral-light">{u.email}</td>
                    <td className="px-5 py-3.5 text-neutral-light">{u.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                        disabled={u.user_id === user?.id}
                        className="text-xs font-medium rounded-lg border border-gray-200 px-2 py-1 focus:border-primary outline-none bg-white disabled:opacity-50"
                      >
                        <option value="user">User</option>
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
                          onClick={() => handleVerifyUser(u.user_id)}
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
                          onClick={() => handleToggleActive(u.user_id)}
                          disabled={u.user_id === user?.id}
                          className="text-xs text-primary hover:underline font-medium disabled:opacity-50"
                        >
                          Activate
                        </button>
                        <button
                          onClick={() => handleDelete(u.user_id)}
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
    </DashboardLayout>
  )
}
