import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  notificationAPI,
  normalizeNotifications,
  getNotificationsCache,
  setNotificationsCache,
  getDismissedNotificationIds,
  dismissNotification,
} from '@/lib/api'
import type { NotificationItem } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Colors, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

// Lazy, fetch-on-open behavior: shows cached notifications instantly and
// refreshes in the background so we don't constantly wake the sleeping
// free-tier Render service or hammer the connection.
const STALE_MS = 30 * 60 * 1000

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { currentBusiness } = useAuth()
  const businessId = id ? parseInt(id, 10) : currentBusiness?.business_id

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [hasHidden, setHasHidden] = useState(false)

  const loadDismissed = useCallback(async () => {
    setDismissedIds(await getDismissedNotificationIds())
  }, [])

  useEffect(() => { loadDismissed() }, [loadDismissed])

  const fetchNotifications = useCallback(async (force = false) => {
    if (!businessId) return
    const cached = await getNotificationsCache()
    if (cached && cached.businessId === businessId) {
      setNotifications(cached.items)
      setLoading(false)
    }
    const stale = !cached || cached.businessId !== businessId ||
      (Date.now() - cached.fetchedAt > STALE_MS)
    if (!force && !stale) {
      setLoading(false)
      return
    }
    try {
      const res = await notificationAPI.list(businessId)
      const items = normalizeNotifications(res.data)
      items.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifications(items)
      setNotificationsCache({ businessId, items, fetchedAt: Date.now() })
      setError('')
    } catch {
      setError('Could not refresh notifications. Showing saved items.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId])

  useEffect(() => { fetchNotifications(false) }, [fetchNotifications])

  const onRefresh = useCallback(() => {
    if (!businessId) return
    setRefreshing(true)
    fetchNotifications(true)
  }, [businessId, fetchNotifications])

  const handleDismiss = async (item: NotificationItem) => {
    await dismissNotification(item.notification_id)
    await loadDismissed()
    setHasHidden(true)
  }

  const visible = notifications.filter((n) => !dismissedIds.has(n.notification_id))
  const unreadCount = visible.filter((n) => !n.is_read).length

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isRead = item.is_read
    return (
      <View style={[styles.card, !isRead && styles.cardUnread]}>
        <View style={[styles.iconWrap, { backgroundColor: isRead ? Colors.surfaceAlt : Colors.primaryLight }]}>
          <Ionicons name="notifications" size={20} color={isRead ? Colors.textLight : Colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, !isRead && styles.cardTitleUnread]} numberOfLines={1}>
              {item.title || 'Notification'}
            </Text>
            {!isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardTime}>{relativeTime(item.created_at)}</Text>
            {!dismissedIds.has(item.notification_id) ? (
              <TouchableOpacity onPress={() => handleDismiss(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle-outline" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    )
  }

  if (loading && notifications.length === 0) {
    return <LoadingSpinner fullScreen message="Loading notifications..." />
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && <Text style={styles.headerSub}>{unreadCount} unread</Text>}
        </View>
        <View style={{ width: 32 }} />
      </View>

      {error ? <AlertBadge message={error} type="warning" /> : null}

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.notification_id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications"
            message={hasHidden ? 'All notifications dismissed' : 'You have no notifications yet'}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 32 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginTop: 2 },
  list: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl,
    padding: 16, marginBottom: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 3, elevation: 1,
  },
  cardUnread: { backgroundColor: '#EFF4FF', borderColor: Colors.primaryLight, borderWidth: 1 },
  iconWrap: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  cardTitleUnread: { fontWeight: '800', color: Colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  cardMessage: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: 4, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  cardTime: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
})
