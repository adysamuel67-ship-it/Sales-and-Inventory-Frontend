'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import KpiCard from '@/components/KpiCard'
import dynamic from 'next/dynamic'
const RevenueChart = dynamic(() => import('@/components/RevenueChart'), { ssr: false })
import RecentSales from '@/components/RecentSales'
import LowStockAlerts from '@/components/LowStockAlerts'
import { useAuth } from '@/lib/auth'
import { reportAPI, saleAPI, productAPI } from '@/lib/api'
import { useBusinessId } from '@/lib/useBusinessId'

interface DashboardSummary {
  total_revenue: number
  total_profit: number
  total_sales: number
  total_products: number
}

interface SaleRecord {
  id: number
  product: string
  qty: number
  amount: number
  payment: string
  time: string
}

interface LowStockItem {
  name: string
  stock: number
  threshold: number
  unit: string
}

interface ChartDataPoint {
  day: string
  revenue: number
  profit: number
}

function mapSale(raw: any, productMap?: Map<number, string>): SaleRecord {
  const items = raw.sales_items || []
  const productNames = items.map((i: any) => {
    if (i.product_name || i.name) return i.product_name || i.name
    const pid = i.product_id ?? i.productId
    if (pid != null && productMap && productMap.has(pid)) return productMap.get(pid)!
    return pid != null ? `Product #${pid}` : 'Unknown'
  }).join(', ')
  const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity ?? 0), 0)
  return {
    id: raw.sale_id ?? raw.id,
    product: productNames || raw.product_name || raw.product || 'Unknown',
    qty: totalQty || raw.quantity || raw.qty || 0,
    amount: raw.total_amount ?? raw.amount ?? 0,
    payment: raw.payment_method || raw.payment || 'N/A',
    time: raw.created_at
      ? new Date(raw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : raw.time || '',
  }
}

function mapLowStock(raw: any): LowStockItem {
  return {
    name: raw.name || raw.product_name || 'Unknown',
    stock: raw.quantity ?? raw.stock ?? 0,
    threshold: raw.threshold ?? raw.reorder_level ?? 10,
    unit: raw.unit || 'units',
  }
}

function extractArray(data: any, depth = 0): any[] {
  if (depth > 3) return []
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key]
    }
    for (const key of Object.keys(data)) {
      if (data[key] && typeof data[key] === 'object') {
        const found = extractArray(data[key], depth + 1)
        if (found.length > 0) return found
      }
    }
  }
  return []
}

function extractSummary(data: any): DashboardSummary | null {
  if (!data || typeof data !== 'object') return null
  const revenue = data.total_revenue ?? data.revenue ?? data.total_amount ?? null
  const profit = data.total_profit ?? data.profit ?? data.net_profit ?? null
  const sales = data.total_sales ?? data.sales ?? data.sales_count ?? null
  const products = data.total_active_products ?? data.total_products ?? data.products ?? null
  if (revenue === null && profit === null && sales === null && products === null) return null
  return {
    total_revenue: Number(revenue ?? 0),
    total_profit: Number(profit ?? 0),
    total_sales: Number(sales ?? 0),
    total_products: Number(products ?? 0),
  }
}


function getDateRange(daysAgo: number) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - daysAgo)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

const datePresets = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]

