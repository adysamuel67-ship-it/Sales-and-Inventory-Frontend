'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { businessAPI } from '@/lib/api'

interface Approval {
  approval_id: number
  business_id: number
  reason: string
  approval_type: string
  status: string
  created_at?: string
  requester?: { user_id: number; name: string; email: string }
}

interface Business {
  business_id: number
  name: string
}

const statusStyles: Record<string, string> = {
  pending: 'bg-warning-light text-warning',
  approved: 'bg-success-light text-success',
  rejected: 'bg-danger-light text-danger',
}

export default function RequestsPage() {
  const { isAuthenticated, isLoading, profileLoaded, user, businesses, fetchBusinesses } = useAuth()
  const router = useRouter()

  const [allApprovals, setAllApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processingApproval, setProcessingApproval] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) {
      router.replace('/verify')
    }
  }, [profileLoaded, isAuthenticated, user?.is_verified, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadAllApprovals()
    }
  }, [isAuthenticated])

  const extractApprovalArray = (data: any): Approval[] => {
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object') {
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) return data[key]
      }
      if (data.data) {
        if (Array.isArray(data.data)) return data.data
        if (typeof data.data === 'object') {
          for (const key of Object.keys(data.data)) {
            if (Array.isArray(data.data[key])) return data.data[key]
          }
        }
      }
    }
    return []
  }

  const loadAllApprovals = async () => {
    setLoading(true)
    setError('')
    try {
      if (businesses.length === 0) {
        await fetchBusinesses()
      }
      const bizList = businesses.length > 0 ? businesses : await fetchBusinesses().then(() => businesses)
      const results: Approval[] = []

      await Promise.all(
        bizList.map(async (biz: Business) => {
          try {
            const res = await businessAPI.getApprovals(biz.business_id)
            const approvals = extractApprovalArray(res.data)
            results.push(...approvals)
          } catch {
            // Skip businesses where we can't load approvals
          }
        })
      )

      setAllApprovals(results)
    } catch (err: any) {
      setError('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (bizId: number, approvalId: number, dir: 0 | 1, requestedRole?: string) => {
    setError('')
    setSuccess('')
    setProcessingApproval(approvalId)
    try {
      await businessAPI.confirmApproval(bizId, { approval_id: approvalId, dir, ...(dir === 1 && requestedRole ? { role: requestedRole } : {}) })
      setSuccess(dir === 1 ? 'Approved!' : 'Rejected')
      loadAllApprovals()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to process request')
    } finally {
      setProcessingApproval(null)
    }
  }

  const getBusinessName = (bizId: number) => {
    const biz = businesses.find((b: Business) => b.business_id === bizId)
    return biz?.name || `Business #${bizId}`
  }

  const filteredApprovals = statusFilter === 'all'
    ? allApprovals
    : allApprovals.filter((a) => a.status === statusFilter)

  const counts = {
    all: allApprovals.length,
    pending: allApprovals.filter((a) => a.status === 'pending').length,
    approved: allApprovals.filter((a) => a.status === 'approved').length,
    rejected: allApprovals.filter((a) => a.status === 'rejected').length,
  }

  if (isLoading || !isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user && user.is_verified === false) {
    router.replace('/verify')
    return null
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
          <p className="text-sm text-neutral-light mt-1">View and manage all join requests across your businesses</p>
        </div>
        <button
          onClick={loadAllApprovals}
          disabled={loading}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 min-h-[44px]"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
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

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === filter
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
            <span className="ml-1.5 text-xs opacity-75">({counts[filter]})</span>
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neutral-light mt-3">Loading requests...</p>
          </div>
        ) : filteredApprovals.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {filteredApprovals.map((approval) => (
              <div key={approval.approval_id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {(approval.requester?.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{approval.requester?.name || 'Unknown'}</p>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusStyles[approval.status] || 'bg-gray-100 text-gray-500'}`}>
                          {approval.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-light mt-0.5">{approval.requester?.email}</p>
                      <p className="text-xs text-neutral-light">To: {getBusinessName(approval.business_id)}</p>
                      {approval.reason && (
                        <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{approval.reason}&rdquo;</p>
                      )}
                      <p className="text-[10px] text-neutral-light mt-1">Role: {approval.approval_type}</p>
                    </div>
                  </div>
                  {approval.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(approval.business_id, approval.approval_id, 1, approval.approval_type)}
                        disabled={processingApproval === approval.approval_id}
                        className="px-3 py-1.5 text-xs font-medium text-success bg-success-light rounded-lg hover:bg-success/10 transition-colors min-h-[36px] disabled:opacity-50"
                      >
                        {processingApproval === approval.approval_id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleApprove(approval.business_id, approval.approval_id, 0)}
                        disabled={processingApproval === approval.approval_id}
                        className="px-3 py-1.5 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors min-h-[36px] disabled:opacity-50"
                      >
                        {processingApproval === approval.approval_id ? '...' : 'Reject'}
                      </button>
                    </div>
                  )}
                  {approval.status === 'rejected' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(approval.business_id, approval.approval_id, 1, approval.approval_type)}
                        disabled={processingApproval === approval.approval_id}
                        className="px-3 py-1.5 text-xs font-medium text-success bg-success-light rounded-lg hover:bg-success/10 transition-colors min-h-[36px] disabled:opacity-50"
                      >
                        {processingApproval === approval.approval_id ? '...' : 'Re-approve'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No requests found</p>
            <p className="text-xs text-neutral-light">
              {statusFilter === 'all' ? 'There are no join requests across your businesses' : `No ${statusFilter} requests`}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
