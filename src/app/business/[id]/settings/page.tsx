'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { businessAPI, adminAPI } from '@/lib/api'
import { isAdminRole, isSuperAdminUser, parseApiError, extractArray } from '@/lib/utils'

export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const businessId = parseInt(params?.id as string)
  const { user, currentBusiness, fetchBusinesses } = useAuth()
  const [name, setName] = useState('')
  const [businessKey, setBusinessKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const [members, setMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [editingMember, setEditingMember] = useState<number | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [memberSaving, setMemberSaving] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)

  const isOwner = isSuperAdminUser(user) || isAdminRole(user?.business_role || user?.role)

  const loadSettings = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const [bizRes, keyRes] = await Promise.allSettled([
        businessAPI.get(businessId),
        businessAPI.getBusinessKey(businessId),
      ])

      if (bizRes.status === 'fulfilled') {
        const data = bizRes.value.data?.data || bizRes.value.data
        setName(data?.name || currentBusiness?.name || '')
      } else {
        setName(currentBusiness?.name || '')
      }

      if (keyRes.status === 'fulfilled') {
        const data = keyRes.value.data?.data || keyRes.value.data
        setBusinessKey(data?.business_key || data?.key || '')
      }
    } catch {
      setError('Failed to load business settings')
    } finally {
      setLoading(false)
    }
  }, [businessId, currentBusiness?.name])

  useEffect(() => {
    if (businessId) loadSettings()
  }, [businessId, loadSettings])

  const loadMembers = useCallback(async () => {
    if (!businessId) return
    setMembersLoading(true)
    try {
      let memberList: any[] = []

      try {
        const bizRes = await businessAPI.get(businessId)
        const bizData = bizRes.data?.data || bizRes.data
        const bizObj = bizData?.data || bizData
        if (Array.isArray(bizObj?.members)) {
          memberList = bizObj.members
        } else if (Array.isArray(bizObj?.users)) {
          memberList = bizObj.users
        } else if (Array.isArray(bizData?.members)) {
          memberList = bizData.members
        }
      } catch {}

      if (memberList.length === 0) {
        try {
          const allUsersRes = await adminAPI.listAllUsers()
          const allUsers = extractArray(allUsersRes.data)
          memberList = allUsers.filter((u: any) => {
            const ubizId = u.business_id ?? u.business?.business_id
            return ubizId != null && Number(ubizId) === businessId
          })
        } catch {
          try {
            const memberRes = await adminAPI.listMembers()
            const allMembers = extractArray(memberRes.data)
            memberList = allMembers.filter((m: any) => {
              return m.business_id != null && Number(m.business_id) === businessId
            })
          } catch {
            memberList = []
          }
        }
      }

      setMembers(memberList.map((m: any) => ({
        member_id: m.member_id ?? m.user_id ?? m.id,
        user_id: m.user_id ?? m.id,
        name: m.name || m.user?.name || '',
        email: m.email || m.user?.email || '',
        role: m.role || m.business_role || 'user',
        is_verified: m.is_verified ?? m.user?.is_verified ?? false,
        is_active: m.is_active ?? true,
        business_id: m.business_id ?? businessId,
      })))
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setMembersLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    if (businessId && isOwner) loadMembers()
  }, [businessId, isOwner, loadMembers])

  const handleUpdateMember = async (memberId: number) => {
    setMemberSaving(true)
    setError('')
    setSuccess('')
    try {
      await businessAPI.updateMember(businessId, memberId, { role: editRole, is_active: editActive })
      setSuccess('Member updated!')
      setEditingMember(null)
      loadMembers()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setMemberSaving(false)
    }
  }

  const handleRemoveMember = async (memberId: number) => {
    setRemovingMemberId(memberId)
    setError('')
    setSuccess('')
    try {
      await businessAPI.removeMember(businessId, memberId)
      setSuccess('Member removed from business')
      setConfirmRemoveId(null)
      loadMembers()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !name.trim()) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await businessAPI.update(businessId, { name: name.trim() })
      setSuccess('Business name updated!')
      fetchBusinesses()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to update business')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCopyKey = async () => {
    if (!businessKey) return
    try {
      await navigator.clipboard.writeText(businessKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = businessKey
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDelete = async () => {
    if (!businessId || deleteInput !== name.trim()) return
    setDeleting(true)
    setError('')
    try {
      await businessAPI.delete(businessId)
      localStorage.removeItem('current_business_id')
      await fetchBusinesses()
      router.replace('/businesses')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to delete business')
      }
      setDeleting(false)
    }
  }

  const handleLeave = async () => {
    if (!businessId) return
    setLeaving(true)
    setError('')
    try {
      await businessAPI.leave(businessId)
      localStorage.removeItem('current_business_id')
      fetchBusinesses()
      router.replace('/businesses')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to leave business')
      }
      setLeaving(false)
      setShowLeaveConfirm(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-xs sm:text-sm text-neutral-light mt-1">Manage your business settings</p>
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

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
      ) : (
        <>
          {isOwner && (
            <form onSubmit={handleSave} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-4">
              <h3 className="font-semibold text-gray-900 mb-4">Business Name</h3>
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Business name"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px] shrink-0"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {isOwner && (
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-4">
              <h3 className="font-semibold text-gray-900 mb-1">Business Key</h3>
              <p className="text-xs text-neutral-light mb-4">Share this key with team members so they can request to join.</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-sm text-gray-700 truncate">
                  {businessKey || 'No key available'}
                </div>
                {businessKey && (
                  <button
                    onClick={handleCopyKey}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px] shrink-0 flex items-center justify-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {isOwner && (
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Team Members</h3>
                  <p className="text-xs text-neutral-light mt-0.5">Manage roles and access for team members</p>
                </div>
              </div>
              {membersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((m: any) => (
                    <div key={m.member_id} className="flex items-center justify-between py-3 px-4 bg-surfaceAlt rounded-xl">
                      {editingMember === m.member_id ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{m.name}</p>
                            <p className="text-xs text-neutral-light">{m.email}</p>
                          </div>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm min-h-[40px]"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="cashier">Cashier</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={editActive}
                              onChange={(e) => setEditActive(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            Active
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateMember(m.member_id)}
                              disabled={memberSaving}
                              className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[40px]"
                            >
                              {memberSaving ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingMember(null)}
                              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors min-h-[40px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : m.role === 'manager' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                              {m.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                              <p className="text-xs text-neutral-light truncate">{m.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              m.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              m.role === 'manager' ? 'bg-primary/10 text-primary' :
                              m.role === 'cashier' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {m.role}
                            </span>
                            {m.user_id !== user?.id && (
                              <>
                                {confirmRemoveId === m.user_id ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleRemoveMember(m.user_id)}
                                      disabled={removingMemberId === m.user_id}
                                      className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-60 min-h-[32px]"
                                    >
                                      {removingMemberId === m.user_id ? '...' : 'Confirm'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmRemoveId(null)}
                                      disabled={removingMemberId === m.user_id}
                                      className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors min-h-[32px]"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingMember(m.member_id)
                                        setEditRole(m.role || 'viewer')
                                        setEditActive(m.is_active !== false)
                                      }}
                                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => setConfirmRemoveId(m.user_id)}
                                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-light text-center py-4">No members found</p>
              )}
            </div>
          )}

          {/* Leave Business — visible to ALL members */}
          <div className="bg-surface rounded-2xl border border-amber-200 shadow-sm p-4 sm:p-6 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">Leave Business</h3>
                <p className="text-xs text-neutral-light mb-3">
                  You will lose access to this business and all its data. You can request to rejoin later using the business key.
                </p>
                {isOwner && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    You are the owner. Leaving will transfer ownership or close the business.
                  </p>
                )}
                {!showLeaveConfirm ? (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors min-h-[44px]"
                  >
                    Leave Business
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800 font-medium mb-3">
                      Are you sure you want to leave <strong>{currentBusiness?.name || 'this business'}</strong>?
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={handleLeave}
                        disabled={leaving}
                        className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-60 min-h-[44px] flex items-center gap-2"
                      >
                        {leaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Leaving...
                          </>
                        ) : (
                          'Yes, Leave'
                        )}
                      </button>
                      <button
                        onClick={() => setShowLeaveConfirm(false)}
                        disabled={leaving}
                        className="px-4 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delete Business — owner only */}
          {isOwner && (
            <div className="bg-surface rounded-2xl border border-danger/20 shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold text-danger mb-1">Danger Zone</h3>
              <p className="text-xs text-neutral-light mb-4">
                Permanently delete this business and all its data. This action cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 bg-danger-light text-danger rounded-xl text-sm font-semibold hover:bg-danger/20 transition-colors min-h-[44px]"
                >
                  Delete Business
                </button>
              ) : (
                <div className="bg-danger-light/50 rounded-xl p-4">
                  <p className="text-xs text-danger font-medium mb-2">
                    Type <span className="font-bold">&quot;{name.trim()}&quot;</span> to confirm deletion:
                  </p>
                  <div className="flex flex-col sm:flex-row items-end gap-3">
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Enter business name"
                      className="w-full px-4 py-3 rounded-xl border border-danger/30 text-sm focus:border-danger focus:ring-2 focus:ring-danger/20 outline-none transition-all bg-white min-h-[44px]"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleDelete}
                        disabled={deleteInput !== name.trim() || deleting}
                        className="px-5 py-3 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 min-h-[44px]"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
                        disabled={deleting}
                        className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