export default function DashboardPage() {
  const { isAuthenticated, isLoading, isVerified, profileLoaded, currentBusiness, businesses, fetchBusinesses, businessesLoading, user } = useAuth()
  const router = useRouter()
  const { businessId, loading: bizLoading } = useBusinessId()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState(() => getDateRange(30))
  const [activePreset, setActivePreset] = useState(30)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [draftDateRange, setDraftDateRange] = useState(() => getDateRange(30))
  const [chartLoading, setChartLoading] = useState(false)
  const businessesFetched = useRef(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) {
      router.replace('/verify')
    }
  }, [profileLoaded, isAuthenticated, user, router])

  useEffect(() => {
    if (!isAuthenticated || !profileLoaded || businessesLoading || businessesFetched.current) return
    if (!currentBusiness && businesses.length === 0) {
      businessesFetched.current = true
      fetchBusinesses()
    }
  }, [isAuthenticated, profileLoaded, businessesLoading, currentBusiness, businesses.length, fetchBusinesses])

  const loadDashboard = useCallback(async () => {
    if (!businessId) return
    setError('')

    try {
      const results = await Promise.allSettled([
        reportAPI.summary(businessId, dateRange.start, dateRange.end),
        saleAPI.list(businessId),
        productAPI.list(businessId),
      ])

      const summaryRes = results[0].status === 'fulfilled' ? results[0].value : null
      const salesRes = results[1].status === 'fulfilled' ? results[1].value : null
      const productsRes = results[2].status === 'fulfilled' ? results[2].value : null

      const failedApis: string[] = []
      if (results[0].status === 'rejected') failedApis.push('summary')
      if (results[1].status === 'rejected') failedApis.push('sales')
      if (results[2].status === 'rejected') failedApis.push('products')
      if (failedApis.length > 0) {
        setError(`Failed to load: ${failedApis.join(', ')}`)
      }

      if (summaryRes) {
        const d = summaryRes.data
        const extracted = extractSummary(d) || extractSummary(d?.data)
        setSummary(extracted)
      }

      const productMap = new Map<number, string>()
      if (productsRes) {
        const products = extractArray(productsRes.data)
        for (const p of products) {
          const pid = p.product_id ?? p.id
          if (pid != null) productMap.set(pid, p.name || `Product #${pid}`)
        }
        setLowStockItems(
          products
            .filter((p: any) => {
              const qty = p.quantity ?? 0
              const threshold = p.threshold ?? p.reorder_level ?? 10
              return qty <= threshold
            })
            .map(mapLowStock)
        )
      }

      if (salesRes) {
        const sales = extractArray(salesRes.data)

        const filtered = sales.filter((s: any) => {
          if (!s.created_at) return false
          const d = new Date(s.created_at)
          const start = new Date(dateRange.start)
          start.setHours(0, 0, 0, 0)
          const end = new Date(dateRange.end)
          end.setHours(23, 59, 59, 999)
          return d >= start && d <= end
        })

        setRecentSales(filtered.map((s: any) => mapSale(s, productMap)))

        const dailyMap: Record<string, { revenue: number; count: number }> = {}
        for (const s of filtered) {
          const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : null
          if (!dateStr) continue
          if (!dailyMap[dateStr]) dailyMap[dateStr] = { revenue: 0, count: 0 }
          dailyMap[dateStr].revenue += Number(s.total_amount ?? s.amount ?? 0)
          dailyMap[dateStr].count += 1
        }
        const chartPoints = Object.entries(dailyMap)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([day, v]) => ({ day, revenue: v.revenue, profit: 0 }))
        setChartData(chartPoints)
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError(err.message || 'Failed to load dashboard')
      }
    }
  }, [businessId, dateRange.start, dateRange.end])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handlePresetChange = (days: number) => {
    setActivePreset(days)
    setDateRange(getDateRange(days))
    setShowDatePicker(false)
  }

  const handleOpenDatePicker = () => {
    setDraftDateRange(dateRange)
    setShowDatePicker(true)
  }

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setDraftDateRange((prev) => ({ ...prev, [field]: value }))
  }

  const handleApplyCustomDate = () => {
    setDateRange(draftDateRange)
    setActivePreset(0)
    setShowDatePicker(false)
  }

  const dateSubtitle = activePreset > 0 ? `Last ${activePreset} days` : `${dateRange.start} to ${dateRange.end}`

  if (isLoading || !isAuthenticated || !profileLoaded || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-light">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!businessId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No business selected</h2>
          <p className="text-sm text-neutral-light mb-4">Create or join a business to see your dashboard</p>
          <Link
            href="/businesses"
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Go to Businesses
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {error && (
        <div className="mb-6 bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-neutral-light mt-1">{currentBusiness?.name || 'Overview'}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => showDatePicker ? setShowDatePicker(false) : handleOpenDatePicker()}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {dateSubtitle}
            <svg className={`w-4 h-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDatePicker && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Select</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {datePresets.map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => handlePresetChange(preset.days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activePreset === preset.days
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Custom Range</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">From</label>
                  <input
                    type="date"
                    value={draftDateRange.start}
                    onChange={(e) => handleCustomDateChange('start', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">To</label>
                  <input
                    type="date"
                    value={draftDateRange.end}
                    onChange={(e) => handleCustomDateChange('end', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-primary outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleApplyCustomDate}
                className="w-full mt-3 px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <KpiCard
          title="Revenue"
          value={summary?.total_revenue != null ? `GH₵${summary.total_revenue.toLocaleString()}` : '---'}
          subtitle={dateSubtitle}
          icon="💰"
          color="primary"
        />
        <KpiCard
          title="Profit"
          value={summary?.total_profit != null ? `GH₵${summary.total_profit.toLocaleString()}` : '---'}
          subtitle={dateSubtitle}
          icon="📈"
          color="success"
        />
        <KpiCard
          title="Sales"
          value={summary?.total_sales != null ? summary.total_sales.toLocaleString() : '---'}
          subtitle={dateSubtitle}
          icon="🛒"
          color="warning"
        />
        <KpiCard
          title="Products"
          value={summary?.total_products != null ? summary.total_products.toLocaleString() : '---'}
          subtitle="In inventory"
          icon="📦"
          color="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>
        <div>
          <LowStockAlerts items={lowStockItems} />
        </div>
      </div>

      <div className="mt-4 sm:mt-6">
        <RecentSales sales={recentSales} />
      </div>
    </DashboardLayout>
  )
}
