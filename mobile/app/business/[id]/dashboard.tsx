import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis, VictoryTheme } from 'victory-native'
import { reportAPI, productAPI, saleAPI } from '@/lib/api'
import { extractSummary, extractArray, getDateRange, formatCurrency, mapLowStock, mapSale } from '@/lib/utils'
import { Colors } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import KpiCard from '@/components/ui/KpiCard'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
]

export default function BusinessDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const businessId = Number(id)
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<{ total_revenue: number; total_profit: number; total_sales: number; total_products: number } | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [activePreset, setActivePreset] = useState(30)
  const [staffView, setStaffView] = useState<'today' | 'week'>('today')

  const fetchData = useCallback(async () => {
    if (!businessId) return
    setError('')
    try {
      const range = getDateRange(activePreset)
      const [summaryRes, lowStockRes, salesRes] = await Promise.allSettled([
        reportAPI.summary(businessId, range.start, range.end),
        productAPI.lowStock(businessId),
        saleAPI.list(businessId, { skip: 0, limit: 10 }),
      ])

      if (summaryRes.status === 'fulfilled') {
        const s = extractSummary(summaryRes.value.data)
        setSummary(s)

        const dashData = summaryRes.value.data?.data || summaryRes.value.data || {}
        const revenueOverTime = dashData.revenue_over_time || dashData.revenue_chart || []
        if (Array.isArray(revenueOverTime) && revenueOverTime.length > 0) {
          setChartData(revenueOverTime.map((d: any, i: number) => ({
            x: i + 1,
            y: Number(d.revenue || d.amount || d.total || 0),
            label: d.date || d.label || '',
          })))
        } else {
          setChartData([])
        }
      }

      if (lowStockRes.status === 'fulfilled') {
        const items = extractArray(lowStockRes.value.data)
        setLowStock(items.slice(0, 5).map(mapLowStock))
      }

      if (salesRes.status === 'fulfilled') {
        const items = extractArray(salesRes.value.data)
        setRecentSales(items.slice(0, 5).map((item) => mapSale(item)))
      }
    } catch {
      setError('Failed to load dashboard data')
    }
  }, [businessId, activePreset])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  if (loading) return <LoadingSpinner fullScreen message="Loading dashboard..." />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'User'}</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {error ? <AlertBadge message={error} type="error" /> : null}

      <View style={styles.presetRow}>
        {DATE_PRESETS.map((p) => (
          <TouchableOpacity
            key={p.label}
            style={[styles.presetBtn, activePreset === p.days && styles.presetActive]}
            onPress={() => setActivePreset(p.days)}
          >
            <Text style={[styles.presetText, activePreset === p.days && styles.presetTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.kpiRow}>
        <KpiCard title="Revenue" value={formatCurrency(summary?.total_revenue ?? 0)} icon="trending-up" color={Colors.primary} />
        <KpiCard title="Profit" value={formatCurrency(summary?.total_profit ?? 0)} icon="wallet" color={Colors.success} />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard title="Sales" value={String(summary?.total_sales ?? 0)} icon="receipt" color={Colors.warning} />
        <KpiCard title="Products" value={String(summary?.total_products ?? 0)} icon="cube" color="#8B5CF6" />
      </View>

      {chartData.length > 0 && (
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.chartContainer}>
            <VictoryChart height={200} padding={{ top: 10, bottom: 30, left: 50, right: 20 }}>
              <VictoryAxis style={{ tickLabels: { fontSize: 10, fill: Colors.textLight } }} />
              {/* @ts-ignore - dependentAxis is valid at runtime but missing from victory-native types */}
              <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10, fill: Colors.textLight } }} />
              <VictoryArea
                data={chartData}
                interpolation="monotoneX"
                style={{ data: { fill: Colors.primaryLight, stroke: Colors.primary, strokeWidth: 2 } }}
              />
              <VictoryLine
                data={chartData}
                interpolation="monotoneX"
                style={{ data: { stroke: Colors.primary, strokeWidth: 2 } }}
              />
            </VictoryChart>
          </View>
        </Card>
      )}

      {lowStock.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
          {lowStock.map((item, i) => (
            <View key={i} style={styles.alertRow}>
              <Ionicons name="warning" size={18} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertName}>{item.name}</Text>
                <Text style={styles.alertDetail}>{item.stock} {item.unit} left (min: {item.threshold})</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {recentSales.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          {recentSales.map((sale) => (
            <View key={sale.id} style={styles.saleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.saleProduct} numberOfLines={1}>{sale.product}</Text>
                <Text style={styles.saleDetail}>{sale.qty} items · {sale.time}</Text>
              </View>
              <Text style={styles.saleAmount}>{formatCurrency(sale.amount)}</Text>
            </View>
          ))}
        </Card>
      )}

      {summary && summary.total_sales === 0 && lowStock.length === 0 && (
        <EmptyState icon="analytics-outline" title="No data yet" message="Start making sales to see your dashboard analytics" />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: Colors.textLight },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  backBtn: { padding: 8 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  presetBtn: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  presetActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  presetTextActive: { color: '#FFFFFF' },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  chartCard: { marginBottom: 16, marginTop: 4 },
  chartContainer: { marginTop: 8, alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  alertName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  alertDetail: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  saleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  saleProduct: { fontSize: 14, fontWeight: '600', color: Colors.text },
  saleDetail: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: '700', color: Colors.primary },
})
