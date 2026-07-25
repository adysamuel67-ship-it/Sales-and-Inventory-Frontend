import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Modal, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { businessAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { extractArray, parseApiError, isAdminRole, getRoleColor, getRoleLabel } from '@/lib/utils'
import type { Approval } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function RequestsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, currentBusiness } = useAuth()
  const businessId = id ? parseInt(id, 10) : currentBusiness?.business_id
  const isAdmin = isAdminRole(user?.business_role) || isAdminRole(user?.role)

  const [requests, setRequests] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedRequest, setSelectedRequest] = useState<Approval | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  const fetchRequests = useCallback(async () => {
    if (!businessId) return
    try {
      const res = await businessAPI.getApprovals(businessId)
      setRequests(extractArray(res.data))
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchRequests()
  }, [fetchRequests])

  const handleAction = async (approvalId: number, approve: boolean) => {
    if (!businessId) return
    setProcessingId(approvalId)
    try {
      await businessAPI.confirmApproval(businessId, { approval_id: approvalId, dir: approve ? 1 : 0 })
      setRequests((prev) => prev.map((r) => {
        if ((r.approval_id ?? (r as any).id) === approvalId) {
          return { ...r, status: approve ? 'approved' : 'rejected' } as Approval
        }
        return r
      }))
      setDetailModalVisible(false)
      setSelectedRequest(null)
      setActionSuccess(approve ? 'Request approved' : 'Request rejected')
      setTimeout(() => setActionSuccess(''), 4000)
    } catch (err) {
      setActionError(parseApiError(err))
      setTimeout(() => setActionError(''), 4000)
    } finally { setProcessingId(null) }
  }

  const filtered = requests.filter((r) => {
    if (statusFilter === 'all') return true
    return (r.status || '').toLowerCase() === statusFilter
  })

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => (r.status || '').toLowerCase() === 'pending').length,
    approved: requests.filter((r) => (r.status || '').toLowerCase() === 'approved').length,
    rejected: requests.filter((r) => (r.status || '').toLowerCase() === 'rejected').length,
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return dateStr }
  }

  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'approved') return { bg: Colors.successLight, color: Colors.success, icon: 'checkmark-circle' as const, label: 'Approved' }
    if (s === 'rejected') return { bg: Colors.dangerLight, color: Colors.danger, icon: 'close-circle' as const, label: 'Rejected' }
    return { bg: Colors.warningLight, color: Colors.warning, icon: 'time-outline' as const, label: 'Pending' }
  }

  const renderItem = ({ item }: { item: Approval }) => {
    const aid = item.approval_id ?? (item as any).id
    const isProcessing = processingId === aid
    const statusConfig = getStatusConfig(item.status)
    const rc = getRoleColor(item.role || 'viewer')

    return (
      <TouchableOpacity style={[styles.card, isProcessing && { opacity: 0.6 }]} onPress={() => { setSelectedRequest(item); setDetailModalVisible(true) }} activeOpacity={0.7}>
        <View style={[styles.statusStrip, { backgroundColor: statusConfig.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>{(item.requester?.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName} numberOfLines={1}>{item.requester?.name || `User #${item.requester_id}`}</Text>
              <Text style={styles.cardEmail} numberOfLines={1}>{item.requester?.email || ''}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
              <Text style={[styles.roleText, { color: rc.text }]}>{getRoleLabel(item.role || 'viewer')}</Text>
            </View>
            {item.created_at && <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>}
          </View>

          {item.reason ? <Text style={styles.cardReason} numberOfLines={2}>{item.reason}</Text> : null}

          {(item.status || '').toLowerCase() === 'pending' && isAdmin && (
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(aid, false)} disabled={isProcessing}>
                <Ionicons name="close" size={16} color="#FFF" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(aid, true)} disabled={isProcessing}>
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading requests..." />

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Requests</Text>
        <View style={{ width: 32 }} />
      </View>

      {actionSuccess ? <AlertBadge message={actionSuccess} type="success" /> : null}
      {actionError ? <AlertBadge message={actionError} type="error" /> : null}

      <View style={styles.tabRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, statusFilter === t && styles.tabActive]} onPress={() => setStatusFilter(t)}>
            <Text style={[styles.tabText, statusFilter === t && styles.tabTextActive]}>{t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            {counts[t] > 0 && <View style={[styles.countBadge, statusFilter === t && styles.countBadgeActive]}><Text style={[styles.countText, statusFilter === t && styles.countTextActive]}>{counts[t]}</Text></View>}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.approval_id ?? item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="paper-plane-outline" title="No requests" message={statusFilter === 'all' ? 'No join requests yet' : `No ${statusFilter} requests`} />}
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
                  <Text style={styles.detailAvatarText}>{(selectedRequest.requester?.name || 'U').charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.detailName}>{selectedRequest.requester?.name || `User #${selectedRequest.requester_id}`}</Text>
                <Text style={styles.detailEmail}>{selectedRequest.requester?.email || 'No email'}</Text>
                {selectedRequest.requester?.phone ? <Text style={styles.detailPhone}>{selectedRequest.requester.phone}</Text> : null}

                {(() => {
                  const sc = getStatusConfig(selectedRequest.status)
                  return (
                    <View style={[styles.detailStatusBanner, { backgroundColor: sc.bg }]}>
                      <Ionicons name={sc.icon} size={18} color={sc.color} />
                      <Text style={[styles.detailStatusText, { color: sc.color }]}>{sc.label.toUpperCase()}</Text>
                    </View>
                  )
                })()}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Requested Role</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedRequest.role || 'viewer').bg, alignSelf: 'flex-start' }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(selectedRequest.role || 'viewer').text }]}>{getRoleLabel(selectedRequest.role || 'viewer')}</Text>
                  </View>
                </View>

                {selectedRequest.reason ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reason</Text>
                    <View style={styles.reasonBox}><Text style={styles.reasonText}>{selectedRequest.reason}</Text></View>
                  </View>
                ) : null}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedRequest.created_at)}</Text>
                </View>

                {selectedRequest.business_id ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Business ID</Text>
                    <Text style={styles.detailValue}>{selectedRequest.business_id}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
            {selectedRequest && (selectedRequest.status || '').toLowerCase() === 'pending' && isAdmin && (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(selectedRequest.approval_id ?? (selectedRequest as any).id, false)} disabled={processingId === selectedRequest.approval_id}>
                  <Ionicons name="close" size={18} color="#FFF" />
                  <Text style={styles.rejectBtnText}>{processingId === selectedRequest.approval_id ? 'Processing...' : 'Reject'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(selectedRequest.approval_id ?? (selectedRequest as any).id, true)} disabled={processingId === selectedRequest.approval_id}>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.approveBtnText}>{processingId === selectedRequest.approval_id ? 'Processing...' : 'Approve'}</Text>
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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: BORDER_RADIUS.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.textLight },
  tabTextActive: { color: '#FFF' },
  countBadge: { backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  countText: { fontSize: 10, fontWeight: '700', color: Colors.textLight },
  countTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, marginBottom: 10, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  statusStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  cardName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  cardEmail: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardDate: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  cardReason: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: 8, lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.danger, borderRadius: BORDER_RADIUS.md, paddingVertical: 10 },
  rejectBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: '#FFF' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.success, borderRadius: BORDER_RADIUS.md, paddingVertical: 10 },
  approveBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: '#FFF' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text },
  detailAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: SPACING.md },
  detailAvatarText: { fontSize: 24, fontWeight: '700', color: Colors.primary },
  detailName: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  detailEmail: { fontSize: FONT_SIZE.md, color: Colors.textLight, textAlign: 'center', marginTop: 4 },
  detailPhone: { fontSize: FONT_SIZE.md, color: Colors.textLight, textAlign: 'center', marginTop: 2 },
  detailStatusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: BORDER_RADIUS.lg, marginTop: SPACING.lg },
  detailStatusText: { fontSize: FONT_SIZE.sm, fontWeight: '700', letterSpacing: 1 },
  detailSection: { marginTop: SPACING.lg },
  detailLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs },
  detailValue: { fontSize: FONT_SIZE.md, color: Colors.text },
  reasonBox: { backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  reasonText: { fontSize: FONT_SIZE.md, color: Colors.text, lineHeight: 22 },
  modalFooter: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
})
