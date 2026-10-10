'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/Table'
import { useAuth } from '@/lib/auth'
import { businessAPI, adminAPI, productAPI, saleAPI, debtAPI } from '@/lib/api'
import { extractArray, isSuperAdminUser, isDeletedProduct } from '@/lib/utils'

const PAGE_SIZE = 10

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
        setProfileProductCount(extractArray(productsRes.value.data).filter((p: any) => !isDeletedProduct(p)).length)
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

  // Reset to the first page whenever the result set changes, so a filter that
  // shrinks the list can never strand the user on an empty page.
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [search, businesses.length])

  const pageCount = Math.max(1, Math.ceil(filteredBusinesses.length / PAGE_SIZE))
  const pagedBusinesses = filteredBusinesses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading || !isAuthenticated || !profileLoaded || !isSuperAdminUser(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Platform"
          title="Business Management"
          subtitle="All businesses on the platform"
        />

        {error && <Alert kind="error" onDismiss={() => setError('')}>{error}</Alert>}
        {success && <Alert kind="success" onDismiss={() => setSuccess('')}>{success}</Alert>}

        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-light"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses..."
            aria-label="Search businesses"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div className="surface-card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-5" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton h-9 w-9 shrink-0 rounded-lg" />
                  <div className="skeleton h-3.5 flex-1" />
                  <div className="skeleton h-6 w-16 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredBusinesses.length > 0 ? (
            <>
              <Table>
                <TableHead>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>ID</TableHeaderCell>
                  <TableHeaderCell align="center">Members</TableHeaderCell>
                  <TableHeaderCell align="center">Status</TableHeaderCell>
                  <TableHeaderCell align="right">Actions</TableHeaderCell>
                </TableHead>
                <TableBody>
                  {pagedBusinesses.map((biz) => {
                    const isActive = biz.is_active !== false
                    return (
                      <TableRow key={biz.business_id} onClick={() => openProfile(biz)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-[13px] font-bold text-primary">
                              {biz.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                            <span className="font-medium text-slate-900">{biz.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-neutral-light">
                          #{biz.business_id}
                        </TableCell>
                        <TableCell align="center" className="text-neutral-light">
                          {biz.members}
                        </TableCell>
                        <TableCell align="center">
                          <Badge color={isActive ? 'emerald' : 'slate'} dot>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell align="right">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(biz.business_id) }}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                totalItems={filteredBusinesses.length}
                pageSize={PAGE_SIZE}
              />
            </>
          ) : (
            <EmptyState
              title={search ? 'No matching businesses' : 'No businesses found'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Businesses created on the platform will appear here.'
              }
            />
          )}
        </div>

      {showProfile && profileBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowProfile(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Business Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <h4 className="text-lg font-semibold text-slate-900">{profileBiz.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      profileBiz.is_active !== false
                        ? 'bg-success-light text-success'
                        : 'bg-slate-100 text-slate-500'
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
                      <p className="text-lg font-semibold text-slate-900">{profileMembers.length}</p>
                    </div>
                    <div className="bg-surfaceAlt rounded-xl p-4">
                      <p className="text-xs text-neutral-light mb-1">Products</p>
                      <p className="text-lg font-semibold text-slate-900">{profileProductCount ?? '---'}</p>
                    </div>
                    <div className="bg-surfaceAlt rounded-xl p-4">
                      <p className="text-xs text-neutral-light mb-1">Total Sales</p>
                      <p className="text-lg font-semibold text-slate-900">
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
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Business Key</p>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                        <code className="flex-1 text-sm text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-300 truncate">
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
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Members</p>
                      <div className="space-y-2">
                        {profileMembers.map((m) => (
                          <div key={m.user_id} className="flex items-center justify-between py-2.5 px-3 bg-surfaceAlt rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                                {m.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{m.name}</p>
                                <p className="text-xs text-neutral-light">{m.email}</p>
                              </div>
                            </div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              m.role === 'admin' ? 'bg-primary/10 text-primary'
                                : m.role === 'manager' ? 'bg-warning-light text-warning'
                                : 'bg-slate-100 text-slate-600'
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

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl flex items-center gap-3">
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
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
