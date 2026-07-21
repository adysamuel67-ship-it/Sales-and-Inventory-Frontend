'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import KpiCard from '@/components/KpiCard'
import { kpiIcons } from '@/components/KpiIcons'
import RecentSales from '@/components/RecentSales'
import LowStockAlerts from '@/components/LowStockAlerts'

const RevenueChart = dynamic(() => import('@/components/RevenueChart'), { ssr: false })
import { useAuth } from '@/lib/auth'
import { reportAPI, saleAPI, productAPI } from '@/lib/api'
import { extractArray, extractSummary, mapSale, mapLowStock, generateDateLabels, isStaffRole, parseApiError, getDateRange } from '@/lib/utils'

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

function mapSaleLocal(raw: any, productMap?: Map<number, string>): SaleRecord {
  const result = mapSale(raw, productMap)
  return {
    ...result,
    time: raw.created_at
      ? new Date(raw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : raw.time || '',
  }
}

const datePresets = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]

export default function BusinessDashboardPage() {
  const params = useParams()
  const businessId = parseInt(params?.id as string)
  const { user, currentBusiness } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(() => getDateRange(30))
  const [activePreset, setActivePreset] = useState(30)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [draftDateRange, setDraftDateRange] = useState(() => getDateRange(30))

  const isStaff = isStaffRole(user?.business_role || user?.role)

  const loadDashboard = useCallback(async () => {
    if (!businessId || isNaN(businessId)) return
    setError('')
    setLoading(true)

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

      let apiError = ''
      if (failedApis.length > 0) {
        apiError = `Failed to load: ${failedApis.join(', ')}`
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

        setRecentSales(filtered.slice(0, 10).map((s: any) => mapSaleLocal(s, productMap)))

        const dailyMap: Record<string, { revenue: number; count: number }> = {}
        const allDateLabels = generateDateLabels(dateRange.start, dateRange.end)
        for (const label of allDateLabels) {
          dailyMap[label] = { revenue: 0, count: 0 }
        }

        for (const s of filtered) {
          const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : null
          if (!dateStr || !dailyMap[dateStr]) continue
          dailyMap[dateStr].revenue += Number(s.total_amount ?? s.amount ?? 0)
          dailyMap[dateStr].count += 1
        }

        let totalDailyRevenue = 0
        for (const v of Object.values(dailyMap)) {
          totalDailyRevenue += v.revenue
        }

        let totalProfit = 0
        let totalRevenue = 0
        if (summaryRes) {
          const d = summaryRes.data
          const extracted = extractSummary(d) || extractSummary(d?.data)
          if (extracted) {
            totalProfit = extracted.total_profit
            totalRevenue = extracted.total_revenue
          }
        }

        const effectiveRevenue = totalRevenue > 0 ? totalRevenue : totalDailyRevenue

        const chartPoints = Object.entries(dailyMap)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([day, v]) => ({
            day,
            revenue: v.revenue,
            profit: effectiveRevenue > 0 ? (v.revenue / effectiveRevenue) * totalProfit : 0,
          }))

        setChartData(chartPoints)

        if (summaryRes) {
          const d = summaryRes.data
          const extracted = extractSummary(d) || extractSummary(d?.data)
          if (extracted && extracted.total_revenue > 0 && extracted.total_profit > 0) {
            const margin = (extracted.total_profit / extracted.total_revenue) * 100
            if (margin < 5) {
              const marginWarning = `Warning: Low profit margin (${margin.toFixed(1)}%). Please review your figures.`
              setError(apiError ? `${apiError}. ${marginWarning}` : marginWarning)
            } else if (apiError) {
              setError(apiError)
            }
          } else if (apiError) {
            setError(apiError)
          }
        } else if (apiError) {
          setError(apiError)
        }
      }
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
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

  if (loading) {
  if (isNaN(businessId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid business</h2>
        <p className="text-sm text-gray-500">This business doesn&apos;t exist or the URL is invalid.</p>
      </div>
    )
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className={`mb-6 text-sm p-3 rounded-xl flex items-center gap-2 ${
          error.startsWith('Warning') ? 'bg-warning-light text-warning' : 'bg-danger-light text-danger'
        }`}>
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
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-gray-700 hover:bg-surfaceAlt transition-colors min-h-[44px]"
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

      {isStaff ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <KpiCard
            title="Today's Sales"
            value={summary?.total_sales != null ? summary.total_sales.toLocaleString() : '---'}
            subtitle={dateSubtitle}
            icon={kpiIcons.sales}
            color="primary"
          />
          <KpiCard
            title="Low Stock"
            value={lowStockItems.length.toLocaleString()}
            subtitle="Items need restocking"
            icon={kpiIcons.warning}
            color="warning"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <KpiCard
            title="Revenue"
            value={summary?.total_revenue != null ? `GH₵${summary.total_revenue.toLocaleString()}` : '---'}
            subtitle={dateSubtitle}
            icon={kpiIcons.revenue}
            color="primary"
          />
          <KpiCard
            title="Profit"
            value={summary?.total_profit != null ? `GH₵${summary.total_profit.toLocaleString()}` : '---'}
            subtitle={dateSubtitle}
            icon={kpiIcons.profit}
            color="success"
          />
          <KpiCard
            title="Sales"
            value={summary?.total_sales != null ? summary.total_sales.toLocaleString() : '---'}
            subtitle={dateSubtitle}
            icon={kpiIcons.sales}
            color="warning"
          />
          <KpiCard
            title="Products"
            value={summary?.total_products != null ? summary.total_products.toLocaleString() : '---'}
            subtitle="In inventory"
            icon={kpiIcons.products}
            color="danger"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>
        <div>
          <LowStockAlerts items={lowStockItems} businessId={businessId} />
        </div>
      </div>

      <div className="mt-4 sm:mt-6">
        <RecentSales sales={recentSales} businessId={businessId} />
      </div>
    </div>
  )
}
