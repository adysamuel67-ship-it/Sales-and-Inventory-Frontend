'use client'

import { useAuth } from '@/lib/auth'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { usePathname, useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { isManagerRole, isPlatformAdmin, isSuperAdminUser, isNewAccount } from '@/lib/utils'
import {
  businessAPI,
  notificationAPI,
  normalizeNotifications,
  getNotificationsCache,
  setNotificationsCache,
  getDismissedNotificationIds,
  dismissNotification,
  restoreNotification,
  chatAPI,
} from '@/lib/api'
import type { NotificationItem } from '@/lib/api'
import BusinessBotLogo from './BusinessBotLogo'
import AppLoadingSplash from './AppLoadingSplash'
import GuideDownloadButton from './GuideDownloadButton'

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
    reminders: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),

    reports: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    notifications: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
    chat: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  }
  return icons[name] || <div className="w-[18px] h-[18px]" />
}

function formatNotifTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DashboardLayout({ children, businessId: propBusinessId }: DashboardLayoutProps) {
  const { user, businesses, currentBusiness, switchBusiness, profileLoaded } = useAuth()
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'approvals'>('all')
  const [chatUnread, setChatUnread] = useState(0)
  const profileRef = useRef<HTMLDivElement>(null)
  const sidebarProfileRef = useRef<HTMLDivElement>(null)
  const bizSwitcherRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const isUnverified = user?.is_verified === false

  useEffect(() => {
    if (profileLoaded && isUnverified) {
      router.replace('/verify')
    }
  }, [profileLoaded, isUnverified, router])

  const isSuperAdmin = isSuperAdminUser(user)
  const isPlatformAdminUser = isPlatformAdmin(user)
  const effectiveRole = user?.business_role || user?.role
  const isManager = isManagerRole(effectiveRole)
  const isNew = isNewAccount(user)
  const bizBase = businessId ? `/business/${businessId}` : ''

  interface NavItem {
    label: string
    icon: string
    href: string
    id: string
    group: string
    ownerOnly?: boolean
    hidesForNewAccounts?: boolean
    badge?: number
  }

  const normalNavItems = useMemo<NavItem[]>(() => [
    { label: 'Dashboard', icon: 'dashboard', href: `${bizBase}/dashboard`, id: 'dashboard', group: 'main' },
    { label: 'Chat', icon: 'chat', href: `${bizBase}/chat`, id: 'chat', group: 'main', badge: chatUnread, hidesForNewAccounts: true },
    { label: 'Sales', icon: 'sales', href: `${bizBase}/sales`, id: 'sales', group: 'main' },
    { label: 'Products', icon: 'products', href: `${bizBase}/products`, id: 'products', group: 'main' },
    { label: 'Customers', icon: 'customers', href: `${bizBase}/customers`, id: 'customers', group: 'management' },
    { label: 'Debts', icon: 'debts', href: `${bizBase}/debts`, id: 'debts', group: 'management' },
    { label: 'Reports', icon: 'reports', href: `${bizBase}/reports`, id: 'reports', group: 'admin', ownerOnly: true, hidesForNewAccounts: true },
    { label: 'Notifications', icon: 'notifications', href: '/notifications', id: 'notifications-nav', group: 'admin', ownerOnly: true },
    { label: 'Businesses', icon: 'admin-businesses', href: '/businesses', id: 'businesses-nav', group: 'account' },
    { label: 'Settings', icon: 'settings', href: `${bizBase}/settings`, id: 'settings', group: 'account' },
  ], [bizBase, chatUnread])

  const visibleNavItems = useMemo(
    () => normalNavItems.filter((item) => {
      if (item.hidesForNewAccounts && isNew) return false
      if (item.ownerOnly && isManager) return true
      if (item.ownerOnly && !isManager) return false
      return true
    }),
    [normalNavItems, isManager, isNew]
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

  // Seed locally-dismissed ids once.
  useEffect(() => {
    setDismissedIds(getDismissedNotificationIds())
  }, [])

  // Lazy, fetch-on-open notifications: avoids waking the sleeping free-tier
  // Render service constantly. Shows cached items instantly, refreshes in the
  // background when the bell is opened, and re-checks after a longer stale window.
  const fetchNotifications = useCallback(async (force = false) => {
    if (!businessId || !isManager) return
    const bizNum = Number(businessId)
    const cached = getNotificationsCache()
    const stale = !cached || cached.businessId !== bizNum ||
      (Date.now() - cached.fetchedAt > 30 * 60 * 1000)
    if (cached && cached.businessId === bizNum) {
      setNotifications(cached.items)
    }
    if (!force && !stale) {
      return
    }
    setNotificationsLoading(true)
    try {
      const res = await notificationAPI.list(bizNum)
      const items = normalizeNotifications(res.data)
      items.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifications(items)
      setNotificationsCache({ businessId: bizNum, items, fetchedAt: Date.now() })
    } catch {
      // keep showing cached items on failure (server cold start / offline)
    } finally {
      setNotificationsLoading(false)
    }
  }, [businessId, isManager])

  useEffect(() => {
    if (!notificationsOpen) return
    fetchNotifications(false)
  }, [notificationsOpen, fetchNotifications])

  // Unread chat badge — refresh periodically and whenever the route changes.
  // Skipped entirely for new accounts, which cannot see the Chat link anyway,
  // so the 20s poll is not wasted on them.
  useEffect(() => {
    if (!businessId) {
      setChatUnread(0)
      return
    }
    if (isNew) {
      setChatUnread(0)
      return
    }
    if (pathname === `/business/${businessId}/chat`) {
      setChatUnread(0)
      return
    }
    let cancelled = false
    const loadUnread = async () => {
      try {
        const res = await chatAPI.unreadCount(Number(businessId))
        if (cancelled) return
        const count = res?.data?.unread ?? 0
        setChatUnread(count)
      } catch {
        if (!cancelled) setChatUnread(0)
      }
    }
    loadUnread()
    const interval = setInterval(loadUnread, 20000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [businessId, pathname, isNew])

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !dismissedIds.has(n.notification_id)),
    [notifications, dismissedIds]
  )
  const unreadCount = visibleNotifications.filter((n) => !n.is_read).length

  // Deletes for real via the API rather than hiding the row in localStorage, so
  // the change survives a reload and reaches the user's other devices. The
  // local dismissed-id list is kept as a fallback so a failed request still
  // removes the row from the bell.
  const handleDismissNotification = async (id: number) => {
    const snapshot = notifications
    dismissNotification(id)
    setDismissedIds(new Set(getDismissedNotificationIds()))
    setNotifications((prev) => prev.filter((n) => n.notification_id !== id))
    try {
      await notificationAPI.remove(id)
      if (businessId) {
        setNotificationsCache({
          businessId: Number(businessId),
          items: snapshot.filter((n) => n.notification_id !== id),
          fetchedAt: Date.now(),
        })
      }
    } catch {
      // Roll back if the server rejected it, so the row does not vanish for good.
      restoreNotification(id)
      setDismissedIds(new Set(getDismissedNotificationIds()))
      setNotifications(snapshot)
    }
  }

  const handleRestoreNotification = (id: number) => {
    restoreNotification(id)
    setDismissedIds(new Set(getDismissedNotificationIds()))
  }

  if (!profileLoaded) {
    return <AppLoadingSplash message="Loading your workspace..." />
  }

  if (user && user.is_verified === false) return null

  const isNavItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`dashboard-sidebar fixed left-0 top-0 z-30 h-full w-[264px] transform transition-transform duration-300 ease-smooth lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-5">
            <div className="relative shrink-0">
              <BusinessBotLogo size={36} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-[13px] font-bold tracking-tight text-white">Business Bot</p>
              <p className="text-[11px] text-white/40">Sales &amp; Inventory</p>
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
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-64 overflow-y-auto">
                    <p className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Switch Business</p>
                    {businesses.map((biz) => (
                      <button
                        key={biz.business_id}
                        onClick={() => handleSwitchBusiness(biz)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-slate-50 transition-colors ${
                          currentBusiness.business_id === biz.business_id ? 'bg-blue-50/80' : ''
                        }`}
                      >
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center text-primary text-[11px] font-bold shrink-0 border border-blue-100">
                          {biz.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-left truncate text-slate-700 font-medium">{biz.name}</span>
                        {currentBusiness.business_id === biz.business_id && (
                          <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-slate-200 mt-1 pt-1">
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

          {/* Notification Bell
              Sits directly below the business switcher as a compact control
              rather than as a full-width nav row that read like another
              section of the sidebar. The panel only exists while open. */}
          {isManager && (
            <div className="px-3 pt-2 pb-1">
              <div ref={notificationsRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setNotificationsOpen(!notificationsOpen); if (!notificationsOpen) setActiveTab('all') }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/50 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white/85"
                  aria-expanded={notificationsOpen}
                  aria-label={
                    unreadCount + pendingApprovals.length > 0
                      ? `Notifications, ${unreadCount + pendingApprovals.length} new`
                      : 'Notifications'
                  }
                >
                  <span className="relative shrink-0 text-white/35">
                    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {/* Count badge - the only persistent indicator, so the
                        control is quiet until there is something new. */}
                    {unreadCount + pendingApprovals.length > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white ring-2 ring-navy">
                        {unreadCount + pendingApprovals.length > 9
                          ? '9+'
                          : unreadCount + pendingApprovals.length}
                      </span>
                    )}
                  </span>
                  <span className="flex-1 text-left">Notifications</span>
                </button>

                {notificationsOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {(unreadCount + pendingApprovals.length) > 0 && (
                          <span className="text-primary">({unreadCount + pendingApprovals.length})</span>
                        )}
                        {activeTab === 'all' ? 'Notifications' : 'Requests'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {notificationsLoading && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Syncing
                          </span>
                        )}
                        <button
                          onClick={() => { setActiveTab('all'); fetchNotifications(true) }}
                          className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${activeTab === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => { setActiveTab('approvals'); fetchNotifications(true) }}
                          className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${activeTab === 'approvals' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Requests {pendingApprovals.length > 0 && <span>({pendingApprovals.length})</span>}
                        </button>
                      </div>
                    </div>

                    {activeTab === 'all' ? (
                      <>
                      <div className="max-h-72 overflow-y-auto">
                        {visibleNotifications.length > 0 ? (
                          visibleNotifications.map((n) => {
                            const title = n.title || 'Notification'
                            const isRead = n.is_read
                            const time = formatNotifTime(n.created_at)
                            return (
                              <div
                                key={n.notification_id}
                                className={`border-b border-slate-50 last:border-0 group flex items-start gap-3 transition-colors ${isRead ? 'hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-slate-100' : 'bg-primary/10'}`}>
                                  <svg className={`w-4 h-4 ${isRead ? 'text-slate-400' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                  </svg>
                                </div>
                                {/* Clicking opens the full notification page. */}
                                <Link
                                  href="/notifications"
                                  onClick={() => setNotificationsOpen(false)}
                                  className="min-w-0 flex-1 py-3 text-left"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
                                    {!isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-[10px] text-slate-400 mt-1">{time}</p>
                                </Link>
                                <button
                                  onClick={() => handleDismissNotification(n.notification_id)}
                                  title="Delete notification"
                                  aria-label={`Delete notification: ${title}`}
                                  className="self-center mr-3 text-slate-300 hover:text-slate-600 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            )
                          })
                        ) : notificationsLoading ? (
                          <div className="px-4 py-8 text-center">
                            <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-slate-500 mt-3">Loading notifications...</p>
                          </div>
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                            <p className="text-sm text-slate-500">No notifications</p>
                          </div>
                        )}
                      </div>
                      {/* Escape hatch to the full inbox, which supports viewing a
                          notification in full and deleting it. */}
                      <Link
                        href="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-center justify-center gap-1 border-t border-slate-200 bg-surfaceAlt px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-slate-100"
                      >
                        View all notifications
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M18 12H6" />
                        </svg>
                      </Link>
                      </>
                    ) : (
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
                                className="w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-semibold text-primary">{requesterName.charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 truncate">{requesterName}</p>
                                    <p className="text-xs text-slate-400 truncate">{requesterEmail}</p>
                                  </div>
                                  <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                                    {role}
                                  </span>
                                </div>
                                {reason && (
                                  <p className="text-xs text-slate-400 mt-1.5 ml-11 line-clamp-2">{reason}</p>
                                )}
                              </button>
                            )
                          })
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                            <p className="text-sm text-slate-500">No pending requests</p>
                          </div>
                        )}
                      </div>
                    )}
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
                      className={`group relative flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ease-smooth ${
                        disabled
                          ? 'pointer-events-none opacity-30'
                          : isActive
                            ? 'bg-white/[0.13] font-medium text-white shadow-sm shadow-black/20'
                            : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85'
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-white shadow-sm shadow-white/40"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`transition-colors duration-150 ${
                          isActive ? 'text-white' : 'text-white/35 group-hover:text-white/60'
                        }`}
                      >
                        <NavIcon name={item.icon} />
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {!disabled && item.badge ? (
                        <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-none text-white shadow-sm">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      ) : null}
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
                <div className="absolute bottom-full left-0 right-0 mb-2 mx-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  {/* The menu flips above the trigger in the sidebar, so the
                      guide download sits at the bottom of the list. */}
                  <div className="px-3.5 py-2.5 border-b border-slate-200">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
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
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors min-h-[40px]"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>
                  <GuideDownloadButton
                    compact
                    label="How it works (PDF)"
                    className="px-1 py-1"
                  />
                  {/* Signing out moved to Settings, behind a confirmation. One
                      tap in a menu at the bottom of the sidebar is too easy to
                      hit by accident on a phone. */}
                  <Link
                    href="/settings"
                    onClick={() => setSidebarProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors min-h-[40px]"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        {/* Sticky top bar: translucent with a backdrop blur so content scrolling
            underneath stays legible but never competes with the chrome. */}
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                aria-label="Open navigation menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="truncate font-display text-[15px] font-bold text-slate-900 lg:hidden">
                {visibleNavItems.find((item) => isNavItemActive(item.href))?.label || 'Dashboard'}
              </h1>
            </div>
          </div>
        </header>

        {/* Consistent 8px-grid page canvas: 16px gutters on mobile out to 32px
            on large screens, with a capped measure for line-length comfort. */}
        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
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
                    <span className="text-slate-700">{phone}</span>
                  </div>
                )}

                {reason && (
                  <div className="bg-surfaceAlt rounded-xl p-3">
                    <p className="text-[10px] text-neutral-light uppercase tracking-wider mb-1">Reason</p>
                    <p className="text-sm text-slate-700">{reason}</p>
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

              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 flex items-center gap-3">
                <Link
                  href="/businesses/requests"
                  onClick={() => setSelectedApproval(null)}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors text-center"
                >
                  Review Request
                </Link>
                <button
                  onClick={() => setSelectedApproval(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
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
