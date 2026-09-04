import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Modal, ScrollView,
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
  getReadNotificationIds,
  markNotificationRead,
  markAllNotificationsRead,
  computeUnreadCount,
  inferNotificationKind,
} from '@/lib/api'
import type { NotificationItem, NotificationKind } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Colors, BORDER_RADIUS, FONT_SIZE, SHADOW } from '@/lib/constants'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'
import GradientHero from '@/components/ui/GradientHero'
import Card from '@/components/ui/Card'

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

function fullTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

const kindConfig: Record<NotificationKind, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  stock: { icon: 'warning', color: Colors.danger, bg: Colors.dangerLight },
  sale: { icon: 'checkmark-circle', color: Colors.success, bg: Colors.successLight },
  member: { icon: 'person-add', color: Colors.purple, bg: Colors.purpleLight },
  debt: { icon: 'cash', color: Colors.warning, bg: Colors.warningLight },
  general: { icon: 'notifications', color: Colors.primary, bg: Colors.primaryLight },
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
  const [readIds, setReadIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [hasHidden, setHasHidden] = useState(false)
  const [selected, setSelected] = useState<NotificationItem | null>(null)

  const loadLocal = useCallback(async () => {
    const [d, r] = await Promise.all([getDismissedNotificationIds(), getReadNotificationIds()])
    setDismissedIds(d)
    setReadIds(r)
  }, [])

  useEffect(() => { loadLocal() }, [loadLocal])

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

  const handleOpen = async (item: NotificationItem) => {
    setSelected(item)
    if (!readIds.has(item.notification_id)) {
      await markNotificationRead(item.notification_id)
      setReadIds((prev) => new Set(prev).add(item.notification_id))
    }
  }

  const handleDetailDismiss = async (item: NotificationItem) => {
    await dismissNotification(item.notification_id)
    setSelected(null)
    await loadLocal()
    setHasHidden(true)
  }

  const handleMarkAllRead = async () => {
    const ids = notifications.map((n) => n.notification_id)
    await markAllNotificationsRead(ids)
    setReadIds((prev) => {
      const next = new Set(prev)
      for (const i of ids) next.add(i)
      return next
    })
  }

  const visible = notifications.filter((n) => !dismissedIds.has(n.notification_id))
  const unreadCount = computeUnreadCount(visible, readIds, new Set())

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isRead = readIds.has(item.notification_id)
    const cfg = kindConfig[inferNotificationKind((item.message || item.title) || '')]
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleOpen(item)}
        style={[styles.item, !isRead && styles.itemUnread]}
      >
        <View style={[styles.itemIcon, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemRow}>
            <Text style={[styles.itemTitle, !isRead && styles.itemTitleUnread]} numberOfLines={1}>
              {item.title || 'Notification'}
            </Text>
            {!isRead && <View style={styles.unreadBadge} />}
          </View>
          <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.itemTime}>{relativeTime(item.created_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
      </TouchableOpacity>
    )
  }

  if (loading && notifications.length === 0) {
    return <LoadingSpinner fullScreen message="Loading notifications..." />
  }

  const selectedCfg = selected ? kindConfig[inferNotificationKind((selected.message || selected.title) || '')] : null

  return (
    <View style={styles.container}>
      <GradientHero topInset={52} height={96} bubbles={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <View style={styles.headerCountPill}>
                <Text style={styles.headerCountText}>{unreadCount} unread</Text>
              </View>
            ) : (
              <Text style={styles.headerSub}>You're all caught up</Text>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
              <Ionicons name="checkmark-done" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 34 }} />
          )}
        </View>
      </GradientHero>

      {error ? <AlertBadge message={error} type="warning" /> : null}

      {unreadCount > 0 && (
        <View style={styles.unreadStrip}>
          <Ionicons name="notifications" size={14} color={Colors.primary} />
          <Text style={styles.unreadStripText}>
            {unreadCount} new notification{unreadCount === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.notification_id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSelected(null)} />
          {selected && selectedCfg && (
            <View style={styles.sheet}>
              <View style={styles.sheetGrabber} />
              <View style={styles.sheetHeader}>
                <View style={[styles.sheetIcon, { backgroundColor: selectedCfg.bg }]}>
                  <Ionicons name={selectedCfg.icon} size={22} color={selectedCfg.color} />
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={styles.sheetTitle} numberOfLines={2}>{selected.title || 'Notification'}</Text>
                  <Text style={styles.sheetTime}>{fullTime(selected.created_at)}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} style={styles.sheetClose}>
                  <Ionicons name="close" size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetMessage}>{selected.message}</Text>
              <Card style={styles.sheetMeta}>
                <View style={styles.sheetMetaRow}>
                  <Ionicons name="finger-print" size={16} color={Colors.textLight} />
                  <Text style={styles.sheetMetaLabel}>ID</Text>
                  <Text style={styles.sheetMetaValue}>#{selected.notification_id}</Text>
                </View>
                <View style={styles.sheetMetaRow}>
                  <Ionicons name="notifications-outline" size={16} color={Colors.textLight} />
                  <Text style={styles.sheetMetaLabel}>Status</Text>
                  <Text style={[styles.sheetMetaValue, { color: Colors.success }]}>Read</Text>
                </View>
              </Card>
              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetDismissBtn} onPress={() => handleDetailDismiss(selected)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  <Text style={[styles.sheetDismissText, { color: Colors.danger }]}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetDoneBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.sheetDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  headerCountPill: {
    marginTop: 4, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10,
    paddingVertical: 2, borderRadius: BORDER_RADIUS.full,
  },
  headerCountText: { fontSize: FONT_SIZE.xs, color: '#FFF', fontWeight: '700' },
  headerSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' },
  markAllBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  unreadStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight, marginHorizontal: 16, marginTop: 12,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: BORDER_RADIUS.lg,
  },
  unreadStripText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.primary },
  list: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.xl, padding: 16, gap: 14,
    ...SHADOW.md,
  },
  itemUnread: {
    backgroundColor: '#EFF4FF',
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  itemIcon: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  itemBody: { flex: 1, gap: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  itemTitleUnread: { fontWeight: '800' },
  unreadBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 8 },
  itemMessage: { fontSize: FONT_SIZE.sm, color: Colors.textLight, lineHeight: 18 },
  itemTime: { fontSize: FONT_SIZE.xs, color: Colors.neutralLight, marginTop: 2 },
  separator: { height: 12 },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  sheetGrabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  sheetIcon: { width: 48, height: 48, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: Colors.text },
  sheetTime: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginTop: 3 },
  sheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  sheetMessage: { fontSize: FONT_SIZE.md, color: Colors.text, lineHeight: 22, marginTop: 18 },
  sheetMeta: { marginTop: 20 },
  sheetMetaRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sheetMetaLabel: { flex: 1, marginLeft: 10, fontSize: FONT_SIZE.sm, color: Colors.textLight },
  sheetMetaValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: Colors.text },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  sheetDismissBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    flex: 1, paddingVertical: 13, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: Colors.dangerLight,
  },
  sheetDismissText: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  sheetDoneBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
    borderRadius: BORDER_RADIUS.lg, backgroundColor: Colors.primary,
  },
  sheetDoneText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#FFF' },
})
