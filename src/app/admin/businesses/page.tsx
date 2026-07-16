'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { businessAPI } from '@/lib/api'

interface BusinessRecord {
  business_id: number
  name: string
  is_active?: boolean
  members?: number
  business?: { business_id: number; name: string; is_active?: boolean }
  [key: string]: any
}

export default function AdminBusinessesPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([])
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

  const loadBusinesses = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await businessAPI.listAll()
      setBusinesses(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      setError('Failed to load businesses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'super_admin') loadBusinesses()
  }, [isAuthenticated, user])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this business?')) return
    try {
      await businessAPI.delete(id)
      setSuccess('Business deleted')
      loadBusinesses()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete business')
    }
  }

  const filteredBusinesses = businesses.filter(
    (b) => b.name?.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Business Management</h1>
          <p className="text-sm text-neutral-light mt-1">All businesses on the platform</p>
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
          placeholder="Search businesses..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredBusinesses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">ID</th>
                  <th className="text-center px-5 py-3 font-medium">Members</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBusinesses.map((biz) => {
                  const data: any = biz.business || biz
                  const bizId = data.business_id ?? data.id
                  const name = data.name || 'Unnamed'
                  const isActive = data.is_active !== false
                  const memberCount = biz.members ?? 0
                  return (
                    <tr key={bizId} className="border-t border-gray-50 table-row-hover">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{name}</td>
                      <td className="px-5 py-3.5 text-neutral-light">#{bizId}</td>
                      <td className="px-5 py-3.5 text-center text-neutral-light">{memberCount}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-success-light text-success' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(bizId)}
                          className="text-xs text-danger hover:underline font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-neutral-light text-sm">
            {search ? 'No businesses match your search' : 'No businesses found'}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
