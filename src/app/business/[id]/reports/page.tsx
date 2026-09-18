'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { reportAPI, saleAPI, productAPI, customerAPI } from '@/lib/api'
import dynamic from 'next/dynamic'
const RevenueChart = dynamic(() => import('@/components/RevenueChart'), { ssr: false })
import { extractArray, extractProfit, extractSummary, getDateRange, parseApiError, formatCedi } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import EmptyState from '@/components/ui/EmptyState'
import { ChartIcon } from '@/components/ui/Icons'

interface ProfitData {
  total_revenue: number
  total_cost: number
  total_profit: number
  items_sold?: number
  sales_count?: number
}

interface SummaryData {
  total_revenue: number
  total_profit: number
  total_sales: number
  total_products?: number
}

interface SaleSummaryData {
  total_revenue?: number
  total_profit?: number
  total_sales?: number
  sold_quantity?: number
  profit_margin?: number
  cash_total?: number
  momo_total?: number
  card_total?: number
  best_selling_product?: string | null
}

interface DebtData {
  debt_id?: number
  customer_id: number
  amount: number
  due_date?: string | null
  is_paid?: boolean
}

interface ChartDataPoint {
  day: string
  revenue: number
  profit: number
}

const datePresets = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]

function extractSaleArray(data: any): any[] {
  return extractArray(data)
}

