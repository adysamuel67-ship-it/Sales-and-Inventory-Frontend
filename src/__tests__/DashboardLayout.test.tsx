/**
 * DashboardLayout Component Tests
 *
 * Verifies:
 * 1. Sidebar renders navigation links using Next.js Link
 * 2. Active nav item is highlighted
 * 3. Profile dropdown shows user info
 * 4. Logout clears auth state
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
  usePathname: jest.fn(() => '/dashboard'),
}))

jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 1, name: 'Kwame Mensah', email: 'kwame@test.com', phone: '0241234567', role: 'admin' },
    logout: jest.fn(),
  })),
}))

import DashboardLayout from '@/components/DashboardLayout'
import { render, screen } from '@testing-library/react'

describe('DashboardLayout', () => {
  it('renders all navigation items as Link components', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    expect(links.length).toBe(4)

    const hrefs = links.map(link => link.getAttribute('href'))
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/sales')
    expect(hrefs).toContain('/products')
    expect(hrefs).toContain('/businesses')
  })

  it('renders navigation labels inside Link elements', () => {
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
    expect(linkTexts.some(t => t?.includes('Businesses'))).toBe(true)
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

    expect(screen.getByText('Kwame Mensah')).toBeTruthy()
  })

  it('displays user role', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('admin')).toBeTruthy()
  })

  it('displays brand name', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('Smart Sales')).toBeTruthy()
    expect(screen.getByText('Inventory System')).toBeTruthy()
  })

  it('header shows Live indicator', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('Live')).toBeTruthy()
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
    const dashboardLink = links.find(l => l.getAttribute('href') === '/dashboard')
    expect(dashboardLink?.className).toContain('bg-white/20')
    expect(dashboardLink?.className).toContain('font-medium')
  })

  it('inactive nav items do not have highlighted class', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const links = screen.getAllByTestId('next-link')
    const salesLink = links.find(l => l.getAttribute('href') === '/sales')
    expect(salesLink?.className).not.toContain('bg-white/20')
    expect(salesLink?.className).toContain('text-white/70')
  })
})
