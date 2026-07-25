import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { businessAPI } from '@/lib/api'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { extractArray, parseApiError } from '@/lib/utils'

interface BusinessKey {
  business_id: number
  id?: number
  name: string
  business_key?: string
}

export default function AdminKeysScreen() {
  const [businesses, setBusinesses] = useState<BusinessKey[]>([])
  const [keys, setKeys] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingKey, setLoadingKey] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const bizRes = await businessAPI.listAll()
      const bizList = extractArray(bizRes.data)
      setBusinesses(bizList)

      const keyResults: Record<number, string> = {}
      await Promise.allSettled(
        bizList.map(async (b: any) => {
          const bizId = b.business_id ?? b.id
          try {
            const keyRes = await businessAPI.getBusinessKey(bizId)
            const keyData = keyRes.data
            const key = keyData?.business_key || keyData?.key || keyData
            if (typeof key === 'string') keyResults[bizId] = key
            else if (key && typeof key === 'object') keyResults[bizId] = JSON.stringify(key)
          } catch {
          }
        })
      )
      setKeys(keyResults)
    } catch {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  const handleCopyKey = async (bizId: number) => {
    const key = keys[bizId]
    if (!key) {
      Alert.alert('No Key', 'Business key not available')
      return
    }
    try {
      await Clipboard.setStringAsync(key)
      Alert.alert('Copied', 'Business key copied to clipboard')
    } catch {
      Alert.alert('Error', 'Failed to copy key')
    }
  }

  const renderItem = ({ item }: { item: BusinessKey }) => {
    const bizId = item.business_id ?? item.id
    const key = keys[bizId]
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardIcon}>
            <Ionicons name="business" size={20} color={Colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name || 'Unnamed Business'}</Text>
            <Text style={styles.cardMeta}>ID: {bizId}</Text>
          </View>
        </View>
        {key ? (
          <View style={styles.keyContainer}>
            <Text style={styles.keyText} numberOfLines={2}>{key}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopyKey(bizId)}>
              <Ionicons name="copy" size={16} color={Colors.primary} />
              <Text style={styles.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.keyContainer}>
            <Text style={styles.noKeyText}>Key not available</Text>
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={32} color={Colors.textLight} />
        <Text style={styles.loadingText}>Loading business keys...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{businesses.length} business{businesses.length !== 1 ? 'es' : ''}</Text>
      <FlatList
        data={businesses}
        keyExtractor={(item: any) => String(item.business_id ?? item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="key-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Businesses</Text>
            <Text style={styles.emptySubtitle}>No business keys available</Text>
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
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  cardIcon: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.md, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  cardMeta: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  keyContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, gap: SPACING.sm,
  },
  keyText: { flex: 1, fontSize: FONT_SIZE.sm, color: Colors.text, fontFamily: 'monospace' },
  noKeyText: { flex: 1, fontSize: FONT_SIZE.sm, color: Colors.textLight, fontStyle: 'italic' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  copyBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.primary },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text, marginTop: SPACING.md },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: SPACING.xs },
})
