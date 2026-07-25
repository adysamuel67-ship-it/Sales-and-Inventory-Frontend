import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { productAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { extractArray, parseApiError } from '@/lib/utils'

interface LowStockItem {
  product_id: number
  id?: number
  name: string
  quantity: number
  stock?: number
  low_stock_threshold?: number
  threshold?: number
  unit?: string
  category?: string
  business_name?: string
}

export default function AdminLowStockScreen() {
  const { currentBusiness, businesses } = useAuth()
  const [items, setItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLowStock = useCallback(async () => {
    try {
      if (currentBusiness) {
        const res = await productAPI.lowStock(currentBusiness.business_id)
        const rawItems = extractArray(res.data)
        setItems(
          rawItems.map((item: any) => ({
            ...item,
            business_name: currentBusiness.name,
            quantity: item.quantity ?? item.stock ?? 0,
            low_stock_threshold: item.low_stock_threshold ?? item.threshold ?? item.reorder_level ?? 10,
          }))
        )
      } else if (businesses.length > 0) {
        const allItems: LowStockItem[] = []
        await Promise.allSettled(
          businesses.map(async (biz) => {
            try {
              const res = await productAPI.lowStock(biz.business_id)
              const rawItems = extractArray(res.data)
              allItems.push(
                ...rawItems.map((item: any) => ({
                  ...item,
                  business_name: biz.name,
                  quantity: item.quantity ?? item.stock ?? 0,
                  low_stock_threshold: item.low_stock_threshold ?? item.threshold ?? item.reorder_level ?? 10,
                }))
              )
            } catch {
            }
          })
        )
        setItems(allItems)
      }
    } catch {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentBusiness, businesses])

  useEffect(() => {
    fetchLowStock()
  }, [fetchLowStock])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchLowStock()
  }, [fetchLowStock])

  const renderItem = ({ item }: { item: LowStockItem }) => {
    const stock = item.quantity
    const threshold = item.low_stock_threshold ?? 10
    const isOut = stock === 0
    const stockColor = isOut ? Colors.danger : stock <= threshold ? Colors.warning : Colors.success

    return (
      <View style={styles.card}>
        <View style={[styles.stockIndicator, { backgroundColor: stockColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={styles.productName} numberOfLines={1}>{item.name || 'Unknown'}</Text>
            {item.business_name && (
              <Text style={styles.businessName} numberOfLines={1}>{item.business_name}</Text>
            )}
          </View>
          <View style={styles.cardStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stock}</Text>
              <Text style={styles.statLabel}>In Stock {item.unit ? `(${item.unit})` : ''}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: stockColor }]}>{threshold}</Text>
              <Text style={styles.statLabel}>Threshold</Text>
            </View>
            {item.category && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{item.category}</Text>
                  <Text style={styles.statLabel}>Category</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={32} color={Colors.textLight} />
        <Text style={styles.loadingText}>Loading low stock items...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>{items.length} low stock item{items.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item: any, index: number) => String(item.product_id ?? item.id ?? index)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>All Stocked Up</Text>
            <Text style={styles.emptySubtitle}>No products below stock threshold</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: SPACING.sm, color: Colors.textLight, fontSize: FONT_SIZE.md },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  count: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: SPACING.sm },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  stockIndicator: { width: 4 },
  cardContent: { flex: 1, padding: SPACING.md },
  cardTop: { marginBottom: SPACING.sm },
  productName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  businessName: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginTop: 2 },
  cardStats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text, marginTop: SPACING.md },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: SPACING.xs },
})
