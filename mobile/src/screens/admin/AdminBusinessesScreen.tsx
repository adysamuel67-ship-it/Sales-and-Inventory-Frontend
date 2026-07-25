import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { businessAPI } from '@/lib/api'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { extractArray, parseApiError } from '@/lib/utils'

interface BusinessData {
  business_id: number
  id?: number
  name: string
  members?: number
  member_count?: number
  is_active?: boolean
  created_at?: string
}

export default function AdminBusinessesScreen() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await businessAPI.listAll()
      setBusinesses(extractArray(res.data))
    } catch {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchBusinesses()
  }, [fetchBusinesses])

  const renderItem = ({ item }: { item: BusinessData }) => {
    const bizId = item.business_id ?? item.id
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/business/${bizId}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardIcon}>
          <Ionicons name="business" size={22} color={Colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name || 'Unnamed Business'}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="people" size={14} color={Colors.textLight} />
            <Text style={styles.cardMetaText}>{item.members ?? item.member_count ?? 0} members</Text>
          </View>
          {item.created_at && (
            <Text style={styles.cardDate}>Created {new Date(item.created_at).toLocaleDateString()}</Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusDot, { backgroundColor: item.is_active !== false ? Colors.success : Colors.danger }]} />
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={32} color={Colors.textLight} />
        <Text style={styles.loadingText}>Loading businesses...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{businesses.length} business{businesses.length !== 1 ? 'es' : ''}</Text>
      <FlatList
        data={businesses}
        keyExtractor={(item) => String(item.business_id ?? item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Businesses</Text>
            <Text style={styles.emptySubtitle}>No businesses have been created yet</Text>
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
  count: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm, fontSize: FONT_SIZE.xs, color: Colors.textLight },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: BORDER_RADIUS.lg, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardMetaText: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  cardDate: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text, marginTop: SPACING.md },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: SPACING.xs },
})
