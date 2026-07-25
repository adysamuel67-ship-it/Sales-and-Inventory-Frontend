import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Dimensions,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import SimpleLineChart from '@/components/ui/SimpleLineChart'
import { reportAPI, saleAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { extractProfit, extractArray, getDateRange, formatCurrency, extractSummary, formatPayment, generateDateLabels } from '@/lib/utils'
import { Colors, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AlertBadge from '@/components/ui/AlertBadge'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 44) / 2

const DATE_PRESETS = [
  { label: '7d', days: 7, icon: 'calendar' as const },
  { label: '30d', days: 30, icon: 'calendar' as const },
  { label: '90d', days: 90, icon: 'calendar' as const },
]

export default function ReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { currentBusiness } = useAuth()
  const businessId = id ? Number(id) : currentBusiness?.business_id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activePreset, setActivePreset] = useState(30)
  const [profitData, setProfitData] = useState<any>(null)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    if (!businessId) return
    setError('')
    try {
      const range = getDateRange(activePreset)
      const [profitRes, summaryRes, salesRes] = await Promise.allSettled([
        reportAPI.profit(businessId, range.start, range.end),
        reportAPI.summary(businessId, range.start, range.end),
        saleAPI.list(businessId, { skip: 0, limit: 200 }),
      ])
      if (profitRes.status === 'fulfilled') {
        setProfitData(extractProfit(profitRes.value.data))
      }
      if (summaryRes.status === 'fulfilled') {
        setSummaryData(summaryRes.value.data?.data || summaryRes.value.data || {})
      }

      let allSales: any[] = []
      if (salesRes.status === 'fulfilled') {
        allSales = extractArray(salesRes.value.data)
      }

      const rawSales = allSales.filter((s: any) => {
        if (!s.created_at) return false
        const d = new Date(s.created_at)
        const start = new Date(range.start)
        const end = new Date(range.end)
        end.setHours(23, 59, 59, 999)
        return d >= start && d <= end
      })

      const allDateLabels = generateDateLabels(range.start, range.end)
      const dailyMap: Record<string, { revenue: number }> = {}
      for (const label of allDateLabels) {
        dailyMap[label] = { revenue: 0 }
      }
      for (const s of rawSales) {
        const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : null
        if (!dateStr || !dailyMap[dateStr]) continue
        dailyMap[dateStr].revenue += Number(s.total_amount ?? s.amount ?? 0)
      }

      const chartPoints = Object.entries(dailyMap)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([day, v]) => ({ x: 0, y: v.revenue, label: day.slice(5) }))

      setChartData(chartPoints.map((pt, i) => ({ x: i + 1, y: pt.y })))
    } catch {
      setError('Failed to load reports')
    }
  }, [businessId, activePreset])

  useEffect(() => { setLoading(true); fetchData().finally(() => setLoading(false)) }, [fetchData])

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }, [fetchData])

  if (loading) return <LoadingSpinner fullScreen message="Loading reports..." />

  const profitColor = (profitData?.total_profit ?? 0) >= 0 ? Colors.success : Colors.danger

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <View style={styles.heroBanner}>
        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Reports & Analytics</Text>
          <Text style={styles.heroSubtitle}>Track your business performance</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.datePresetRow}>
          {DATE_PRESETS.map((p) => (
            <TouchableOpacity key={p.label} style={[styles.datePill, activePreset === p.days && styles.datePillActive]} onPress={() => setActivePreset(p.days)}>
              <Text style={[styles.datePillText, activePreset === p.days && styles.datePillTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.dateRangeInfo}>
            <Ionicons name="time-outline" size={12} color={Colors.textLight} />
            <Text style={styles.dateRangeText}>Last {activePreset} days</Text>
          </View>
        </View>

        {error ? <AlertBadge message={error} type="error" /> : null}

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.primary }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="trending-up" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(profitData?.total_revenue ?? 0)}</Text>
            <Text style={styles.kpiTitle}>Revenue</Text>
            <View style={[styles.kpiTrend, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="time" size={10} color={Colors.primary} />
              <Text style={[styles.kpiTrendText, { color: Colors.primary }]}>Period</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="wallet" size={20} color={Colors.warning} />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(profitData?.total_cost ?? 0)}</Text>
            <Text style={styles.kpiTitle}>Cost</Text>
            <View style={[styles.kpiTrend, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="time" size={10} color={Colors.warning} />
              <Text style={[styles.kpiTrendText, { color: Colors.warning }]}>Period</Text>
            </View>
          </View>

          <View style={[styles.kpiCardWide, { borderLeftColor: profitColor }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: profitColor + '15' }]}>
              <Ionicons name="cash" size={20} color={profitColor} />
            </View>
            <Text style={[styles.kpiValueWide, { color: profitColor }]}>{formatCurrency(profitData?.total_profit ?? 0)}</Text>
            <Text style={styles.kpiTitle}>Net Profit</Text>
            <View style={[styles.kpiTrend, { backgroundColor: profitColor + '15' }]}>
              <Ionicons name={(profitData?.total_profit ?? 0) >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={profitColor} />
              <Text style={[styles.kpiTrendText, { color: profitColor }]}>
                {(profitData?.total_profit ?? 0) >= 0 ? 'Positive' : 'Negative'}
              </Text>
            </View>
          </View>
        </View>

        {summaryData && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="bar-chart" size={18} color={Colors.emerald} />
                <Text style={styles.sectionTitle}>Sales Analytics</Text>
              </View>
            </View>

            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <View style={[styles.analyticsIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="cube" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.analyticsValue}>{summaryData.items_sold ?? summaryData.quantity_sold ?? '-'}</Text>
                <Text style={styles.analyticsLabel}>Qty Sold</Text>
              </View>
              <View style={styles.analyticsItem}>
                <View style={[styles.analyticsIcon, { backgroundColor: Colors.successLight }]}>
                  <Ionicons name="receipt" size={16} color={Colors.success} />
                </View>
                <Text style={styles.analyticsValue}>{summaryData.sales_count ?? summaryData.total_sales ?? '-'}</Text>
                <Text style={styles.analyticsLabel}>Total Sales</Text>
              </View>
            </View>

            {summaryData?.payment_breakdown && (
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
                {Object.entries(summaryData.payment_breakdown).map(([method, count]) => {
                  const colors: Record<string, { bg: string; accent: string; icon: any }> = {
                    cash: { bg: Colors.successLight, accent: Colors.success, icon: 'cash-outline' },
                    mobile_money: { bg: Colors.primaryLight, accent: Colors.primary, icon: 'phone-portrait-outline' },
                    card: { bg: Colors.warningLight, accent: Colors.warning, icon: 'card-outline' },
                  }
                  const c = colors[method] || { bg: Colors.surfaceAlt, accent: Colors.textLight, icon: 'help-outline' }
                  return (
                    <View key={method} style={styles.breakdownRow}>
                      <View style={[styles.breakdownIcon, { backgroundColor: c.bg }]}>
                        <Ionicons name={c.icon} size={14} color={c.accent} />
                      </View>
                      <Text style={styles.breakdownMethod}>{formatPayment(method)}</Text>
                      <Text style={[styles.breakdownCount, { color: c.accent }]}>{String(count)} sales</Text>
                    </View>
                  )
                })}
              </View>
            )}

            {summaryData?.best_selling_product && (
              <View style={styles.bestSellingSection}>
                <View style={styles.bestSellingIcon}>
                  <Ionicons name="trophy" size={16} color={Colors.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bestSellingLabel}>Best Selling Product</Text>
                  <Text style={styles.bestSellingName}>{summaryData.best_selling_product}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {chartData.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="trending-up" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Revenue Chart</Text>
              </View>
            </View>
            <View style={styles.chartContainer}>
              <SimpleLineChart data={chartData} height={200} />
            </View>
          </View>
        )}

        {!profitData && !summaryData && !loading && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="analytics-outline" size={40} color={Colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No data for this period</Text>
            <Text style={styles.emptyMessage}>Try selecting a different date range</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  heroBanner: {
    backgroundColor: Colors.navy,
    paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
    position: 'relative', overflow: 'hidden',
  },
  heroCircle1: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(37,99,235,0.3)' },
  heroCircle2: { position: 'absolute', bottom: -30, left: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(37,99,235,0.2)' },
  heroContent: { position: 'relative', zIndex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  body: { padding: 16, gap: 12 },

  datePresetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  datePill: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: BORDER_RADIUS.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  datePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  datePillText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.textLight },
  datePillTextActive: { color: '#FFFFFF' },
  dateRangeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 6 },
  dateRangeText: { fontSize: FONT_SIZE.xs, color: Colors.textLight },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: CARD_WIDTH, backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl,
    padding: 14, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  kpiCardWide: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl,
    padding: 16, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  kpiIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  kpiValueWide: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  kpiTitle: { fontSize: 12, color: Colors.textLight, fontWeight: '500' },
  kpiTrend: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, marginTop: 8, alignSelf: 'flex-start' },
  kpiTrendText: { fontSize: 10, fontWeight: '600' },

  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl,
    padding: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  analyticsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  analyticsItem: {
    flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg,
    padding: 14, alignItems: 'center',
  },
  analyticsIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  analyticsValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  analyticsLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '500', marginTop: 2 },

  breakdownSection: {
    borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 14, marginTop: 4,
  },
  breakdownTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  breakdownIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  breakdownMethod: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  breakdownCount: { fontSize: 13, fontWeight: '700' },

  bestSellingSection: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 14, marginTop: 12,
  },
  bestSellingIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.amberLight, alignItems: 'center', justifyContent: 'center' },
  bestSellingLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '500' },
  bestSellingName: { fontSize: 14, fontWeight: '700', color: Colors.amber, marginTop: 2 },

  chartContainer: { marginTop: 4, alignItems: 'center' },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 4 },
  emptyMessage: { fontSize: 14, color: Colors.textLight, marginTop: 6 },
})
