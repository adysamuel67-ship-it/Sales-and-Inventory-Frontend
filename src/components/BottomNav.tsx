'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavIcon from './NavIcon'

interface BottomNavProps {
  businessId?: string
  onMore?: () => void
}

interface NavItem {
  label: string
  href: string
  icon: string
}

export default function BottomNav({ businessId, onMore }: BottomNavProps) {
  const pathname = usePathname()
  const bizBase = businessId ? `/business/${businessId}` : ''

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: `${bizBase}/dashboard`, icon: 'dashboard' },
    { label: 'Sales', href: `${bizBase}/sales`, icon: 'sales' },
    { label: 'Products', href: `${bizBase}/products`, icon: 'products' },
    { label: 'Debts', href: `${bizBase}/debts`, icon: 'debts' },
  ]

  const isActive = (href: string) => pathname === href || !!pathname?.startsWith(href + '/')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 h-[68px]">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-lg transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-slate-500'
                }`}
              >
                <NavIcon name={item.icon} />
              </span>
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onMore}
          aria-label="Open more navigation"
          className="flex flex-col items-center justify-center gap-1 text-slate-500 transition-colors hover:text-slate-700"
        >
          <span className="flex h-8 w-12 items-center justify-center rounded-lg text-slate-500">
            <NavIcon name="menu" />
          </span>
          <span className="text-[10px] font-medium text-slate-500">More</span>
        </button>
      </div>
    </nav>
  )
}
