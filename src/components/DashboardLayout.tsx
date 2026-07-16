'use client'

import { useAuth } from '@/lib/auth'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const normalNavItems = [
  { label: 'Dashboard', icon: '📊', href: '/dashboard', id: 'dashboard' },
  { label: 'Sales', icon: '💰', href: '/sales', id: 'sales' },
  { label: 'Products', icon: '📦', href: '/products', id: 'products' },
  { label: 'Businesses', icon: '🏢', href: '/businesses', id: 'businesses' },
]

const adminSubItems = [
  { label: 'Overview', icon: '🛡️', href: '/admin', id: 'admin' },
  { label: 'User Management', icon: '👥', href: '/admin/users', id: 'admin-users' },
  { label: 'Business Management', icon: '🏢', href: '/admin/businesses', id: 'admin-businesses' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, businesses, currentBusiness, switchBusiness } = useAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false)
  const [bizSwitcherOpen, setBizSwitcherOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const sidebarProfileRef = useRef<HTMLDivElement>(null)
  const bizSwitcherRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'super_admin'
  const allNavItems = [...normalNavItems, ...(isAdmin ? adminSubItems : [])]

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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitchBusiness = (biz: typeof currentBusiness) => {
    if (biz) {
      switchBusiness(biz)
      setBizSwitcherOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-30 h-full w-[260px] dashboard-sidebar transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Smart Sales</p>
                <p className="text-white/60 text-xs">Inventory System</p>
              </div>
            </div>
          </div>

          {currentBusiness && (
            <div className="px-4 pt-4 pb-2">
              <div ref={bizSwitcherRef} className="relative">
                <button
                  onClick={() => setBizSwitcherOpen(!bizSwitcherOpen)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/10 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 bg-african-gold/30 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {currentBusiness.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white text-sm font-medium truncate">{currentBusiness.name}</p>
                    {businesses.length > 1 && (
                      <p className="text-white/50 text-[10px]">{businesses.length} businesses</p>
                    )}
                  </div>
                  <svg className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${bizSwitcherOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {bizSwitcherOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 mx-0 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 max-h-64 overflow-y-auto">
                    <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Switch Business</p>
                    {businesses.map((biz) => (
                      <button
                        key={biz.business_id}
                        onClick={() => handleSwitchBusiness(biz)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                          currentBusiness.business_id === biz.business_id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {biz.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-left truncate text-gray-900">{biz.name}</span>
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
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors"
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

          <nav className="flex-1 p-4 space-y-1">
            {normalNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}

            {isAdmin && (
              <div className="pt-2">
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                    pathname.startsWith('/admin')
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>🛡️</span>
                  <span className="flex-1 text-left">Admin</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-african-gold/30 text-african-gold px-1.5 py-0.5 rounded-full mr-1">
                    Admin
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {adminOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                    {adminSubItems.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'bg-white/15 text-white font-medium'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="text-xs">{item.icon}</span>
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div ref={sidebarProfileRef} className="relative">
              <button
                onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-african-gold/30 flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-white/50 text-xs capitalize flex items-center gap-1">
                    {user?.role || 'user'}
                    {isAdmin && (
                      <span className="text-[9px] bg-african-gold/30 text-african-gold px-1 rounded">SUPER</span>
                    )}
                  </p>
                </div>
                <svg className={`w-4 h-4 text-white/40 transition-transform ${sidebarProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {sidebarProfileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                    {user?.phone && (
                      <p className="text-xs text-gray-400 mt-0.5">{user.phone}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-block text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {user?.role || 'user'}
                      </span>
                      {user?.is_verified ? (
                        <span className="inline-block text-[10px] font-medium uppercase tracking-wider bg-success-light text-success px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-medium uppercase tracking-wider bg-warning-light text-warning px-2 py-0.5 rounded-full">
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setSidebarProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>
                  <button
                    onClick={() => { setSidebarProfileOpen(false); logout() }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 lg:flex-none">
              <h2 className="text-lg font-bold text-gray-900 lg:hidden">
                {allNavItems.find((item: { href: string }) => item.href === pathname)?.label || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-warning-light text-warning px-3 py-1.5 rounded-full text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                Live
              </div>
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary text-sm font-medium hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                      {user?.phone && (
                        <p className="text-xs text-gray-400 mt-0.5">{user.phone}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-block text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {user?.role || 'user'}
                        </span>
                        {user?.is_verified ? (
                          <span className="inline-block text-[10px] font-medium uppercase tracking-wider bg-success-light text-success px-2 py-0.5 rounded-full">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-medium uppercase tracking-wider bg-warning-light text-warning px-2 py-0.5 rounded-full">
                            Unverified
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <button
                      onClick={() => { setProfileOpen(false); logout() }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
