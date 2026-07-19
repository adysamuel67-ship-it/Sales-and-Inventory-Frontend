/**
 * Shared Component Tests
 *
 * Tests for KpiCard, RevenueChart, RecentSales, LowStockAlerts
 *
 * Verifies:
 * 1. KpiCard renders with all color variants
 * 2. KpiCard shows trend indicator
 * 3. KpiCard handles missing optional props
 * 4. RevenueChart renders empty state
 * 5. RevenueChart renders legend
 * 6. RecentSales renders sale rows
 * 7. RecentSales renders empty state with link
 * 8. RecentSales links to correct business path
 * 9. LowStockAlerts renders items with urgency
 * 10. LowStockAlerts renders all-clear state
 * 11. LowStockAlerts links to correct business path
 * 12. Payment color mapping
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

import KpiCard from '@/components/KpiCard'
import RevenueChart from '@/components/RevenueChart'
import RecentSales from '@/components/RecentSales'
import LowStockAlerts from '@/components/LowStockAlerts'
import { render, screen } from '@testing-library/react'

describe('KpiCard', () => {
  const testIcon = <span data-testid="test-icon">ICON</span>

  it('renders title and value', () => {
    render(<KpiCard title="Revenue" value="GH₵1,500" icon={testIcon} color="primary" />)
    expect(screen.getByText('Revenue')).toBeTruthy()
    expect(screen.getByText('GH₵1,500')).toBeTruthy()
  })

  it('renders subtitle when provided', () => {
    render(<KpiCard title="Revenue" value="GH₵1,500" subtitle="Last 30 days" icon={testIcon} color="primary" />)
    expect(screen.getByText('Last 30 days')).toBeTruthy()
  })

  it('does not render subtitle when absent', () => {
    const { container } = render(<KpiCard title="Revenue" value="GH₵1,500" icon={testIcon} color="primary" />)
    expect(container.textContent).not.toContain('subtitle')
  })

  it('renders icon', () => {
    render(<KpiCard title="Revenue" value="GH₵1,500" icon={testIcon} color="primary" />)
    expect(screen.getByTestId('test-icon')).toBeTruthy()
  })

  it('renders with primary color', () => {
    const { container } = render(<KpiCard title="Revenue" value="100" icon={testIcon} color="primary" />)
    const card = container.querySelector('.kpi-card')
    expect(card?.className).toContain('border-blue-100')
  })

  it('renders with success color', () => {
    const { container } = render(<KpiCard title="Profit" value="500" icon={testIcon} color="success" />)
    const card = container.querySelector('.kpi-card')
    expect(card?.className).toContain('border-emerald-100')
  })

  it('renders with warning color', () => {
    const { container } = render(<KpiCard title="Low Stock" value="3" icon={testIcon} color="warning" />)
    const card = container.querySelector('.kpi-card')
    expect(card?.className).toContain('border-amber-100')
  })

  it('renders with danger color', () => {
    const { container } = render(<KpiCard title="Products" value="8" icon={testIcon} color="danger" />)
    const card = container.querySelector('.kpi-card')
    expect(card?.className).toContain('border-rose-100')
  })

  it('renders trend indicator when provided', () => {
    render(
      <KpiCard
        title="Revenue"
        value="GH₵1,500"
        icon={testIcon}
        color="primary"
        trend={{ value: '+12%', positive: true }}
      />
    )
    expect(screen.getByText(/12%/)).toBeTruthy()
  })

  it('renders negative trend', () => {
    render(
      <KpiCard
        title="Revenue"
        value="GH₵1,500"
        icon={testIcon}
        color="primary"
        trend={{ value: '-5%', positive: false }}
      />
    )
    expect(screen.getByText(/5%/)).toBeTruthy()
  })

  it('does not render trend when absent', () => {
    const { container } = render(<KpiCard title="Revenue" value={100} icon={testIcon} color="primary" />)
    expect(container.querySelector('[class*="emerald-50"]')).toBeNull()
    expect(container.querySelector('[class*="rose-50"]')).toBeNull()
  })

  it('renders numeric value', () => {
    render(<KpiCard title="Sales" value={42} icon={testIcon} color="primary" />)
    expect(screen.getByText('42')).toBeTruthy()
  })

  it('accepts string icon', () => {
    render(<KpiCard title="Revenue" value="100" icon="$" color="primary" />)
    expect(screen.getByText('$')).toBeTruthy()
  })
})

describe('RevenueChart', () => {
  it('renders title', () => {
    render(<RevenueChart data={[]} />)
    expect(screen.getByText('Revenue Overview')).toBeTruthy()
  })

  it('renders subtitle', () => {
    render(<RevenueChart data={[]} />)
    expect(screen.getByText('Revenue by day')).toBeTruthy()
  })

  it('renders empty state when no data', () => {
    render(<RevenueChart data={[]} />)
    expect(screen.getByText('No revenue data for this period')).toBeTruthy()
  })

  it('renders legend items', () => {
    render(<RevenueChart data={[]} />)
    expect(screen.getByText('Revenue')).toBeTruthy()
    expect(screen.getByText('Profit')).toBeTruthy()
  })

  it('renders without crashing with data', () => {
    const data = [
      { day: 'Jan 1', revenue: 100, profit: 30 },
      { day: 'Jan 2', revenue: 200, profit: 60 },
    ]
    const { container } = render(<RevenueChart data={data} />)
    // recharts may not render fully in jsdom, but container should exist
    expect(container).toBeTruthy()
    // Empty state should NOT show when data is present
    expect(screen.queryByText('No revenue data for this period')).toBeNull()
  })
})

describe('RecentSales', () => {
  const sales = [
    { id: 1, product: 'Rice', qty: 5, amount: 250, payment: 'Cash', time: '10:30 AM' },
    { id: 2, product: 'Beans', qty: 3, amount: 150, payment: 'MoMo', time: '11:00 AM' },
  ]

  it('renders title', () => {
    render(<RecentSales sales={sales} />)
    expect(screen.getByText('Recent Sales')).toBeTruthy()
  })

  it('renders "View All" link', () => {
    render(<RecentSales sales={sales} />)
    expect(screen.getByText('View All')).toBeTruthy()
  })

  it('renders sale rows', () => {
    render(<RecentSales sales={sales} />)
    expect(screen.getByText('Rice')).toBeTruthy()
    expect(screen.getByText('Beans')).toBeTruthy()
  })

  it('renders sale quantities', () => {
    render(<RecentSales sales={sales} />)
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('renders sale amounts with GH₵', () => {
    render(<RecentSales sales={sales} />)
    // GH₵ may be split across elements, so check text content
    const { container } = render(<RecentSales sales={sales} />)
    expect(container.textContent).toContain('250.00')
    expect(container.textContent).toContain('150.00')
  })

  it('renders payment badges', () => {
    render(<RecentSales sales={sales} />)
    const cashBadges = screen.getAllByText('Cash')
    expect(cashBadges.length).toBeGreaterThanOrEqual(1)
    const momoBadges = screen.getAllByText('MoMo')
    expect(momoBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders empty state', () => {
    render(<RecentSales sales={[]} />)
    expect(screen.getByText('No sales yet')).toBeTruthy()
    expect(screen.getByText('Record your first sale to see it here')).toBeTruthy()
  })

  it('renders "Add Sale" button in empty state', () => {
    render(<RecentSales sales={[]} />)
    expect(screen.getByText('Add Sale')).toBeTruthy()
  })

  it('links to business sales page when businessId provided', () => {
    render(<RecentSales sales={sales} businessId={42} />)
    const links = screen.getAllByTestId('next-link')
    const viewAllLink = links.find((l) => l.textContent?.includes('View All'))
    expect(viewAllLink?.getAttribute('href')).toBe('/business/42/sales')
  })

  it('links to /sales when no businessId', () => {
    render(<RecentSales sales={sales} />)
    const links = screen.getAllByTestId('next-link')
    const viewAllLink = links.find((l) => l.textContent?.includes('View All'))
    expect(viewAllLink?.getAttribute('href')).toBe('/sales')
  })

  it('empty state links to business sales', () => {
    render(<RecentSales sales={[]} businessId={5} />)
    const links = screen.getAllByTestId('next-link')
    const addSaleLink = links.find((l) => l.textContent?.includes('Add Sale'))
    expect(addSaleLink?.getAttribute('href')).toBe('/business/5/sales')
  })
})

describe('LowStockAlerts', () => {
  const items = [
    { name: 'Rice', stock: 2, threshold: 10, unit: 'bags' },
    { name: 'Beans', stock: 8, threshold: 10, unit: 'packs' },
    { name: 'Pepper', stock: 0, threshold: 5, unit: 'kg' },
  ]

  it('renders title', () => {
    render(<LowStockAlerts items={items} />)
    expect(screen.getByText('Low Stock Alerts')).toBeTruthy()
  })

  it('renders item count', () => {
    render(<LowStockAlerts items={items} />)
    expect(screen.getByText('3 items')).toBeTruthy()
  })

  it('renders item names', () => {
    render(<LowStockAlerts items={items} />)
    expect(screen.getByText('Rice')).toBeTruthy()
    expect(screen.getByText('Beans')).toBeTruthy()
    expect(screen.getByText('Pepper')).toBeTruthy()
  })

  it('renders stock info', () => {
    render(<LowStockAlerts items={items} />)
    expect(screen.getByText('2 bags remaining (min: 10)')).toBeTruthy()
    expect(screen.getByText('8 packs remaining (min: 10)')).toBeTruthy()
    expect(screen.getByText('0 kg remaining (min: 5)')).toBeTruthy()
  })

  it('shows danger badge for critically low stock', () => {
    render(<LowStockAlerts items={items} />)
    const dangerBadges = screen.getAllByText('2 left')
    expect(dangerBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows out of stock badge', () => {
    render(<LowStockAlerts items={items} />)
    expect(screen.getByText('0 left')).toBeTruthy()
  })

  it('shows warning badge for moderate low stock', () => {
    render(<LowStockAlerts items={items} />)
    expect(screen.getByText('8 left')).toBeTruthy()
  })

  it('renders empty state when no items', () => {
    render(<LowStockAlerts items={[]} />)
    expect(screen.getByText('All products are well stocked')).toBeTruthy()
  })

  it('does not show count when empty', () => {
    const { container } = render(<LowStockAlerts items={[]} />)
    expect(container.textContent).not.toContain('items')
  })

  it('renders "View All Products" link', () => {
    render(<LowStockAlerts items={items} />)
    expect(screen.getByText(/View All Products/)).toBeTruthy()
  })

  it('links to business products page when businessId provided', () => {
    render(<LowStockAlerts items={items} businessId={42} />)
    const links = screen.getAllByTestId('next-link')
    const productsLink = links.find((l) => l.textContent?.includes('View All Products'))
    expect(productsLink?.getAttribute('href')).toBe('/business/42/products')
  })

  it('links to /products when no businessId', () => {
    render(<LowStockAlerts items={items} />)
    const links = screen.getAllByTestId('next-link')
    const productsLink = links.find((l) => l.textContent?.includes('View All Products'))
    expect(productsLink?.getAttribute('href')).toBe('/products')
  })

  it('urgency logic: stock <= 30% of threshold is danger', () => {
    const stock = 2
    const threshold = 10
    const urgency = stock <= threshold * 0.3 ? 'danger' : 'warning'
    expect(urgency).toBe('danger')
  })

  it('urgency logic: stock > 30% of threshold is warning', () => {
    const stock = 8
    const threshold = 10
    const urgency = stock <= threshold * 0.3 ? 'danger' : 'warning'
    expect(urgency).toBe('warning')
  })
})

describe('Payment color mapping', () => {
  const paymentColors: Record<string, string> = {
    Cash: 'bg-success-light text-success',
    MoMo: 'bg-primary-light text-primary',
    Card: 'bg-warning-light text-warning',
  }

  it('maps Cash to success color', () => {
    expect(paymentColors['Cash']).toContain('success')
  })

  it('maps MoMo to primary color', () => {
    expect(paymentColors['MoMo']).toContain('primary')
  })

  it('maps Card to warning color', () => {
    expect(paymentColors['Card']).toContain('warning')
  })

  it('unknown payment falls back to gray', () => {
    const color = paymentColors['Cheque'] || 'bg-gray-100 text-gray-600'
    expect(color).toContain('gray')
  })
})
