'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { businessAPI } from '@/lib/api'

interface Business {
  business_id: number
  name: string
  is_active?: boolean
  members?: number
}

interface Approval {
  approval_id: number
  business_id: number
  reason: string
  approval_type: string
  status: string
  requester?: { user_id: number; name: string; email: string }
}

export default function BusinessesPage() {
  const { isAuthenticated, isLoading, profileLoaded, user, businesses, currentBusiness, switchBusiness, fetchBusinesses } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const [showJoin, setShowJoin] = useState(false)
  const [joinKey, setJoinKey] = useState('')
  const [joinReason, setJoinReason] = useState('')
  const [joinRole, setJoinRole] = useState('viewer')
  const [joining, setJoining] = useState(false)

  const [businessKeys, setBusinessKeys] = useState<Record<number, string>>({})
  const [approvals, setApprovals] = useState<Record<number, Approval[]>>({})
  const [loadingApprovals, setLoadingApprovals] = useState<Record<number, boolean>>({})
  const [approvalErrors, setApprovalErrors] = useState<Record<number, string>>({})
  const [showingApprovals, setShowingApprovals] = useState<Record<number, boolean>>({})
  const [processingApproval, setProcessingApproval] = useState<number | null>(null)

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
      setLoading(true)
      fetchBusinesses().finally(() => setLoading(false))
    }
  }, [isAuthenticated, fetchBusinesses])

  const loadBusinessKey = async (bizId: number) => {
    try {
      const res = await businessAPI.getBusinessKey(bizId)
      setBusinessKeys((prev) => ({ ...prev, [bizId]: res.data.business_key }))
    } catch {
      // Failed to load key
    }
  }

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

  const loadApprovals = async (bizId: number) => {
    setShowingApprovals((prev) => ({ ...prev, [bizId]: true }))
    setLoadingApprovals((prev) => ({ ...prev, [bizId]: true }))
    setApprovalErrors((prev) => ({ ...prev, [bizId]: '' }))
    try {
      let data: Approval[] = []
      try {
        const res = await businessAPI.getApprovals(bizId, 'pending')
        data = extractApprovalArray(res.data)
      } catch {
        const res = await businessAPI.getApprovals(bizId)
        data = extractApprovalArray(res.data)
      }
      setApprovals((prev) => ({ ...prev, [bizId]: data }))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : err.message || 'Failed to load requests'
      setApprovalErrors((prev) => ({ ...prev, [bizId]: msg }))
      setApprovals((prev) => ({ ...prev, [bizId]: [] }))
    } finally {
      setLoadingApprovals((prev) => ({ ...prev, [bizId]: false }))
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      const res = await businessAPI.create(newName.trim())
      const data = res.data
      const newBiz: Business = {
        business_id: data.business_id ?? data.id,
        name: data.name || newName.trim(),
        is_active: data.is_active,
      }
      setNewName('')
      setShowCreate(false)
      setSuccess('Business created successfully!')
      await fetchBusinesses()
      switchBusiness(newBiz)
      router.push(`/business/${newBiz.business_id}/dashboard`)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to create business')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinKey.trim()) return
    setJoining(true)
    setError('')
    setSuccess('')
    try {
      await businessAPI.sendApproval({
        business_key: joinKey.trim(),
        reason: joinReason.trim() || 'Request to join',
        role: joinRole,
      })
      setJoinKey('')
      setJoinReason('')
      setShowJoin(false)
      setSuccess('Join request sent! Waiting for approval.')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to send join request')
      }
    } finally {
      setJoining(false)
    }
  }

  const handleApprove = async (bizId: number, approvalId: number, dir: 0 | 1) => {
    setError('')
    setSuccess('')
    setProcessingApproval(approvalId)
    try {
      await businessAPI.confirmApproval(bizId, { approval_id: approvalId, dir })
      setSuccess(dir === 1 ? 'Approved!' : 'Rejected')
      loadApprovals(bizId)
      if (dir === 1) {
        await fetchBusinesses()
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to process approval')
    } finally {
      setProcessingApproval(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this business?')) return
    try {
      await businessAPI.delete(id)
      if (currentBusiness?.business_id === id && businesses.length > 1) {
        const remaining = businesses.find((b) => b.business_id !== id)
        if (remaining) {
          switchBusiness(remaining)
          router.push(`/business/${remaining.business_id}/dashboard`)
        }
      }
      setSuccess('Business deleted')
      await fetchBusinesses()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete business')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('Business key copied to clipboard!')
  }

  const handleEnterBusiness = (biz: Business) => {
    switchBusiness(biz)
    router.push(`/business/${biz.business_id}/dashboard`)
  }

  if (isLoading || !isAuthenticated || !profileLoaded) {
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
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-sm text-neutral-light mt-1">Manage your businesses and teams</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false) }}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Join
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false) }}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Business
          </button>
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

      {showCreate && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Business</h3>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Business name"
              required
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
            />
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {showJoin && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Join a Business</h3>
          <form onSubmit={handleJoin} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Key</label>
                <input
                  type="text"
                  value={joinKey}
                  onChange={(e) => setJoinKey(e.target.value)}
                  placeholder="Paste the business key here"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={joinRole}
                  onChange={(e) => setJoinRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white min-h-[44px]"
                >
                  <option value="viewer">Viewer</option>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={joinReason}
                onChange={(e) => setJoinReason(e.target.value)}
                placeholder="Why do you want to join?"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={joining}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {joining ? 'Sending...' : 'Send Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : businesses.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {businesses.map((biz) => {
              const isActive = currentBusiness?.business_id === biz.business_id
              return (
                <div key={biz.business_id} className={`p-5 ${isActive ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                        {biz.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{biz.name}</h3>
                          {isActive && (
                            <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-light">ID: #{biz.business_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEnterBusiness(biz)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors min-h-[36px]"
                      >
                        {isActive ? 'Enter' : 'Switch to'}
                      </button>
                      <button
                        onClick={() => loadBusinessKey(biz.business_id)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[36px]"
                        title="Get business key to share"
                      >
                        Get Key
                      </button>
                      <button
                        onClick={() => {
                          if (showingApprovals[biz.business_id]) {
                            setShowingApprovals((prev) => ({ ...prev, [biz.business_id]: false }))
                          } else {
                            loadApprovals(biz.business_id)
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[36px]"
                        title="View pending requests"
                      >
                        Requests {approvals[biz.business_id]?.length ? `(${approvals[biz.business_id].length})` : ''}
                      </button>
                      <button
                        onClick={() => handleDelete(biz.business_id)}
                        className="px-3 py-1.5 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors min-h-[36px]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {businessKeys[biz.business_id] && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs font-medium text-gray-500 mb-1">Business Key (share with members to join)</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-200 truncate">
                          {businessKeys[biz.business_id]}
                        </code>
                        <button
                          onClick={() => copyToClipboard(businessKeys[biz.business_id])}
                          className="px-3 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {showingApprovals[biz.business_id] && (
                    <>
                      {loadingApprovals[biz.business_id] ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-light">
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Loading requests...
                        </div>
                      ) : approvalErrors[biz.business_id] ? (
                        <div className="mt-3 text-xs text-danger bg-danger-light p-2 rounded-lg">
                          {approvalErrors[biz.business_id]}
                          <button
                            onClick={() => loadApprovals(biz.business_id)}
                            className="ml-2 underline hover:no-underline"
                          >
                            Retry
                          </button>
                        </div>
                      ) : approvals[biz.business_id] && approvals[biz.business_id].length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-500">Pending Requests</p>
                          {approvals[biz.business_id].map((approval) => (
                            <div key={approval.approval_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{approval.requester?.name || 'Unknown'}</p>
                                <p className="text-xs text-neutral-light">{approval.requester?.email} — {approval.reason}</p>
                                <p className="text-[10px] text-neutral-light mt-0.5">Role: {approval.approval_type}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(biz.business_id, approval.approval_id, 1)}
                                  disabled={processingApproval === approval.approval_id}
                                  className="px-3 py-1.5 text-xs font-medium text-success bg-success-light rounded-lg hover:bg-success/10 transition-colors min-h-[36px] disabled:opacity-50"
                                >
                                  {processingApproval === approval.approval_id ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleApprove(biz.business_id, approval.approval_id, 0)}
                                  disabled={processingApproval === approval.approval_id}
                                  className="px-3 py-1.5 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors min-h-[36px] disabled:opacity-50"
                                >
                                  {processingApproval === approval.approval_id ? '...' : 'Reject'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-neutral-light">No pending requests</div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No businesses yet</p>
            <p className="text-xs text-neutral-light mb-4">Create one or join an existing business to get started</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowJoin(true)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Join Business
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors min-h-[44px]"
              >
                Create Business
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
