'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { businessAPI, adminAPI, productAPI, saleAPI, debtAPI } from '@/lib/api'
import { extractArray, isSuperAdminUser } from '@/lib/utils'

interface BusinessRecord {
  business_id: number
  name: string
  is_active?: boolean
  members?: number
  [key: string]: any
}

interface MemberRecord {
  user_id: number
  name: string
  email: string
  role: string
  is_verified?: boolean
  is_active?: boolean
  business_id?: number
}

export default function AdminBusinessesPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  const [showProfile, setShowProfile] = useState(false)
  const [profileBiz, setProfileBiz] = useState<BusinessRecord | null>(null)
  const [profileMembers, setProfileMembers] = useState<MemberRecord[]>([])
  const [profileProductCount, setProfileProductCount] = useState<number | null>(null)
  const [profileSalesTotal, setProfileSalesTotal] = useState<number | null>(null)
  const [profileDebtTotal, setProfileDebtTotal] = useState<number | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileBusinessKey, setProfileBusinessKey] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
    if (profileLoaded && isAuthenticated && user && !isSuperAdminUser(user)) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileLoaded, user, router])

  const loadBusinesses = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await businessAPI.listAll()
      const raw = Array.isArray(res.data) ? res.data : []
      const mapped: BusinessRecord[] = raw.map((item: any) => {
        const biz = item.business || item
        return {
          business_id: biz.business_id ?? biz.id,
          name: biz.name || 'Unnamed',
          is_active: biz.is_active,
          members: item.members ?? 0,
        }
      })
      setBusinesses(mapped)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 404) {
        setBusinesses([])
      } else {
        setError(typeof detail === 'string' ? detail : 'Failed to load businesses')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profileLoaded && isAuthenticated && isSuperAdminUser(user)) loadBusinesses()
  }, [profileLoaded, isAuthenticated, user])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this business?')) return
    try {
      await businessAPI.delete(id)
      setSuccess('Business deleted')
      setShowProfile(false)
      setProfileBiz(null)
      loadBusinesses()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete business')
    }
  }

  const openProfile = async (biz: BusinessRecord) => {
    setProfileBiz(biz)
    setShowProfile(true)
    setProfileLoading(true)
    setProfileMembers([])
    setProfileProductCount(null)
    setProfileSalesTotal(null)
    setProfileDebtTotal(null)
    setProfileBusinessKey('')

    try {
      const [usersRes, productsRes, salesRes, debtRes, keyRes] = await Promise.allSettled([
        adminAPI.listAllUsers(),
        productAPI.list(biz.business_id),
        saleAPI.list(biz.business_id),
        debtAPI.getTotalDebt(biz.business_id),
        businessAPI.getBusinessKey(biz.business_id),
      ])

      if (usersRes.status === 'fulfilled') {
        const allUsers = extractArray(usersRes.value.data)
        const members = allUsers.filter((u: any) =>
          (u.business_id ?? u.business?.business_id) === biz.business_id
        )
        setProfileMembers(members.map((m: any) => ({
          user_id: m.user_id ?? m.id,
          name: m.name,
          email: m.email,
          role: m.role || 'user',
          is_verified: m.is_verified,
          is_active: m.is_active,
          business_id: m.business_id,
        })))
      }

      if (productsRes.status === 'fulfilled') {
        setProfileProductCount(extractArray(productsRes.value.data).length)
      }

      if (salesRes.status === 'fulfilled') {
        const sales = extractArray(salesRes.value.data)
        const total = sales.reduce((sum: number, s: any) => sum + Number(s.total_amount ?? s.amount ?? 0), 0)
        setProfileSalesTotal(total)
      }

      if (debtRes.status === 'fulfilled') {
        const d = debtRes.value.data
        setProfileDebtTotal(Number(d?.total_debt ?? d?.debt ?? d ?? 0))
      }

      if (keyRes.status === 'fulfilled') {
        setProfileBusinessKey(keyRes.value.data?.business_key || '')
      }
    } catch {
    } finally {
      setProfileLoading(false)
    }
  }

  const filteredBusinesses = useMemo(
    () => businesses.filter((b) => b.name?.toLowerCase().includes(search.toLowerCase())),
    [businesses, search]
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
                  const isActive = biz.is_active !== false
                  return (
                    <tr
                      key={biz.business_id}
                      onClick={() => openProfile(biz)}
                      className="border-t border-gray-50 table-row-hover cursor-pointer hover:bg-primary/5 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                            {biz.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-gray-900">{biz.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-light">#{biz.business_id}</td>
                      <td className="px-5 py-3.5 text-center text-neutral-light">{biz.members}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-success-light text-success' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(biz.business_id) }}
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

      {showProfile && profileBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowProfile(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Business Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                  {profileBiz.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{profileBiz.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      profileBiz.is_active !== false
                        ? 'bg-success-light text-success'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {profileBiz.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-neutral-light">ID: #{profileBiz.business_id}</span>
                  </div>
                </div>
              </div>

              {profileLoading ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-surfaceAlt rounded-xl p-4">
                      <p className="text-xs text-neutral-light mb-1">Members</p>
                      <p className="text-lg font-semibold text-gray-900">{profileMembers.length}</p>
                    </div>
                    <div className="bg-surfaceAlt rounded-xl p-4">
                      <p className="text-xs text-neutral-light mb-1">Products</p>
                      <p className="text-lg font-semibold text-gray-900">{profileProductCount ?? '---'}</p>
                    </div>
                    <div className="bg-surfaceAlt rounded-xl p-4">
                      <p className="text-xs text-neutral-light mb-1">Total Sales</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {profileSalesTotal !== null ? `GH₵${profileSalesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'}
                      </p>
                    </div>
                    <div className="bg-surfaceAlt rounded-xl p-4">
                      <p className="text-xs text-neutral-light mb-1">Outstanding Debt</p>
                      <p className={`text-lg font-semibold ${(profileDebtTotal ?? 0) > 0 ? 'text-danger' : 'text-success'}`}>
                        {profileDebtTotal !== null ? `GH₵${profileDebtTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'}
                      </p>
                    </div>
                  </div>

                  {profileBusinessKey && (
                    <div className="mb-6">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Business Key</p>
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                        <code className="flex-1 text-sm text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-200 truncate">
                          {profileBusinessKey}
                        </code>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(profileBusinessKey)
                            } catch {
                              const el = document.createElement('textarea')
                              el.value = profileBusinessKey
                              document.body.appendChild(el)
                              el.select()
                              document.execCommand('copy')
                              document.body.removeChild(el)
                            }
                            setSuccess('Key copied!')
                          }}
                          className="px-3 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {profileMembers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Members</p>
                      <div className="space-y-2">
                        {profileMembers.map((m) => (
                          <div key={m.user_id} className="flex items-center justify-between py-2.5 px-3 bg-surfaceAlt rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                                {m.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                <p className="text-xs text-neutral-light">{m.email}</p>
                              </div>
                            </div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              m.role === 'admin' ? 'bg-primary/10 text-primary'
                                : m.role === 'manager' ? 'bg-warning-light text-warning'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {m.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {profileMembers.length === 0 && (
                    <p className="text-sm text-neutral-light text-center py-4">No members found</p>
                  )}
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center gap-3">
              <button
                onClick={() => {
                  router.push(`/business/${profileBiz.business_id}/dashboard`)
                }}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors min-h-[44px]"
              >
                Open Business
              </button>
              <button
                onClick={() => handleDelete(profileBiz.business_id)}
                className="px-4 py-2.5 bg-danger-light text-danger rounded-xl text-sm font-medium hover:bg-danger/10 transition-colors min-h-[44px]"
              >
                Delete
              </button>
              <button
                onClick={() => setShowProfile(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
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
