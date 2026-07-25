import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis } from 'victory-native'
import { reportAPI } from '@/lib/api'
import { extractProfit, extractArray, getDateRange, formatCurrency, extractSummary, formatPayment } from '@/lib/utils'
import { Colors } from '@/lib/constants'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AlertBadge from '@/components/ui/AlertBadge'

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export default function ReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const businessId = Number(id)
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
      const [profitRes, summaryRes] = await Promise.allSettled([
        reportAPI.profit(businessId, range.start, range.end),
        reportAPI.summary(businessId, range.start, range.end),
      ])
      if (profitRes.status === 'fulfilled') {
        setProfitData(extractProfit(profitRes.value.data))
      }
      if (summaryRes.status === 'fulfilled') {
        const d = summaryRes.value.data?.data || summaryRes.value.data || {}
        setSummaryData(d)
        const revenueOverTime = d.revenue_over_time || d.revenue_chart || []
        if (Array.isArray(revenueOverTime) && revenueOverTime.length > 0) {
          setChartData(revenueOverTime.map((item: any, i: number) => ({
            x: i + 1,
            y: Number(item.revenue || item.amount || item.total || 0),
          })))
        } else {
          setChartData([])
        }
      }
    } catch {
      setError('Failed to load reports')
    }
  }, [businessId, activePreset])

  useEffect(() => { setLoading(true); fetchData().finally(() => setLoading(false)) }, [fetchData])

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }, [fetchData])

  if (loading) return <LoadingSpinner fullScreen message="Loading reports..." />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.presetRow}>
        {DATE_PRESETS.map((p) => (
          <TouchableOpacity key={p.label} style={[styles.presetBtn, activePreset === p.days && styles.presetActive]} onPress={() => setActivePreset(p.days)}>
            <Text style={[styles.presetText, activePreset === p.days && styles.presetTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <AlertBadge message={error} type="error" /> : null}

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Profit Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Revenue</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatCurrency(profitData?.total_revenue ?? 0)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cost</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>{formatCurrency(profitData?.total_cost ?? 0)}</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryFull]}>
            <Text style={styles.summaryLabel}>Profit</Text>
            <Text style={[styles.summaryValue, { color: profitData?.total_profit >= 0 ? Colors.success : Colors.danger, fontSize: 24 }]}>
              {formatCurrency(profitData?.total_profit ?? 0)}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Sales Analytics</Text>
        {summaryData && (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Quantity Sold</Text>
              <Text style={styles.summaryValue}>{summaryData.items_sold ?? summaryData.quantity_sold ?? '-'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>{summaryData.sales_count ?? summaryData.total_sales ?? '-'}</Text>
            </View>
          </View>
        )}
        {summaryData?.payment_breakdown && (
          <View style={styles.paymentBreakdown}>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Payment Breakdown</Text>
            {Object.entries(summaryData.payment_breakdown).map(([method, count]) => (
              <View key={method} style={styles.breakdownRow}>
                <Text style={styles.breakdownMethod}>{formatPayment(method)}</Text>
                <Text style={styles.breakdownCount}>{String(count)} sales</Text>
              </View>
            ))}
          </View>
        )}
        {summaryData?.best_selling_product && (
          <View style={styles.bestSelling}>
            <Text style={styles.summaryLabel}>Best Selling</Text>
            <Text style={styles.bestSellingName}>{summaryData.best_selling_product}</Text>
          </View>
        )}
      </Card>

      {chartData.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Revenue Chart</Text>
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

      {!profitData && !summaryData && !loading && (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={56} color={Colors.border} />
          <Text style={styles.emptyTitle}>No data for this period</Text>
          <Text style={styles.emptyMessage}>Try selecting a different date range</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  presetRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 16 },
  presetBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  presetActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText: { fontSize: 14, fontWeight: '600', color: Colors.textLight },
  presetTextActive: { color: '#FFF' },
  card: { marginHorizontal: 16, marginBottom: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryItem: { minWidth: '45%', flex: 1 },
  summaryFull: { width: '100%' },
  summaryLabel: { fontSize: 12, color: Colors.textLight, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  paymentBreakdown: { marginTop: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  breakdownMethod: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  breakdownCount: { fontSize: 14, color: Colors.textLight },
  bestSelling: { marginTop: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  bestSellingName: { fontSize: 16, fontWeight: '600', color: Colors.primary, marginTop: 4 },
  chartContainer: { marginTop: 8, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptyMessage: { fontSize: 14, color: Colors.textLight, marginTop: 6 },
})
