'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { adminAPI, businessAPI } from '@/lib/api'
import { extractArray, isPlatformAdmin, isSuperAdminUser } from '@/lib/utils'

interface Business {
  business_id: number
  name: string
}

interface Member {
  member_id?: number
  id?: number
  business_member_id?: number
  user_id: number
  business_id?: number
  name?: string
  user?: { name?: string }
  full_name?: string
  role?: string
  get_report?: boolean
}

export default function AdminReportAccessPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<number | ''>('')
  const [members, setMembers] = useState<Member[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const isSuperAdmin = isSuperAdminUser(user)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
    if (profileLoaded && isAuthenticated && user && !isPlatformAdmin(user)) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileLoaded, user, router])

  useEffect(() => {
    const loadBusinesses = async () => {
      setLoadingBusinesses(true)
      try {
        let res
        try {
          res = await businessAPI.listAll()
        } catch {
          res = await businessAPI.myBusinesses()
        }
        const data = Array.isArray(res.data) ? res.data : []
        const mapped = data.map((item: any) => {
          const biz = item.business || item
          return { business_id: biz.business_id ?? biz.id, name: biz.name || 'Unnamed' }
        })
        setBusinesses(mapped)
      } catch (err: any) {
        setError('Failed to load businesses')
      } finally {
        setLoadingBusinesses(false)
      }
    }
    if (profileLoaded && isAuthenticated && isPlatformAdmin(user)) {
      loadBusinesses()
    }
  }, [profileLoaded, isAuthenticated, user])

  const loadAllMembers = async () => {
    if (!isSuperAdmin) return
    setLoadingAll(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        businesses.map((b) =>
          businessAPI.getBusinessMembers(b.business_id).catch(() => businessAPI.listMembers(b.business_id))
        )
      )
      const collected: Member[] = []
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          const arr = extractArray(r.value.data)
          arr.forEach((m: any) => {
            collected.push({ ...m, business_id: m.business_id || businesses[idx].business_id })
          })
        }
      })
      setAllMembers(collected)
    } catch (err: any) {
      setError('Failed to load members across businesses')
    } finally {
      setLoadingAll(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin && businesses.length > 0 && selectedBusiness === '') {
      loadAllMembers()
    }
  }, [isSuperAdmin, businesses, selectedBusiness])

  const loadMembers = async (businessId: number) => {
    setLoadingMembers(true)
    setError('')
    setSuccess('')
    try {
      const res = await businessAPI.getBusinessMembers(businessId)
      setMembers(extractArray(res.data).map((m: any) => ({ ...m, business_id: m.business_id || businessId })))
    } catch (err: any) {
      try {
        const res = await businessAPI.listMembers(businessId)
        setMembers(extractArray(res.data).map((m: any) => ({ ...m, business_id: m.business_id || businessId })))
      } catch {
        setError('Failed to load members')
        setMembers([])
      }
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleBusinessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedBusiness(val ? parseInt(val) : '')
    setSelected(new Set())
    if (val) {
      loadMembers(parseInt(val))
    } else {
      setMembers([])
      if (isSuperAdmin && businesses.length > 0) {
        loadAllMembers()
      }
    }
  }

  const toggleReport = async (memberId: number, businessId: number, currentlyAllowed: boolean) => {
    setTogglingId(memberId)
    setError('')
    setSuccess('')
    try {
      await businessAPI.blockReport(businessId, memberId, currentlyAllowed ? 0 : 1)
      setSuccess(currentlyAllowed ? 'Reports access blocked' : 'Reports access enabled')
      if (selectedBusiness) {
        await loadMembers(businessId)
      } else if (isSuperAdmin) {
        await loadAllMembers()
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) setError(detail.map((e: any) => e.msg).join(', '))
      else if (typeof detail === 'string') setError(detail)
      else setError('Failed to update report access')
    } finally {
      setTogglingId(null)
    }
  }

  if (isLoading || !isAuthenticated || !profileLoaded || !isPlatformAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const toggleSelected = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const bulkToggle = async (allow: boolean) => {
    if (selected.size === 0) return
    setBulkBusy(true)
    setError('')
    setSuccess('')
    try {
      const entries = Array.from(selected)
      for (const key of entries) {
        const [bizId, memId] = key.split(':')
        await businessAPI.blockReport(parseInt(bizId), parseInt(memId), allow ? 1 : 0)
      }
      setSuccess(allow ? 'Reports enabled for selected' : 'Reports blocked for selected')
      setSelected(new Set())
      if (selectedBusiness) {
        await loadMembers(selectedBusiness as number)
      } else if (isSuperAdmin) {
        await loadAllMembers()
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) setError(detail.map((e: any) => e.msg).join(', '))
      else if (typeof detail === 'string') setError(detail)
      else setError('Failed to bulk update')
    } finally {
      setBulkBusy(false)
    }
  }

  const displayList = selectedBusiness ? members : allMembers
  const listLoading = selectedBusiness ? loadingMembers : (isSuperAdmin ? loadingAll : false)

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Report Access Control</h1>
        <p className="text-sm text-neutral-light mt-1">Manage blocking/unblocking of users from getting SMS reports across businesses</p>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-success-light text-success text-sm p-3 rounded-xl">{success}</div>
      )}

      <div className="bg-surface rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Business</label>
        <select
          value={selectedBusiness}
          onChange={handleBusinessChange}
          disabled={loadingBusinesses}
          className="w-full sm:w-96 px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="">{isSuperAdmin ? '-- All Businesses (Bulk) --' : '-- Choose a business --'}</option>
          {businesses.map((b) => (
            <option key={b.business_id} value={b.business_id}>{b.name}</option>
          ))}
        </select>
        {isSuperAdmin && selectedBusiness === '' && (
          <p className="text-xs text-neutral-light mt-2">Super admin can select multiple users across all businesses and block/unblock them in bulk for SMS reports.</p>
        )}
      </div>

      {((selectedBusiness) || (isSuperAdmin && selectedBusiness === '')) && (
        <div className="bg-surface rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-slate-900">Members</h2>
              <p className="text-xs text-neutral-light mt-1">
                {selectedBusiness ? 'Control report access for members' : 'All members across businesses'}
              </p>
            </div>
            {isSuperAdmin && selectedBusiness === '' && selected.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bulkToggle(true)}
                  disabled={bulkBusy}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success-light text-success hover:bg-success/10 disabled:opacity-50"
                >
                  {bulkBusy ? 'Updating...' : `Enable Reports (${selected.size})`}
                </button>
                <button
                  onClick={() => bulkToggle(false)}
                  disabled={bulkBusy}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  {bulkBusy ? 'Updating...' : `Block Reports (${selected.size})`}
                </button>
              </div>
            )}
          </div>
          {listLoading ? (
            <div className="px-5 py-12 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : displayList.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {displayList.map((m, idx) => {
                const memberId = m.member_id || m.id || m.business_member_id
                const bizId = m.business_id || (selectedBusiness as number)
                const allowed = m.get_report === true
                const displayName = m.name || m.user?.name || m.full_name || `User ${m.user_id}`
                const role = m.role || 'member'
                const bizName = businesses.find((b) => b.business_id === bizId)?.name
                const key = `${bizId}:${memberId}`
                if (!memberId || !bizId) return null
                return (
                  <div key={`${key}-${idx}`} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isSuperAdmin && selectedBusiness === '' && (
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleSelected(key)}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      )}
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
                        <p className="text-xs text-neutral-light capitalize truncate">
                          {String(role).replace('_', ' ')}
                          {bizName ? ` • ${bizName}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleReport(memberId, bizId, allowed)}
                      disabled={togglingId === memberId}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shrink-0 ${
                        allowed
                          ? 'bg-success-light text-success hover:bg-success/10'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {togglingId === memberId ? 'Updating...' : allowed ? 'Reports: Allowed' : 'Reports: Blocked'}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-neutral-light text-sm">No members found</div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
