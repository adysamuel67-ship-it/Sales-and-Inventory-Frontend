import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal as RNModal,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import SimpleLineChart from '@/components/ui/SimpleLineChart'
import SimpleBarChart from '@/components/ui/SimpleBarChart'
import { reportAPI, productAPI, saleAPI } from '@/lib/api'
import { extractSummary, extractArray, getDateRange, formatCurrency, mapLowStock, mapSale, isStaffRole, formatPayment, generateDateLabels } from '@/lib/utils'
import { Colors, BORDER_RADIUS, FONT_SIZE, SPACING } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AlertBadge from '@/components/ui/AlertBadge'
import Card from '@/components/ui/Card'
import GradientHero from '@/components/ui/GradientHero'
import KpiCard from '@/components/ui/KpiCard'

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
]

function isBorrow(sale: any): boolean {
  if (sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0) return true
  if (sale.payment_status === 'partial' || sale.payment_status === 'borrowed' || sale.payment_status === 'unpaid') return true
  return false
}

export default function BusinessDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, currentBusiness } = useAuth()
  const businessId = Number(id) || currentBusiness?.business_id || 0
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<{ total_revenue: number; total_profit: number; total_sales: number; total_products: number } | null>(null)
  const [todaySummary, setTodaySummary] = useState<{ total_revenue: number; total_profit: number; total_sales: number; total_products: number } | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [activePreset, setActivePreset] = useState(30)
  const [staffView, setStaffView] = useState<'today' | 'week'>('today')
  const [activityTab, setActivityTab] = useState<'all' | 'sales' | 'borrows'>('all')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [showSaleDetail, setShowSaleDetail] = useState(false)

  const isStaff = isStaffRole(user?.business_role || user?.role)

  const { paidSales, borrowSales } = useMemo(() => {
    const paid: any[] = []
    const borrowed: any[] = []
    for (const s of recentSales) {
      if (isBorrow(s)) borrowed.push(s)
      else paid.push(s)
    }
    return { paidSales: paid, borrowSales: borrowed }
  }, [recentSales])

  const displaySales = activityTab === 'borrows' ? borrowSales : activityTab === 'sales' ? paidSales : recentSales

  const fetchData = useCallback(async () => {
    if (!businessId) return
    setError('')

    const effectiveRange = isStaff
      ? staffView === 'today' ? getDateRange(0) : getDateRange(7)
      : getDateRange(activePreset)

    try {
      const [summaryRes, lowStockRes, salesRes] = await Promise.allSettled([
        reportAPI.summary(businessId, effectiveRange.start, effectiveRange.end),
        productAPI.lowStock(businessId),
        saleAPI.list(businessId, { skip: 0, limit: 50 }),
      ])

      if (summaryRes.status === 'fulfilled') {
        const s = extractSummary(summaryRes.value.data)
        setSummary(s)
        setTodaySummary(s)
      }

      if (lowStockRes.status === 'fulfilled') {
        const items = extractArray(lowStockRes.value.data)
        setLowStock(items.slice(0, 5).map(mapLowStock))
      }

      let allSales: any[] = []
      if (salesRes.status === 'fulfilled') {
        allSales = extractArray(salesRes.value.data)
        setRecentSales(allSales.slice(0, 10).map((item) => mapSale(item)))
      }

      const rawSales = allSales.filter((s: any) => {
        if (!s.created_at) return false
        const d = new Date(s.created_at)
        const start = new Date(effectiveRange.start)
        const end = new Date(effectiveRange.end)
        end.setHours(23, 59, 59, 999)
        return d >= start && d <= end
      })

      const allDateLabels = generateDateLabels(effectiveRange.start, effectiveRange.end)
      const dailyMap: Record<string, { revenue: number; count: number }> = {}
      for (const label of allDateLabels) {
        dailyMap[label] = { revenue: 0, count: 0 }
      }

      for (const s of rawSales) {
        const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : null
        if (!dateStr || !dailyMap[dateStr]) continue
        dailyMap[dateStr].revenue += Number(s.total_amount ?? s.amount ?? 0)
        dailyMap[dateStr].count += 1
      }

      const chartPoints = Object.entries(dailyMap)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([day, v]) => ({
          x: v.revenue,
          y: 0,
          label: day.slice(5),
        }))

      const chartDataWithIndex = chartPoints.map((pt, i) => ({
        x: i + 1,
        y: pt.x,
        label: pt.label,
      }))

      setChartData(chartDataWithIndex)
    } catch {
      setError('Failed to load dashboard data')
    }
  }, [businessId, activePreset, isStaff, staffView])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const dateSubtitle = isStaff
    ? staffView === 'today' ? 'Today' : 'Last 7 days'
    : `Last ${activePreset} days`

  if (loading) return <LoadingSpinner fullScreen message="Loading dashboard..." />

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <GradientHero topInset={54} height={196}>
        <View style={styles.heroInner}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroGreeting}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋</Text>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroIconBtn} onPress={() => router.push(`/business/${businessId}/notifications` as any)}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                <View style={styles.heroNotifDot} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/profile')} style={styles.heroAvatarBtn}>
                <View style={styles.heroAvatar}>
                  <Text style={styles.heroAvatarText}>{(user?.name || 'U')[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.heroOnlineDot} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroName}>{user?.name?.split(' ')[0] || 'User'}</Text>
            <Text style={styles.heroSubtitle}>{currentBusiness?.name || 'Your Business'}</Text>
          </View>

          <View style={styles.heroRevenueCard}>
            <View style={styles.heroRevenueLabel}>
              <View style={styles.heroRevenueDot} />
              <Text style={styles.heroRevenueLabelText}>Total Revenue · {dateSubtitle}</Text>
            </View>
            <Text style={styles.heroRevenueValue}>{formatCurrency(summary?.total_revenue ?? 0).replace('GH₵ ', '₵')}</Text>
            <Text style={styles.heroRevenueSub}>{summary?.total_sales ?? 0} sales · {summary?.total_products ?? 0} products</Text>
          </View>
        </View>
      </GradientHero>

      <View style={styles.body}>
        {error ? <AlertBadge message={error} type="error" /> : null}

        {isStaff ? (
          <View style={styles.viewToggle}>
            <TouchableOpacity style={[styles.viewBtn, staffView === 'today' && styles.viewBtnActive]} onPress={() => setStaffView('today')}>
              <Ionicons name="sunny" size={14} color={staffView === 'today' ? '#FFF' : Colors.textLight} />
              <Text style={[styles.viewBtnText, staffView === 'today' && styles.viewBtnTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.viewBtn, staffView === 'week' && styles.viewBtnActive]} onPress={() => setStaffView('week')}>
              <Ionicons name="calendar" size={14} color={staffView === 'week' ? '#FFF' : Colors.textLight} />
              <Text style={[styles.viewBtnText, staffView === 'week' && styles.viewBtnTextActive]}>This Week</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.datePresetRow}>
            {DATE_PRESETS.map((p) => (
              <TouchableOpacity key={p.label} style={[styles.datePill, activePreset === p.days && styles.datePillActive]} onPress={() => setActivePreset(p.days)}>
                <Text style={[styles.datePillText, activePreset === p.days && styles.datePillTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.dateRangeInfo}>
              <Ionicons name="time-outline" size={12} color={Colors.textLight} />
              <Text style={styles.dateRangeText}>{dateSubtitle}</Text>
            </View>
          </View>
        )}

        {isStaff ? (
          <View style={styles.kpiGrid}>
            <KpiCard title="Revenue" value={todaySummary?.total_revenue != null ? formatCurrency(todaySummary.total_revenue) : '---'} icon="trending-up" color="primary" subtitle="Today" />
            <KpiCard title="Sales" value={todaySummary?.total_sales != null ? String(todaySummary.total_sales) : '---'} icon="receipt" color="success" subtitle="Today" />
            <KpiCard title="Sales · 7d" value={summary?.total_sales != null ? String(summary.total_sales) : '---'} icon="stats-chart" color="warning" subtitle="This week" />
            <KpiCard title="Low Stock" value={String(lowStock.length)} icon="warning" color="danger" subtitle="Restock now" />
          </View>
        ) : (
          <View style={styles.kpiGrid}>
            <KpiCard title="Revenue" value={summary?.total_revenue != null ? formatCurrency(summary.total_revenue) : '---'} icon="trending-up" color="primary" subtitle={dateSubtitle} />
            <KpiCard title="Profit" value={summary?.total_profit != null ? formatCurrency(summary.total_profit) : '---'} icon="wallet" color="success" subtitle={dateSubtitle} />
            <KpiCard title="Sales" value={summary?.total_sales != null ? String(summary.total_sales) : '---'} icon="receipt" color="warning" subtitle={dateSubtitle} />
            <KpiCard title="Products" value={summary?.total_products != null ? String(summary.total_products) : '---'} icon="cube" color="purple" subtitle="In stock" />
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="bar-chart" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Revenue Chart</Text>
          </View>
          <View style={styles.chartToggle}>
            <TouchableOpacity
              style={[styles.chartToggleBtn, chartType === 'line' && styles.chartToggleActive]}
              onPress={() => setChartType('line')}
            >
              <Ionicons name="trending-up" size={14} color={chartType === 'line' ? '#FFF' : Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartToggleBtn, chartType === 'bar' && styles.chartToggleActive]}
              onPress={() => setChartType('bar')}
            >
              <Ionicons name="bar-chart" size={14} color={chartType === 'bar' ? '#FFF' : Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartCard}>
          {chartData.length > 0 ? (
            chartType === 'line' ? (
              <SimpleLineChart data={chartData} height={200} showDots={false} />
            ) : (
              <SimpleBarChart
                data={chartData.map((d) => ({ y: d.y, label: d.label }))}
                height={200}
                barColor={Colors.primary}
              />
            )
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={40} color={Colors.border} />
              <Text style={styles.emptyChartText}>No chart data for this period</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="alert-circle" size={18} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Low Stock</Text>
          </View>
          <TouchableOpacity onPress={() => router.push(`/business/${businessId}/products` as any)} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.lowStockCard}>
          {lowStock.length > 0 ? (
            lowStock.map((item, i) => {
              const urgency = item.stock <= item.threshold * 0.3 ? 'critical' : item.stock <= item.threshold * 0.6 ? 'warning' : 'normal'
              const colors = {
                critical: { bg: Colors.dangerLight, accent: Colors.danger, icon: 'alert-circle' as const },
                warning: { bg: Colors.warningLight, accent: Colors.warning, icon: 'alert' as const },
                normal: { bg: Colors.primaryLight, accent: Colors.primary, icon: 'information-circle' as const },
              }
              const c = colors[urgency]
              return (
                <View key={i} style={[styles.lowStockItem, i < lowStock.length - 1 && styles.lowStockItemBorder]}>
                  <View style={[styles.lowStockIcon, { backgroundColor: c.bg }]}>
                    <Ionicons name={c.icon} size={18} color={c.accent} />
                  </View>
                  <View style={styles.lowStockInfo}>
                    <Text style={styles.lowStockName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.lowStockDetail}>{item.stock} {item.unit} left · Min: {item.threshold}</Text>
                  </View>
                  <View style={[styles.lowStockBadge, { backgroundColor: c.bg }]}>
                    <Text style={[styles.lowStockBadgeText, { color: c.accent }]}>
                      {item.stock <= 0 ? 'OUT' : `${item.stock} left`}
                    </Text>
                  </View>
                </View>
              )
            })
          ) : (
            <View style={styles.emptyLowStock}>
              <View style={styles.emptyLowStockIcon}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              </View>
              <Text style={styles.emptyLowStockText}>All products are well stocked</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="receipt" size={18} color={Colors.emerald} />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          <TouchableOpacity onPress={() => router.push(`/business/${businessId}/sales` as any)} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityTabs}>
            {([
              { key: 'all' as const, label: 'All', count: recentSales.length, icon: 'apps' as const },
              { key: 'sales' as const, label: 'Paid', count: paidSales.length, icon: 'card' as const },
              { key: 'borrows' as const, label: 'Borrow', count: borrowSales.length, icon: 'time' as const },
            ]).map((tab) => (
              <TouchableOpacity key={tab.key} style={[styles.activityTab, activityTab === tab.key && styles.activityTabActive]} onPress={() => setActivityTab(tab.key)}>
                <Ionicons name={tab.icon} size={12} color={activityTab === tab.key ? '#FFF' : Colors.textLight} />
                <Text style={[styles.activityTabText, activityTab === tab.key && styles.activityTabTextActive]}>{tab.label}</Text>
                <View style={[styles.activityTabCount, activityTab === tab.key && styles.activityTabCountActive]}>
                  <Text style={[styles.activityTabCountText, activityTab === tab.key && styles.activityTabCountTextActive]}>{tab.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {displaySales.length > 0 ? (
            displaySales.map((sale, i) => {
              const borrow = isBorrow(sale)
              return (
                <TouchableOpacity
                  key={sale.id || i}
                  style={[styles.saleItem, i < displaySales.length - 1 && styles.saleItemBorder]}
                  onPress={() => { setSelectedSale(sale); setShowSaleDetail(true) }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.saleItemIcon, { backgroundColor: borrow ? Colors.warningLight : Colors.successLight }]}>
                    <Ionicons name={borrow ? 'time' : 'checkmark'} size={16} color={borrow ? Colors.warning : Colors.success} />
                  </View>
                  <View style={styles.saleItemContent}>
                    <Text style={styles.saleItemName} numberOfLines={1}>{sale.product}</Text>
                    <Text style={styles.saleItemMeta}>Qty {sale.qty} · {formatPayment(sale.payment)}</Text>
                  </View>
                  <View style={styles.saleItemRight}>
                    <Text style={[styles.saleItemAmount, borrow && { color: Colors.warning }]}>{sale.amount > 0 ? formatCurrency(sale.amount) : '---'}</Text>
                    <Text style={styles.saleItemDate}>{sale.time?.split(',')[0] || ''}</Text>
                  </View>
                </TouchableOpacity>
              )
            })
          ) : (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyActivityIcon}>
                <Ionicons name="receipt-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.emptyActivityTitle}>No activity yet</Text>
              <Text style={styles.emptyActivityMsg}>Record a sale to get started</Text>
              <TouchableOpacity style={styles.addSaleBtn} onPress={() => router.push(`/business/${businessId}/sales` as any)}>
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.addSaleBtnText}>Add Sale</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {summary && summary.total_sales === 0 && lowStock.length === 0 && (
          <View style={styles.emptyDashboard}>
            <Ionicons name="analytics-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyDashboardTitle}>No data yet</Text>
            <Text style={styles.emptyDashboardMsg}>Start making sales to see your dashboard analytics</Text>
          </View>
        )}
      </View>
    </ScrollView>

    <RNModal visible={showSaleDetail} animationType="slide" presentationStyle="pageSheet">
      <View style={s.modalNav}>
        <TouchableOpacity onPress={() => setShowSaleDetail(false)}>
          <Text style={s.modalAction}>Close</Text>
        </TouchableOpacity>
        <Text style={s.modalTitle}>Sale Details</Text>
        <View style={{ width: 60 }} />
      </View>
      {selectedSale && (
        <ScrollView style={s.modalScroll}>
          <View style={s.detailTopBar}>
            <View style={[s.detailBadge, { backgroundColor: (selectedSale.payment_status === 'fully_paid' || !isBorrow(selectedSale) ? Colors.success : Colors.warning) + '20' }]}>
              <Text style={[s.detailBadgeText, { color: selectedSale.payment_status === 'fully_paid' || !isBorrow(selectedSale) ? Colors.success : Colors.warning }]}>
                {isBorrow(selectedSale) ? 'Pending' : 'Paid'}
              </Text>
            </View>
            <Text style={s.detailDate}>{selectedSale.time}</Text>
          </View>

          <Card style={{ marginBottom: 12 }}>
            <View style={s.detailRow}>
              <Text style={s.detailRowLabel}>Sale ID</Text>
              <Text style={s.detailRowValue}>#{selectedSale.id}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailRowLabel}>Total Amount</Text>
              <Text style={s.detailRowValue}>{formatCurrency(selectedSale.amount)}</Text>
            </View>
            {selectedSale.amount_paid != null && selectedSale.amount_paid < selectedSale.amount && (
              <>
                <View style={s.detailRow}>
                  <Text style={s.detailRowLabel}>Amount Paid</Text>
                  <Text style={[s.detailRowValue, { color: Colors.success }]}>{formatCurrency(selectedSale.amount_paid)}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailRowLabel}>Remaining</Text>
                  <Text style={[s.detailRowValue, { color: Colors.danger }]}>{formatCurrency(selectedSale.amount - selectedSale.amount_paid)}</Text>
                </View>
              </>
            )}
          </Card>

          {selectedSale.sales_items && selectedSale.sales_items.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <Text style={s.detailSectionTitle}>Items ({selectedSale.sales_items.length})</Text>
              {selectedSale.sales_items.map((item: any, i: number) => (
                <View key={i} style={[s.detailItemRow, i < selectedSale.sales_items.length - 1 && s.detailItemBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailItemName}>{item.product_name || `Product #${item.product_id}`}</Text>
                    <Text style={s.detailItemMeta}>{item.quantity} × {formatCurrency(item.unit_price || 0)}</Text>
                  </View>
                  <Text style={s.detailItemTotal}>{formatCurrency(item.subtotal || item.quantity * (item.unit_price || 0))}</Text>
                </View>
              ))}
            </Card>
          )}

          <Card style={{ marginBottom: 12 }}>
            <Text style={s.detailSectionTitle}>Payment Info</Text>
            <View style={s.detailInfoRow}>
              <Text style={s.detailInfoLabel}>Method</Text>
              <Text style={s.detailInfoValue}>{formatPayment(selectedSale.payment)}</Text>
            </View>
            {selectedSale.customer_name && (
              <View style={s.detailInfoRow}>
                <Text style={s.detailInfoLabel}>Customer</Text>
                <Text style={s.detailInfoValue}>{selectedSale.customer_name}</Text>
              </View>
            )}
            {selectedSale.sold_by_name && (
              <View style={s.detailInfoRow}>
                <Text style={s.detailInfoLabel}>Sold By</Text>
                <Text style={s.detailInfoValue}>{selectedSale.sold_by_name}</Text>
              </View>
            )}
            {selectedSale.note && (
              <View style={s.detailInfoRow}>
                <Text style={s.detailInfoLabel}>Note</Text>
                <Text style={s.detailInfoValue}>{selectedSale.note}</Text>
              </View>
            )}
          </Card>
        </ScrollView>
      )}
    </RNModal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  heroInner: { flex: 1, paddingHorizontal: 20, paddingTop: 2 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconBtn: { position: 'relative', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  heroNotifDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger, borderWidth: 1.5, borderColor: '#fff' },
  heroAvatarBtn: { position: 'relative' },
  heroAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  heroAvatarText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  heroOnlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#2563EB' },
  heroGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  heroTitleBlock: { marginTop: 14 },
  heroName: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 2 },

  heroRevenueCard: {
    marginTop: 18, backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: BORDER_RADIUS.xl, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroRevenueLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroRevenueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7DD3FC' },
  heroRevenueLabelText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.3 },
  heroRevenueValue: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1, marginTop: 8 },
  heroRevenueSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6, fontWeight: '500' },

  body: { padding: 16, gap: 12 },

  viewToggle: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: 3 },
  viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.md },
  viewBtnActive: { backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  viewBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.textLight },
  viewBtnTextActive: { color: '#FFF' },

  datePresetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  datePill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: BORDER_RADIUS.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  datePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  datePillText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.textLight },
  datePillTextActive: { color: '#FFFFFF' },
  dateRangeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 6 },
  dateRangeText: { fontSize: FONT_SIZE.xs, color: Colors.textLight },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  chartCard: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  chartToggle: { flexDirection: 'row', gap: 4, backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, padding: 2 },
  chartToggleBtn: { width: 32, height: 28, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  chartToggleActive: { backgroundColor: Colors.primary },
  emptyChart: { alignItems: 'center', paddingVertical: 32 },
  emptyChartText: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: 8 },

  lowStockCard: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  lowStockItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  lowStockItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  lowStockIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lowStockInfo: { flex: 1 },
  lowStockName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  lowStockDetail: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  lowStockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  lowStockBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyLowStock: { alignItems: 'center', paddingVertical: 28 },
  emptyLowStockIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyLowStockText: { fontSize: 14, color: Colors.textLight, fontWeight: '500' },

  activityCard: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  activityTabs: { flexDirection: 'row', padding: 8, gap: 4 },
  activityTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: BORDER_RADIUS.md },
  activityTabActive: { backgroundColor: Colors.primary },
  activityTabText: { fontSize: 11, fontWeight: '600', color: Colors.textLight },
  activityTabTextActive: { color: '#FFF' },
  activityTabCount: { backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  activityTabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  activityTabCountText: { fontSize: 9, fontWeight: '700', color: Colors.textLight },
  activityTabCountTextActive: { color: '#FFF' },

  saleItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  saleItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  saleItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saleItemContent: { flex: 1 },
  saleItemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  saleItemMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  saleItemRight: { alignItems: 'flex-end' },
  saleItemAmount: { fontSize: 14, fontWeight: '700', color: Colors.text },
  saleItemDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },

  emptyActivity: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  emptyActivityIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyActivityTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  emptyActivityMsg: { fontSize: 13, color: Colors.textLight, marginBottom: 16 },
  addSaleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BORDER_RADIUS.full },
  addSaleBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  emptyDashboard: { alignItems: 'center', paddingVertical: 40 },
  emptyDashboardTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptyDashboardMsg: { fontSize: 14, color: Colors.textLight, marginTop: 4 },
})

const s = StyleSheet.create({
  modalNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalAction: { fontSize: 16, color: Colors.primary },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalScroll: { flex: 1, padding: 20 },
  detailTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  detailBadgeText: { fontSize: 13, fontWeight: '700' },
  detailDate: { fontSize: 12, color: Colors.textLight },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  detailRowLabel: { fontSize: 14, color: Colors.textLight },
  detailRowValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  detailSectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  detailItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailItemName: { fontSize: 14, fontWeight: '500', color: Colors.text },
  detailItemMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  detailItemTotal: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  detailInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  detailInfoLabel: { fontSize: 13, color: Colors.textLight },
  detailInfoValue: { fontSize: 14, fontWeight: '500', color: Colors.text },
})
