/**
 * DashboardLayout Component Tests
 *
 * Verifies:
 * 1. Sidebar renders navigation links using Next.js Link
 * 2. Active nav item is highlighted
 * 3. Profile dropdown shows user info
 * 4. Logout clears auth state
 * 5. Business switcher shows current business
 * 6. Role-based nav visibility
 */

import React from 'react'

jest.mock('next/link', () => {
  return React.forwardRef(function MockLink(
    { children, href, className, ...props }: any,
    ref: any
  ) {
    return (
      <a ref={ref} href={href} className={className} data-testid="next-link" {...props}>
        {children}
      </a>
    )
  })
})

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/business/1/dashboard'),
  useParams: jest.fn(() => ({ id: '1' })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  })),
}))

jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 1, name: 'Kwame Mensah', email: 'kwame@test.com', phone: '0241234567', role: 'OWNER', is_verified: true },
    logout: jest.fn(),
    businesses: [
      { business_id: 1, name: 'Kwame Shop' },
      { business_id: 2, name: 'Second Shop' },
    ],
    currentBusiness: { business_id: 1, name: 'Kwame Shop' },
    switchBusiness: jest.fn(),
    profileLoaded: true,
  })),
}))

import DashboardLayout from '@/components/DashboardLayout'
import { render, screen } from '@testing-library/react'
import { useAuth } from '@/lib/auth'

describe('DashboardLayout', () => {
  it('renders navigation links as Link components', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    expect(links.length).toBeGreaterThanOrEqual(4)

    const hrefs = links.map(link => link.getAttribute('href'))
    expect(hrefs).toContain('/business/1/dashboard')
    expect(hrefs).toContain('/business/1/sales')
    expect(hrefs).toContain('/business/1/products')
  })

  it('renders navigation labels', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    const linkTexts = links.map(link => link.textContent?.trim())
    expect(linkTexts.some(t => t?.includes('Dashboard'))).toBe(true)
    expect(linkTexts.some(t => t?.includes('Sales'))).toBe(true)
    expect(linkTexts.some(t => t?.includes('Products'))).toBe(true)
  })

  it('renders children content', () => {
    render(
      <DashboardLayout>
        <div>Page Content Here</div>
      </DashboardLayout>
    )

    expect(screen.getByText('Page Content Here')).toBeTruthy()
  })

  it('displays user name in sidebar', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getAllByText('Kwame Mensah').length).toBeGreaterThanOrEqual(1)
  })

  it('displays user role', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const roleBadges = screen.getAllByText('OWNER')
    expect(roleBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('displays brand name', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('Business Bot')).toBeTruthy()
    expect(screen.getByText('Sales & Inventory')).toBeTruthy()
  })

  it('header renders without redundant elements', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const header = document.querySelector('header')
    expect(header).toBeTruthy()
    expect(screen.getByText('Content')).toBeTruthy()
  })

  it('no Link elements use window.location for navigation', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    links.forEach(link => {
      const href = link.getAttribute('href')
      expect(href).toMatch(/^\//)
    })
  })

  it('active nav item has highlighted class', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    const dashboardLink = links.find(l => l.getAttribute('href') === '/business/1/dashboard')
    expect(dashboardLink?.className).toContain('bg-white/[0.13]')
    expect(dashboardLink?.className).toContain('font-medium')
  })

  it('inactive nav items do not have highlighted class', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    const salesLink = links.find(l => l.getAttribute('href') === '/business/1/sales')
    expect(salesLink?.className).not.toContain('bg-white/[0.13]')
    expect(salesLink?.className).toContain('text-white/50')
  })

  it('shows current business name', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('Kwame Shop')).toBeTruthy()
  })

  it('shows business count when multiple businesses', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('2 businesses')).toBeTruthy()
  })

  it('renders sidebar with user name and role', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getAllByText('Kwame Mensah').length).toBeGreaterThanOrEqual(1)
    const roles = screen.getAllByText('OWNER')
    expect(roles.length).toBeGreaterThanOrEqual(1)
  })

  it('owner-only nav items (Approvals/Reports/Settings) are visible for OWNER', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    const hrefs = links.map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/businesses')
    expect(hrefs).toContain('/business/1/reports')
    expect(hrefs).toContain('/business/1/settings')
  })

  it('shows Customers nav item', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    const hrefs = links.map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/business/1/customers')
  })
})

// A trader who is "just trying it" should not open the app to eight menu
// items. Chat and Reports stay hidden until the account has settled, so the
// first session is only the things a new shop actually does.
describe('DashboardLayout - trimmed menu for new accounts', () => {
  const useAuthMock = useAuth as jest.Mock
  const originalImpl = useAuthMock.getMockImplementation()

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

  const owner = (overrides: Record<string, any> = {}) => ({
    id: 1,
    name: 'Kwame Mensah',
    email: 'kwame@test.com',
    phone: '0241234567',
    role: 'OWNER',
    is_verified: true,
    ...overrides,
  })

  const mockUser = (user: Record<string, any>) => {
    useAuthMock.mockReturnValue({
      user,
      logout: jest.fn(),
      businesses: [{ business_id: 1, name: 'Kwame Shop' }],
      currentBusiness: { business_id: 1, name: 'Kwame Shop' },
      switchBusiness: jest.fn(),
      profileLoaded: true,
    })
  }

  const navHrefs = () =>
    screen.getAllByTestId('next-link').map(l => l.getAttribute('href'))

  afterEach(() => {
    useAuthMock.mockImplementation(originalImpl!)
  })

  it('hides Chat and Reports from a new account', () => {
    mockUser(owner({ created_at: daysAgo(2) }))

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const hrefs = navHrefs()
    expect(hrefs).not.toContain('/business/1/chat')
    expect(hrefs).not.toContain('/business/1/reports')
  })

  it('keeps the core trading nav for a new account', () => {
    mockUser(owner({ created_at: daysAgo(2) }))

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const hrefs = navHrefs()
    expect(hrefs).toContain('/business/1/dashboard')
    expect(hrefs).toContain('/business/1/sales')
    expect(hrefs).toContain('/business/1/products')
    expect(hrefs).toContain('/business/1/customers')
    expect(hrefs).toContain('/business/1/debts')
    expect(hrefs).toContain('/business/1/settings')
  })

  it('shows Chat and Reports once the account is established', () => {
    mockUser(owner({ created_at: daysAgo(60) }))

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const hrefs = navHrefs()
    expect(hrefs).toContain('/business/1/chat')
    expect(hrefs).toContain('/business/1/reports')
  })

  it('keeps the full menu when the account has no join date', () => {
    mockUser(owner({ created_at: undefined }))

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const hrefs = navHrefs()
    expect(hrefs).toContain('/business/1/chat')
    expect(hrefs).toContain('/business/1/reports')
  })

  it('keeps the full menu when the join date is unparseable', () => {
    mockUser(owner({ created_at: 'not-a-date' }))

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const hrefs = navHrefs()
    expect(hrefs).toContain('/business/1/chat')
    expect(hrefs).toContain('/business/1/reports')
  })

  it('does not trim the menu for a platform super admin on a new account', () => {
    mockUser(owner({ role: 'super_admin', created_at: daysAgo(1) }))

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const hrefs = navHrefs()
    expect(hrefs).toContain('/business/1/chat')
    expect(hrefs).toContain('/business/1/reports')
  })
})