export default function ReportsPage() {
  const params = useParams()
  const businessId = parseInt(params?.id as string)
  const [profit, setProfit] = useState<ProfitData | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [saleSummary, setSaleSummary] = useState<SaleSummaryData | null>(null)
  const [debts, setDebts] = useState<DebtData[]>([])
  const [debtsLoading, setDebtsLoading] = useState(false)
  const [customersById, setCustomersById] = useState<Record<number, { name?: string | null }>>({})
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState(() => getDateRange(30))
  const [activePreset, setActivePreset] = useState(30)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [draftDateRange, setDraftDateRange] = useState(() => getDateRange(30))

  const loadReports = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    setProfit(null)
    setSummary(null)
    setSaleSummary(null)
    setChartData([])

    try {
      const [profitRes, summaryRes, salesRes, saleSummaryRes] = await Promise.allSettled([
        reportAPI.profit(businessId, dateRange.start, dateRange.end),
        reportAPI.summary(businessId, dateRange.start, dateRange.end),
        saleAPI.list(businessId, { date: dateRange.start, end_date: dateRange.end }),
        reportAPI.saleSummary(businessId, dateRange.start, dateRange.end),
      ])

      if (profitRes.status === 'fulfilled') {
        const p = extractProfit(profitRes.value.data)
        setProfit(p)
      }

      if (summaryRes.status === 'fulfilled') {
        const s = extractSummary(summaryRes.value.data)
        setSummary(s)
      }

      if (saleSummaryRes.status === 'fulfilled') {
        const raw = saleSummaryRes.value.data
        const d = raw?.data ?? raw
        if (d) setSaleSummary(d)
      }

      if (salesRes.status === 'fulfilled') {
        const sales = extractSaleArray(salesRes.value.data)
        const start = new Date(dateRange.start)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        const filtered = sales.filter((s: any) => {
          if (!s.created_at) return false
          const d = new Date(s.created_at)
          return d >= start && d <= end
        })

        const dailyMap: Record<string, { revenue: number; count: number }> = {}
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dailyMap[d.toISOString().split('T')[0]] = { revenue: 0, count: 0 }
        }

        for (const s of filtered) {
          const dateStr = new Date(s.created_at).toISOString().split('T')[0]
          if (!dailyMap[dateStr]) continue
          dailyMap[dateStr].revenue += Number(s.total_amount ?? s.amount ?? 0)
          dailyMap[dateStr].count += 1
        }

        let totalProfit = 0
        let totalRevenue = 0
        const summaryData = summaryRes.status === 'fulfilled' ? extractSummary(summaryRes.value.data) : null
        if (summaryData) {
          totalProfit = summaryData.total_profit
          totalRevenue = summaryData.total_revenue
        } else if (profitRes.status === 'fulfilled') {
          const p = extractProfit(profitRes.value.data)
          if (p) {
            totalProfit = p.total_profit
            totalRevenue = p.total_revenue
          }
        }

        let totalDailyRevenue = 0
        for (const v of Object.values(dailyMap)) {
          totalDailyRevenue += v.revenue
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
      }

      const hasData =
        (profitRes.status === 'fulfilled' && profitRes.value.data) ||
        (summaryRes.status === 'fulfilled' && summaryRes.value.data)

      if (!hasData) {
        if (profitRes.status === 'rejected' && summaryRes.status === 'rejected') {
          setError('Failed to load report data')
        }
      }
    } catch {
      setError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [businessId, dateRange.start, dateRange.end])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  useEffect(() => {
    if (!businessId) return
    setDebtsLoading(true)
    Promise.allSettled([
      reportAPI.debtsReport(businessId),
      customerAPI.list(businessId),
    ]).then(([debtsRes, customersRes]) => {
      if (debtsRes.status === 'fulfilled') {
        const arr = extractArray(debtsRes.value.data)
        setDebts(arr)
      }
      if (customersRes.status === 'fulfilled') {
        const arr = extractArray(customersRes.value.data)
        const map: Record<number, { name?: string | null }> = {}
        for (const c of arr) {
          const id = c.customer_id ?? c.id
          if (id != null) map[id] = c
        }
        setCustomersById(map)
      }
      setDebtsLoading(false)
    }).catch(() => setDebtsLoading(false))
  }, [businessId])

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

  const dateSubtitle = activePreset > 0
    ? `Last ${activePreset} days`
    : `${dateRange.start} to ${dateRange.end}`

  const hasData = profit !== null || summary !== null
  const profitMargin = profit && profit.total_revenue > 0
    ? ((profit.total_profit / profit.total_revenue) * 100).toFixed(1)
    : null

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        subtitle="Profit & analytics overview"
        actions={
          <div className="relative">
            <button
              onClick={() => showDatePicker ? setShowDatePicker(false) : handleOpenDatePicker()}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-surfaceAlt transition-colors min-h-[44px]"
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
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
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
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">To</label>
                    <input
                      type="date"
                      value={draftDateRange.end}
                      onChange={(e) => handleCustomDateChange('end', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:border-primary outline-none"
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
        }
      />

      {error && (
        <div className="mb-6">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      ) : (
        <>
          {profit && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCedi(profit.total_revenue)}
                </p>
                <p className="text-[10px] text-neutral-light mt-1">{dateSubtitle}</p>
              </div>
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Profit</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {formatCedi(profit.total_profit)}
                </p>
                {profitMargin && (
                  <p className="text-[10px] text-neutral-light mt-1">{profitMargin}% margin</p>
                )}
              </div>
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Cost</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCedi(profit.total_cost)}
                </p>
              </div>
              {summary && (
                <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5">
                  <p className="text-xs text-neutral-light uppercase tracking-wider">Sales Count</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {summary.total_sales.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {summary && !profit && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCedi(summary.total_revenue)}
                </p>
              </div>
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Profit</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {formatCedi(summary.total_profit)}
                </p>
              </div>
            </div>
          )}

          {saleSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Units Sold</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {(saleSummary.sold_quantity ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Cash</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCedi(saleSummary.cash_total ?? 0)}
                </p>
              </div>
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Mobile Money</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCedi(saleSummary.momo_total ?? 0)}
                </p>
              </div>
              <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Card</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCedi(saleSummary.card_total ?? 0)}
                </p>
              </div>
              {saleSummary.best_selling_product && (
                <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4 col-span-2 sm:col-span-1">
                  <p className="text-xs text-neutral-light uppercase tracking-wider">Best Seller</p>
                  <p className="text-xl font-bold text-primary mt-1 truncate">
                    {saleSummary.best_selling_product}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mb-6">
            <RevenueChart data={chartData} />
          </div>

          {debtsLoading ? (
            <div className="skeleton h-40 rounded-2xl mb-6" />
          ) : debts.length > 0 ? (
            <section className="bg-surface rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Debts Report</h3>
                <p className="text-xs text-neutral-light mt-0.5">
                  {debts.filter((d) => !d.is_paid).length} unpaid ·{' '}
                  {formatCedi(debts.filter((d) => !d.is_paid).reduce((sum, d) => sum + Number(d.amount || 0), 0))} outstanding
                </p>
              </div>
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-light border-b border-gray-200">
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Due Date</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map((d, idx) => {
                      const customer = customersById[d.customer_id]
                      const overdue = d.due_date && !d.is_paid && new Date(d.due_date) < new Date()
                      return (
                        <tr key={d.debt_id ?? idx} className="border-b border-gray-100 last:border-0">
                          <td className="px-5 py-3">
                            <span className="font-medium text-gray-900">{customer?.name || 'Customer'}</span>
                            <span className="text-xs text-neutral-light"> · #{d.customer_id}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`font-semibold ${d.is_paid ? 'text-gray-400 line-through' : 'text-danger'}`}>
                              {formatCedi(d.amount)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-700">
                            {d.due_date ? new Date(d.due_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-5 py-3">
                            {d.is_paid ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-success-light text-success">Paid</span>
                            ) : overdue ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-danger-light text-danger">Overdue</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning-light text-warning">Unpaid</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden divide-y divide-gray-100 px-4">
                {debts.map((d, idx) => {
                  const customer = customersById[d.customer_id]
                  const overdue = d.due_date && !d.is_paid && new Date(d.due_date) < new Date()
                  return (
                    <div key={d.debt_id ?? idx} className="py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{customer?.name || 'Customer'}</span>
                        <span className={`font-semibold ${d.is_paid ? 'text-gray-400 line-through' : 'text-danger'}`}>
                          {formatCedi(d.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-neutral-light">
                          {d.due_date ? `Due ${new Date(d.due_date).toLocaleDateString()}` : 'No due date'}
                        </span>
                        {d.is_paid ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-success-light text-success">Paid</span>
                        ) : overdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-danger-light text-danger">Overdue</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning-light text-warning">Unpaid</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {!hasData && (
            <EmptyState
              icon={<ChartIcon className="w-6 h-6 text-primary" />}
              title="No data for this period"
              description="Try selecting a different date range, or record some sales first."
            />
          )}
        </>
      )}
    </div>
  )
}
