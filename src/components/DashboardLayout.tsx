'use client'

import { useAuth } from '@/lib/auth'
import { useState, useRef, useEffect, useMemo } from 'react'
import { usePathname, useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { isManagerRole, isPlatformAdmin, isSuperAdminUser } from '@/lib/utils'
import { businessAPI } from '@/lib/api'
import BusinessBotLogo from './BusinessBotLogo'

interface DashboardLayoutProps {
  children: React.ReactNode
  businessId?: string
}

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    dashboard: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="4" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    sales: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    products: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    customers: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    debts: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),

    reports: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    settings: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
    admin: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    'admin-users': (
      <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
    'admin-businesses': (
      <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    'admin-low-stock': (
      <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    'admin-jobs': (
      <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    'admin-keys': (
      <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    requests: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  }
  return icons[name] || <div className="w-[18px] h-[18px]" />
}

export default function DashboardLayout({ children, businessId: propBusinessId }: DashboardLayoutProps) {
  const { user, logout, businesses, currentBusiness, switchBusiness, profileLoaded } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()

  const businessId = propBusinessId || (params?.id as string) || currentBusiness?.business_id?.toString() || ''

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false)
  const [bizSwitcherOpen, setBizSwitcherOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [selectedApproval, setSelectedApproval] = useState<any>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const sidebarProfileRef = useRef<HTMLDivElement>(null)
  const bizSwitcherRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (profileLoaded && user && user.is_verified === false) {
      router.replace('/verify')
    }
  }, [profileLoaded, user, router])

  const isSuperAdmin = isSuperAdminUser(user)
  const isPlatformAdminUser = isPlatformAdmin(user)
  const effectiveRole = user?.business_role || user?.role
  const isManager = isManagerRole(effectiveRole)
  const bizBase = businessId ? `/business/${businessId}` : ''

  const normalNavItems = useMemo(() => [
    { label: 'Dashboard', icon: 'dashboard', href: `${bizBase}/dashboard`, id: 'dashboard', group: 'main' },
    { label: 'Sales', icon: 'sales', href: `${bizBase}/sales`, id: 'sales', group: 'main' },
    { label: 'Products', icon: 'products', href: `${bizBase}/products`, id: 'products', group: 'main' },
    { label: 'Customers', icon: 'customers', href: `${bizBase}/customers`, id: 'customers', group: 'management' },
    { label: 'Debts', icon: 'debts', href: `${bizBase}/debts`, id: 'debts', group: 'management' },
    { label: 'Reports', icon: 'reports', href: `${bizBase}/reports`, id: 'reports', group: 'admin', ownerOnly: true },
    { label: 'Businesses', icon: 'admin-businesses', href: '/businesses', id: 'businesses-nav', group: 'account' },
    { label: 'Settings', icon: 'settings', href: `${bizBase}/settings`, id: 'settings', group: 'account' },
  ], [bizBase])

  const visibleNavItems = useMemo(
    () => normalNavItems.filter((item) => {
      if (item.ownerOnly && isManager) return true
      if (item.ownerOnly && !isManager) return false
      return true
    }),
    [normalNavItems, isManager]
  )

  const navGroups = useMemo(() => {
    const groups: { label: string; items: typeof visibleNavItems }[] = []
    const mainItems = visibleNavItems.filter(i => i.group === 'main')
    const mgmtItems = visibleNavItems.filter(i => i.group === 'management')
    const adminItems = visibleNavItems.filter(i => i.group === 'admin')
    const acctItems = visibleNavItems.filter(i => i.group === 'account')
    if (mainItems.length) groups.push({ label: 'Overview', items: mainItems })
    if (mgmtItems.length) groups.push({ label: 'Manage', items: mgmtItems })
    if (adminItems.length) groups.push({ label: 'Administration', items: adminItems })
    if (acctItems.length) groups.push({ label: 'Account', items: acctItems })
    return groups
  }, [visibleNavItems])

  const adminSubItems = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { label: 'Overview', icon: 'admin', href: '/admin', id: 'admin' },
        { label: 'Users', icon: 'admin-users', href: '/admin/users', id: 'admin-users' },
        { label: 'Businesses', icon: 'admin-businesses', href: '/admin/businesses', id: 'admin-businesses' },
        { label: 'Business Keys', icon: 'admin-keys', href: '/admin/keys', id: 'admin-keys' },
        { label: 'Low Stock', icon: 'admin-low-stock', href: '/admin/low-stock', id: 'admin-low-stock' },
        { label: 'Jobs', icon: 'admin-jobs', href: '/admin/jobs', id: 'admin-jobs' },
      ]
    }
    return [
      { label: 'Overview', icon: 'admin', href: '/admin', id: 'admin' },
      { label: 'Members', icon: 'admin-users', href: '/admin/members', id: 'admin-members' },
    ]
  }, [isSuperAdmin])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
      if (sidebarProfileRef.current && !sidebarProfileRef.current.contains(e.target as Node)) {
        setSidebarProfileOpen(false)
      }
      if (bizSwitcherRef.current && !bizSwitcherRef.current.contains(e.target as Node)) {
        setBizSwitcherOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitchBusiness = (biz: typeof currentBusiness) => {
    if (biz) {
      switchBusiness(biz)
      setBizSwitcherOpen(false)
      router.push(`/business/${biz.business_id}/dashboard`)
    }
  }

  useEffect(() => {
    if (!businessId || !isManager) return
    let cancelled = false
    const loadPending = async () => {
      try {
        const res = await businessAPI.getApprovals(Number(businessId), 'pending')
        if (cancelled) return
        const data = res.data
        const arr = Array.isArray(data) ? data
          : Array.isArray(data?.approvals) ? data.approvals
          : Array.isArray(data?.data) ? data.data
          : Array.isArray(data?.data?.approvals) ? data.data.approvals
          : []
        setPendingApprovals(arr)
      } catch {
        if (!cancelled) setPendingApprovals([])
      }
    }
    loadPending()
    const interval = setInterval(loadPending, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [businessId, isManager])

  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (user && user.is_verified === false) return null

  const isNavItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-30 h-full w-[260px] dashboard-sidebar transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <BusinessBotLogo size={36} />
              </div>
              <div>
                <p className="text-white font-semibold text-[13px] tracking-tight">Business Bot</p>
                <p className="text-white/35 text-[11px]">Sales & Inventory</p>
              </div>
            </div>
          </div>

          {/* Business Switcher */}
          {currentBusiness && (
            <div className="px-3 pt-4 pb-1">
              <div ref={bizSwitcherRef} className="relative">
                <button
                  onClick={() => setBizSwitcherOpen(!bizSwitcherOpen)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.05] rounded-xl hover:bg-white/[0.1] transition-colors cursor-pointer border border-white/[0.05]"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                    {currentBusiness.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white text-[13px] font-medium truncate">{currentBusiness.name}</p>
                    {businesses.length > 1 && (
                      <p className="text-white/35 text-[10px]">{businesses.length} businesses</p>
                    )}
                  </div>
                  <svg className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${bizSwitcherOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {bizSwitcherOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 max-h-64 overflow-y-auto">
                    <p className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Switch Business</p>
                    {businesses.map((biz) => (
                      <button
                        key={biz.business_id}
                        onClick={() => handleSwitchBusiness(biz)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-gray-50 transition-colors ${
                          currentBusiness.business_id === biz.business_id ? 'bg-blue-50/80' : ''
                        }`}
                      >
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center text-primary text-[11px] font-bold shrink-0 border border-blue-100">
                          {biz.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-left truncate text-gray-700 font-medium">{biz.name}</span>
                        {currentBusiness.business_id === biz.business_id && (
                          <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <Link
                        href="/businesses"
                        onClick={() => setBizSwitcherOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-primary font-medium hover:bg-blue-50/50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create / Join Business
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notification Bell */}
          {isManager && (
            <div className="px-3 pb-2">
              <div ref={notificationsRef} className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 min-h-[40px] group text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                >
                  <span className="text-white/35 group-hover:text-white/55">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </span>
                  <span className="flex-1 text-left">Notifications</span>
                  {pendingApprovals.length > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold leading-none">
                      {pendingApprovals.length}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Requests {pendingApprovals.length > 0 && <span className="text-primary">({pendingApprovals.length})</span>}
                      </h3>
                      {pendingApprovals.length > 0 && (
                        <Link
                          href="/businesses/requests"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          View all
                        </Link>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {pendingApprovals.length > 0 ? (
                        pendingApprovals.map((approval: any, idx: number) => {
                          const requesterName = approval.requester?.name || approval.requester_name || approval.name || 'Unknown'
                          const requesterEmail = approval.requester?.email || approval.email || ''
                          const role = approval.approval_type || approval.role || 'member'
                          const reason = approval.reason || ''
                          return (
                            <button
                              key={approval.approval_id || approval.id || idx}
                              onClick={() => { setSelectedApproval(approval); setNotificationsOpen(false) }}
                              className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-semibold text-primary">{requesterName.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">{requesterName}</p>
                                  <p className="text-xs text-gray-400 truncate">{requesterEmail}</p>
                                </div>
                                <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                                  {role}
                                </span>
                              </div>
                              {reason && (
                                <p className="text-xs text-gray-400 mt-1.5 ml-11 line-clamp-2">{reason}</p>
                              )}
                            </button>
                          )
                        })
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                          </svg>
                          <p className="text-sm text-gray-500">No pending requests</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
            {!businessId && (
              <div className="mx-1 mb-1 p-3.5 rounded-xl bg-white/[0.08] border border-white/[0.1]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">Welcome!</p>
                </div>
                <p className="text-[11px] text-white/45 leading-relaxed mb-2.5">
                  You haven&apos;t set up a business yet. Create or join one to unlock all features.
                </p>
                <Link
                  href="/businesses"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/10 hover:bg-white/15 rounded-lg text-[11px] font-medium text-white/80 hover:text-white transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Get Started
                </Link>
              </div>
            )}
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">{group.label}</p>
                <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = isNavItemActive(item.href)
                  const needsBusiness = item.href.startsWith('/business/')
                  const disabled = needsBusiness && !businessId
                  return (
                    <Link
                      key={item.id}
                      href={disabled ? '#' : item.href}
                      onClick={(e) => {
                        if (disabled) e.preventDefault()
                        setSidebarOpen(false)
                      }}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 min-h-[40px] group ${
                        disabled
                          ? 'opacity-30 pointer-events-none'
                          : isActive
                            ? 'bg-white/[0.13] text-white font-medium shadow-sm shadow-black/10'
                            : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full shadow-sm shadow-white/30" />
                      )}
                      <span className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/35 group-hover:text-white/55'}`}>
                        <NavIcon name={item.icon} />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      )}
                    </Link>
                  )
                })}
                </div>
              </div>
            ))}

            {isPlatformAdminUser && (
              <div>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">Admin</p>
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 min-h-[40px] group ${
                    pathname.startsWith('/admin')
                      ? 'bg-white/[0.13] text-white font-medium shadow-sm shadow-black/10'
                      : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                  }`}
                >
                  {pathname.startsWith('/admin') && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full shadow-sm shadow-white/30" />
                  )}
                  <span className={`transition-colors duration-200 ${pathname.startsWith('/admin') ? 'text-white' : 'text-white/35 group-hover:text-white/55'}`}>
                    <NavIcon name="admin" />
                  </span>
                  <span className="flex-1 text-left">Admin Panel</span>
                  <svg
                    className={`w-3.5 h-3.5 text-white/25 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {adminOpen && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l border-white/[0.06] pl-3">
                    {adminSubItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all duration-200 min-h-[36px] ${
                            isActive
                              ? 'bg-white/[0.08] text-white font-medium'
                              : 'text-white/35 hover:bg-white/[0.05] hover:text-white/65'
                          }`}
                        >
                          <NavIcon name={item.icon} />
                          <span className="flex-1">{item.label}</span>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Profile */}
          <div className="p-3 border-t border-white/[0.06]">
            <div ref={sidebarProfileRef} className="relative">
              <button
                onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer min-h-[44px] group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 ring-2 ring-white/10">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white text-[13px] font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-white/30 text-[11px] capitalize">{(user?.business_role || user?.role || 'user').replace('_', ' ')}</p>
                </div>
                <svg className={`w-3.5 h-3.5 text-white/25 transition-transform duration-200 ${sidebarProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {sidebarProfileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 mx-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                  <div className="px-3.5 py-2.5 border-b border-gray-100">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-primary px-2 py-0.5 rounded-md">
                        {(user?.business_role || user?.role || 'user').replace('_', ' ')}
                      </span>
                      {user?.is_verified ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md">Unverified</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setSidebarProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors min-h-[40px]"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>
                  <button
                    onClick={() => { setSidebarProfileOpen(false); logout() }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors min-h-[40px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
          <div className="flex items-center justify-between px-4 sm:px-6 h-[60px]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-[17px] font-bold text-gray-900 lg:hidden">
                {visibleNavItems.find((item) => isNavItemActive(item.href))?.label || 'Dashboard'}
              </h1>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {selectedApproval && (() => {
        const a = selectedApproval
        const name = a.requester?.name || a.requester_name || a.name || 'Unknown'
        const email = a.requester?.email || a.email || ''
        const phone = a.requester?.phone || a.phone || ''
        const role = a.approval_type || a.role || 'member'
        const reason = a.reason || ''
        const status = a.status || 'pending'
        const createdAt = a.created_at || a.sent_at || ''
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedApproval(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-br from-primary to-primary-dark">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white text-lg sm:text-xl font-bold shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{name}</h3>
                    <p className="text-white/70 text-sm">{email}</p>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surfaceAlt rounded-xl p-3">
                    <p className="text-[10px] text-neutral-light uppercase tracking-wider mb-1">Requested Role</p>
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">{role}</span>
                  </div>
                  <div className="bg-surfaceAlt rounded-xl p-3">
                    <p className="text-[10px] text-neutral-light uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      status === 'pending' ? 'bg-warning-light text-warning'
                        : status === 'approved' ? 'bg-success-light text-success'
                        : 'bg-danger-light text-danger'
                    }`}>{status}</span>
                  </div>
                </div>

                {phone && (
                  <div className="flex items-center gap-3 text-sm bg-surfaceAlt rounded-xl p-3">
                    <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <span className="text-gray-700">{phone}</span>
                  </div>
                )}

                {reason && (
                  <div className="bg-surfaceAlt rounded-xl p-3">
                    <p className="text-[10px] text-neutral-light uppercase tracking-wider mb-1">Reason</p>
                    <p className="text-sm text-gray-700">{reason}</p>
                  </div>
                )}

                {createdAt && (
                  <div className="flex items-center gap-2 text-xs text-neutral-light">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span>Requested {new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex items-center gap-3">
                <Link
                  href="/businesses/requests"
                  onClick={() => setSelectedApproval(null)}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors text-center"
                >
                  Review Request
                </Link>
                <button
                  onClick={() => setSelectedApproval(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
