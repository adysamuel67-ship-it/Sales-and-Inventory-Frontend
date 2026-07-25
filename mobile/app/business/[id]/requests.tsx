import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { businessAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { extractArray, parseApiError } from '@/lib/utils'
import type { Approval } from '@/types'

export default function RequestsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { currentBusiness } = useAuth()
  const businessId = id ? parseInt(id, 10) : currentBusiness?.business_id

  const [requests, setRequests] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Approval | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!businessId) return
    try {
      const res = await businessAPI.getApprovals(businessId, 'pending')
      setRequests(extractArray(res.data))
    } catch {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchRequests()
  }, [fetchRequests])

  const handleAction = async (approvalId: number, approve: boolean) => {
    if (!businessId) return
    setProcessingId(approvalId)
    try {
      await businessAPI.confirmApproval(businessId, {
        approval_id: approvalId,
        dir: approve ? 1 : 0,
      })
      setRequests((prev) => prev.filter((r) => (r.approval_id ?? (r as any).id) !== approvalId))
      setDetailModalVisible(false)
      setSelectedRequest(null)
      Alert.alert('Success', approve ? 'Request approved' : 'Request rejected')
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    } finally {
      setProcessingId(null)
    }
  }

  const openDetail = (request: Approval) => {
    setSelectedRequest(request)
    setDetailModalVisible(true)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const renderRoleBadge = (role?: string) => {
    const r = (role || 'viewer').toLowerCase()
    let bg = Colors.surfaceAlt
    let color = Colors.textLight
    if (r === 'admin' || r === 'owner') { bg = Colors.primaryLight; color = Colors.primary }
    else if (r === 'manager') { bg = Colors.successLight; color = Colors.success }
    else if (r === 'cashier') { bg = Colors.warningLight; color = Colors.warning }
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{r}</Text>
      </View>
    )
  }

  const renderItem = ({ item }: { item: Approval }) => {
    const aid = item.approval_id ?? (item as any).id
    const isProcessing = processingId === aid
    return (
      <TouchableOpacity
        style={[styles.card, isProcessing && { opacity: 0.6 }]}
        onPress={() => openDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>
            {(item.requester?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.requester?.name || `User #${item.requester_id}`}
          </Text>
          <Text style={styles.cardEmail} numberOfLines={1}>
            {item.requester?.email || ''}
          </Text>
          <View style={styles.cardMeta}>
            {renderRoleBadge(item.role)}
            {item.created_at && (
              <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.success }]}
            onPress={() => handleAction(aid, true)}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.danger }]}
            onPress={() => handleAction(aid, false)}
            disabled={isProcessing}
          >
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={32} color={Colors.textLight} />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.count}>
        {requests.length} pending request{requests.length !== 1 ? 's' : ''}
      </Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.approval_id ?? (item as any).id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySubtitle}>No pending join requests</Text>
          </View>
        }
      />

      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => { setDetailModalVisible(false); setSelectedRequest(null) }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {selectedRequest && (
              <ScrollView>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>
                    {(selectedRequest.requester?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.detailName}>
                  {selectedRequest.requester?.name || `User #${selectedRequest.requester_id}`}
                </Text>
                <Text style={styles.detailEmail}>
                  {selectedRequest.requester?.email || 'No email provided'}
                </Text>
                {selectedRequest.requester?.phone && (
                  <Text style={styles.detailPhone}>{selectedRequest.requester.phone}</Text>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Requested Role</Text>
                  {renderRoleBadge(selectedRequest.role)}
                </View>

                {selectedRequest.reason && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reason</Text>
                    <View style={styles.reasonBox}>
                      <Text style={styles.reasonText}>{selectedRequest.reason}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedRequest.created_at)}
                  </Text>
                </View>
              </ScrollView>
            )}
            {selectedRequest && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.rejectBtn, processingId === selectedRequest.approval_id && { opacity: 0.6 }]}
                  onPress={() => handleAction(selectedRequest.approval_id ?? (selectedRequest as any).id, false)}
                  disabled={processingId === selectedRequest.approval_id}
                >
                  <Ionicons name="close" size={18} color="#FFF" />
                  <Text style={styles.rejectBtnText}>
                    {processingId === selectedRequest.approval_id ? 'Processing...' : 'Reject'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveBtn, processingId === selectedRequest.approval_id && { opacity: 0.6 }]}
                  onPress={() => handleAction(selectedRequest.approval_id ?? (selectedRequest as any).id, true)}
                  disabled={processingId === selectedRequest.approval_id}
                >
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.approveBtnText}>
                    {processingId === selectedRequest.approval_id ? 'Processing...' : 'Approve'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.warning,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.warningLight,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
  },
  cardAvatarText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: Colors.warning },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  cardEmail: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  cardDate: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600', textTransform: 'capitalize' },
  cardActions: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text, marginTop: SPACING.md },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: SPACING.xs },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text },
  detailAvatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.warningLight,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: SPACING.md,
  },
  detailAvatarText: { fontSize: 24, fontWeight: '700', color: Colors.warning },
  detailName: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  detailEmail: { fontSize: FONT_SIZE.md, color: Colors.textLight, textAlign: 'center', marginTop: 4 },
  detailPhone: { fontSize: FONT_SIZE.md, color: Colors.textLight, textAlign: 'center', marginTop: 2 },
  detailSection: { marginTop: SPACING.lg },
  detailLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs },
  detailValue: { fontSize: FONT_SIZE.md, color: Colors.text, textTransform: 'capitalize' },
  reasonBox: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
  },
  reasonText: { fontSize: FONT_SIZE.md, color: Colors.text, lineHeight: 22 },
  modalFooter: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.danger, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md,
  },
  rejectBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#FFF' },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.success, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md,
  },
  approveBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#FFF' },
})
