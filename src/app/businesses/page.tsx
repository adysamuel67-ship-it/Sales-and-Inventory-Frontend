'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { businessAPI, adminAPI } from '@/lib/api'
import { isAdminRole, extractArray } from '@/lib/utils'

interface Business {
  business_id: number
  name: string
  is_active?: boolean
  members?: number
  role?: string
}

interface Member {
  member_id: number
  user_id: number
  name: string
  email: string
  role: string
  is_active?: boolean
  is_verified?: boolean
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
  const isUnverified = user?.is_verified === false

  // Members per business
  const [membersByBiz, setMembersByBiz] = useState<Record<number, Member[]>>({})
  const [membersLoadingBiz, setMembersLoadingBiz] = useState<Record<number, boolean>>({})
  const [membersLoaded, setMembersLoaded] = useState<Set<number>>(new Set())
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [memberSaving, setMemberSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && isUnverified) {
      router.replace('/verify')
    }
  }, [profileLoaded, isAuthenticated, isUnverified, router])

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true)
      fetchBusinesses().finally(() => setLoading(false))
    }
  }, [isAuthenticated, fetchBusinesses])

  const loadMembers = useCallback(async (bizId: number, force = false) => {
    if (!force && membersLoaded.has(bizId)) return
    setMembersLoaded(prev => force ? prev : new Set(prev).add(bizId))
    setMembersLoadingBiz(prev => ({ ...prev, [bizId]: true }))
    try {
      let list: any[] = []

      try {
        const bizRes = await businessAPI.get(bizId)
        const bizData = bizRes.data?.data || bizRes.data
        const bizObj = bizData?.data || bizData
        if (Array.isArray(bizObj?.members)) {
          list = bizObj.members
        } else if (Array.isArray(bizObj?.users)) {
          list = bizObj.users
        } else if (Array.isArray(bizData?.members)) {
          list = bizData.members
        }
      } catch {}

      if (list.length === 0) {
        try {
          const allUsersRes = await adminAPI.listAllUsers()
          list = extractArray(allUsersRes.data).filter((u: any) => {
            const ubizId = u.business_id ?? u.business?.business_id
            return ubizId != null && Number(ubizId) === bizId
          })
        } catch {
          try {
            const memberRes = await adminAPI.listMembers()
            list = extractArray(memberRes.data).filter((m: any) => {
              return m.business_id != null && Number(m.business_id) === bizId
            })
          } catch {
            list = []
          }
        }
      }

      const mapped: Member[] = list.map((m: any) => ({
        member_id: m.member_id ?? m.user_id ?? m.id,
        user_id: m.user_id ?? m.id,
        name: m.name || m.user?.name || m.full_name || 'Unknown',
        email: m.email || m.user?.email || '',
        role: m.role || m.business_role || 'user',
        is_active: m.is_active ?? true,
        is_verified: m.is_verified ?? m.user?.is_verified ?? false,
      }))

      setMembersByBiz(prev => ({ ...prev, [bizId]: mapped }))
    } catch {
      setMembersByBiz(prev => ({ ...prev, [bizId]: [] }))
    } finally {
      setMembersLoadingBiz(prev => ({ ...prev, [bizId]: false }))
    }
  }, [membersLoaded])

  useEffect(() => {
    if (businesses.length > 0) {
      businesses.forEach((b) => loadMembers(b.business_id))
    }
  }, [businesses, loadMembers])

  const canManageBiz = (biz: Business) =>
    isAdminRole(biz.role) || isAdminRole(user?.business_role) || isAdminRole(user?.role)

  const memberKey = (bizId: number, userId: number) => `${bizId}:${userId}`

  const toggleMember = (bizId: number, userId: number) => {
    const key = memberKey(bizId, userId)
    setExpandedMember(prev => (prev === key ? null : key))
    setEditingMember(null)
    setConfirmRemoveId(null)
    setConfirmToggleId(null)
  }

  const startEdit = (bizId: number, m: Member) => {
    setEditingMember(memberKey(bizId, m.user_id))
    setEditRole(m.role || 'viewer')
    setEditActive(m.is_active !== false)
    setConfirmRemoveId(null)
    setConfirmToggleId(null)
  }

  const handleUpdateMember = async (bizId: number, memberId: number, userId: number) => {
    setMemberSaving(true)
    setError('')
    setSuccess('')
    try {
      await businessAPI.updateMember(bizId, memberId, { role: editRole, is_active: editActive })
      setSuccess('Member updated!')
      setEditingMember(null)
      await loadMembersForce(bizId)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to update member')
    } finally {
      setMemberSaving(false)
    }
  }

  const loadMembersForce = async (bizId: number) => {
    await loadMembers(bizId, true)
  }

  const handleRemoveMember = async (bizId: number, member: Member) => {
    setRemovingId(memberKey(bizId, member.user_id))
    setError('')
    setSuccess('')
    try {
      await businessAPI.removeMember(bizId, member.member_id)
      setSuccess(`${member.name} removed from business`)
      setConfirmRemoveId(null)
      setExpandedMember(null)
      await loadMembersForce(bizId)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to remove member')
    } finally {
      setRemovingId(null)
    }
  }

  const handleToggleActive = async (bizId: number, member: Member) => {
    setTogglingId(memberKey(bizId, member.user_id))
    setError('')
    setSuccess('')
    try {
      const nextActive = member.is_active === false
      await businessAPI.updateMember(bizId, member.member_id, { is_active: nextActive })
      setSuccess(nextActive ? `${member.name} activated` : `${member.name} deactivated`)
      setConfirmToggleId(null)
      await loadMembersForce(bizId)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to update member')
    } finally {
      setTogglingId(null)
    }
  }

  const loadBusinessKey = async (bizId: number) => {
    try {
      const res = await businessAPI.getBusinessKey(bizId)
      setBusinessKeys((prev) => ({ ...prev, [bizId]: res.data.business_key }))
    } catch {
      // Failed to load key
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

  if (user && user.is_verified === false) {
    router.replace('/verify')
    return null
  }

  const roleBadgeClass = (role: string) => {
    if (role === 'admin' || role === 'owner') return 'bg-purple-100 text-purple-700'
    if (role === 'manager') return 'bg-primary/10 text-primary'
    if (role === 'cashier') return 'bg-emerald-100 text-emerald-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-sm text-neutral-light mt-1">Manage your businesses and teams</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/businesses/requests')}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Requests
          </button>
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
        <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Business</h3>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Business name"
              required
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
            />
            <div className="flex gap-2 sm:gap-3 shrink-0">
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
            </div>
          </form>
        </div>
      )}

      {showJoin && (
        <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
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
            <div className="flex flex-wrap gap-3">
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

      <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : businesses.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {businesses.map((biz) => {
              const isActive = currentBusiness?.business_id === biz.business_id
              const canManage = canManageBiz(biz)
              const bizMembers = membersByBiz[biz.business_id] || []
              const membersLoading = membersLoadingBiz[biz.business_id] || false
              return (
                <div key={biz.business_id} className={`p-4 sm:p-5 ${isActive ? 'bg-primary/5' : ''}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${isActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
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
                    <div className="flex flex-wrap items-center gap-2">
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
                        onClick={() => router.push('/businesses/requests')}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[36px]"
                        title="View all requests"
                      >
                        Requests
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
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <code className="flex-1 text-sm text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-300 truncate">
                          {businessKeys[biz.business_id]}
                        </code>
                        <button
                          onClick={() => copyToClipboard(businessKeys[biz.business_id])}
                          className="px-3 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors shrink-0 min-h-[36px]"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Members */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-neutral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87" />
                        <path d="M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      <h4 className="text-sm font-semibold text-gray-900">Members</h4>
                      {bizMembers.length > 0 && (
                        <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {bizMembers.length}
                        </span>
                      )}
                    </div>

                    {membersLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="skeleton h-14 rounded-xl" />
                        ))}
                      </div>
                    ) : bizMembers.length > 0 ? (
                      <div className="space-y-2">
                        {bizMembers.map((m) => {
                          const key = memberKey(biz.business_id, m.user_id)
                          const isExpanded = expandedMember === key
                          const isEditing = editingMember === key
                          const isSelf = m.user_id === user?.id
                          return (
                            <div
                              key={key}
                              className="bg-surfaceAlt rounded-xl overflow-hidden"
                            >
                              <div
                                onClick={() => toggleMember(biz.business_id, m.user_id)}
                                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : ''}`}
                              >
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                                  {m.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {m.name} {isSelf && <span className="text-xs font-normal text-neutral-light">(you)</span>}
                                  </p>
                                  <p className="text-xs text-neutral-light truncate">{m.email || 'No email'}</p>
                                </div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize shrink-0 ${roleBadgeClass(m.role)}`}>
                                  {m.role}
                                </span>
                                <svg className={`w-4 h-4 text-neutral-light shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>

                              {isExpanded && (
                                <div className="px-3 pb-3">
                                  {isEditing && canManage ? (
                                    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                                        <span className="text-xs text-neutral-light">({m.email})</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <select
                                          value={editRole}
                                          onChange={(e) => setEditRole(e.target.value)}
                                          className="px-3 py-2 rounded-lg border border-gray-300 text-sm min-h-[40px] bg-white focus:border-primary focus:outline-none"
                                        >
                                          <option value="admin">Admin</option>
                                          <option value="manager">Manager</option>
                                          <option value="cashier">Cashier</option>
                                          <option value="viewer">Viewer</option>
                                        </select>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                                          <input
                                            type="checkbox"
                                            checked={editActive}
                                            onChange={(e) => setEditActive(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                          />
                                          Active
                                        </label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleUpdateMember(biz.business_id, m.member_id, m.user_id)}
                                          disabled={memberSaving}
                                          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[40px]"
                                        >
                                          {memberSaving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                          onClick={() => setEditingMember(null)}
                                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors min-h-[40px]"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2">
                                      {confirmRemoveId === key ? (
                                        <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-red-200 p-3">
                                          <p className="text-xs text-gray-700 flex-1 min-w-[140px]">
                                            Remove <strong>{m.name}</strong> from this business?
                                          </p>
                                          <button
                                            onClick={() => {
                                              if (m.user_id != null) handleRemoveMember(biz.business_id, m)
                                            }}
                                            disabled={removingId === key}
                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-60 min-h-[36px]"
                                          >
                                            {removingId === key ? '...' : 'Confirm'}
                                          </button>
                                          <button
                                            onClick={() => setConfirmRemoveId(null)}
                                            disabled={removingId === key}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors min-h-[36px]"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : confirmToggleId === key ? (
                                        <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-amber-200 p-3">
                                          <p className="text-xs text-gray-700 flex-1 min-w-[140px]">
                                            {m.is_active === false ? 'Activate' : 'Deactivate'} <strong>{m.name}</strong>?
                                          </p>
                                          <button
                                            onClick={() => handleToggleActive(biz.business_id, m)}
                                            disabled={togglingId === key}
                                            className={`px-3 py-1.5 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-60 min-h-[36px] ${
                                              m.is_active === false ? 'bg-success hover:bg-green-700' : 'bg-warning hover:bg-amber-700'
                                            }`}
                                          >
                                            {togglingId === key ? '...' : m.is_active === false ? 'Yes, Activate' : 'Yes, Deactivate'}
                                          </button>
                                          <button
                                            onClick={() => setConfirmToggleId(null)}
                                            disabled={togglingId === key}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors min-h-[36px]"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : canManage && !isSelf ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                          <button
                                            onClick={() => startEdit(biz.business_id, m)}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors min-h-[36px]"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => setConfirmToggleId(key)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors min-h-[36px] ${
                                              m.is_active === false
                                                ? 'text-success bg-success-light border-success/20 hover:bg-success/10'
                                                : 'text-warning bg-warning-light border-warning/20 hover:bg-warning/10'
                                            }`}
                                          >
                                            {m.is_active === false ? 'Activate' : 'Deactivate'}
                                          </button>
                                          <button
                                            onClick={() => setConfirmRemoveId(key)}
                                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors min-h-[36px]"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="bg-white rounded-xl border border-gray-200 p-3 text-xs text-neutral-light">
                                          {isSelf
                                            ? 'This is you — you can manage this member from your business settings.'
                                            : 'You do not have permission to manage this member.'}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-light bg-surfaceAlt rounded-xl p-3">
                        Members could not be loaded for this business.
                      </p>
                    )}
                  </div>
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

            <div className="max-w-sm mx-auto mb-6 bg-primary/5 border border-primary/10 rounded-2xl p-5 text-left">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Getting Started</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Create a business</p>
                    <p className="text-xs text-neutral-light">Set up your store, inventory, and team</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Add products</p>
                    <p className="text-xs text-neutral-light">Stock your inventory with items to sell</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Record sales</p>
                    <p className="text-xs text-neutral-light">Track every transaction and payment</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
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