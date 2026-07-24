'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { businessAPI } from '@/lib/api'
import { isSuperAdminUser } from '@/lib/utils'

interface BusinessKey {
  business_id: number
  name: string
  business_key: string
}

export default function AdminKeysPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const [businessKeys, setBusinessKeys] = useState<BusinessKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
    if (profileLoaded && isAuthenticated && user && !isSuperAdminUser(user)) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileLoaded, user, router])

  const loadKeys = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await businessAPI.listAll()
      const raw = Array.isArray(res.data) ? res.data : []
      const keys: BusinessKey[] = []
      await Promise.all(
        raw.map(async (item: any) => {
          const biz = item.business || item
          const bizId = biz.business_id ?? biz.id
          try {
            const keyRes = await businessAPI.getBusinessKey(bizId)
            keys.push({
              business_id: bizId,
              name: biz.name || 'Unnamed',
              business_key: keyRes.data?.business_key || '',
            })
          } catch {
            keys.push({
              business_id: bizId,
              name: biz.name || 'Unnamed',
              business_key: 'N/A',
            })
          }
        })
      )
      setBusinessKeys(keys)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setBusinessKeys([])
      } else {
        setError('Failed to load business keys')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profileLoaded && isAuthenticated && isSuperAdminUser(user)) loadKeys()
  }, [profileLoaded, isAuthenticated, user])

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
    } catch {
      const el = document.createElement('textarea')
      el.value = key
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setSuccess('Key copied!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const filteredKeys = useMemo(
    () => businessKeys.filter((bk) => bk.name.toLowerCase().includes(search.toLowerCase())),
    [businessKeys, search]
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
          <h1 className="text-2xl font-bold text-gray-900">Business Keys</h1>
          <p className="text-sm text-neutral-light mt-1">View and copy business keys for all businesses</p>
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
            <p className="text-sm text-neutral-light mt-3">Loading business keys...</p>
          </div>
        ) : filteredKeys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Business</th>
                  <th className="text-left px-5 py-3 font-medium">ID</th>
                  <th className="text-left px-5 py-3 font-medium">Business Key</th>
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map((bk) => (
                  <tr key={bk.business_id} className="border-t border-gray-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                          {bk.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{bk.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-light">#{bk.business_id}</td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 inline-block max-w-[280px] truncate">
                        {bk.business_key || 'N/A'}
                      </code>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleCopyKey(bk.business_key)}
                        disabled={!bk.business_key || bk.business_key === 'N/A'}
                        className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))}
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
