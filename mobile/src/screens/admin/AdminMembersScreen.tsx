import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
  // @ts-ignore - Switch exists at runtime but types are missing in RN 0.76
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { adminAPI, businessAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { parseApiError, extractArray } from '@/lib/utils'

interface MemberData {
  member_id?: number
  user_id?: number
  id?: number
  name: string
  email: string
  role: string
  is_active?: boolean
}

const ROLES = ['admin', 'manager', 'cashier', 'viewer']

export default function AdminMembersScreen() {
  const { currentBusiness } = useAuth()
  const [members, setMembers] = useState<MemberData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberData | null>(null)
  const [editRole, setEditRole] = useState('viewer')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const res = await adminAPI.listMembers()
      setMembers(extractArray(res.data))
    } catch {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchMembers()
  }, [fetchMembers])

  const openEdit = (member: MemberData) => {
    setEditingMember(member)
    setEditRole((member.role || 'viewer').toLowerCase())
    setEditActive(member.is_active !== false)
    setEditModalVisible(true)
  }

  const handleSaveEdit = async () => {
    if (!editingMember || !currentBusiness) return
    const mid = editingMember.member_id ?? editingMember.user_id ?? editingMember.id
    if (!mid) return
    setSaving(true)
    try {
      await businessAPI.updateMember(currentBusiness.business_id, mid, {
        role: editRole,
        is_active: editActive,
      })
      setMembers((prev) =>
        prev.map((m) => {
          const mId = m.member_id ?? m.user_id ?? m.id
          return mId === mid ? { ...m, role: editRole, is_active: editActive } : m
        })
      )
      setEditModalVisible(false)
      Alert.alert('Success', 'Member updated')
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = (member: MemberData) => {
    if (!currentBusiness) return
    const mid = member.member_id ?? member.user_id ?? member.id
    if (!mid) return
    Alert.alert('Remove Member', `Remove ${member.name} from this business?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await businessAPI.removeMember(currentBusiness.business_id, mid)
            setMembers((prev) => prev.filter((m) => {
              const mId = m.member_id ?? m.user_id ?? m.id
              return mId !== mid
            }))
            Alert.alert('Success', 'Member removed')
          } catch (err) {
            Alert.alert('Error', parseApiError(err))
          }
        },
      },
    ])
  }

  const renderRoleBadge = (role?: string) => {
    const r = (role || 'viewer').toLowerCase()
    let bg = Colors.surfaceAlt
    let color = Colors.textLight
    if (r === 'admin' || r === 'owner') { bg = Colors.primaryLight; color = Colors.primary }
    else if (r === 'manager') { bg = Colors.successLight; color = Colors.success }
    else if (r === 'cashier') { bg = Colors.warningLight; color = Colors.warning }
    else if (r === 'viewer') { bg = Colors.surfaceAlt; color = Colors.textLight }
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{r}</Text>
      </View>
    )
  }

  const renderItem = ({ item }: { item: MemberData }) => {
    const mid = item.member_id ?? item.user_id ?? item.id
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>{item.name || 'Unknown'}</Text>
            <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={styles.badges}>
            {renderRoleBadge(item.role)}
            <View style={[styles.badge, { backgroundColor: item.is_active !== false ? Colors.successLight : Colors.dangerLight }]}>
              <Text style={[styles.badgeText, { color: item.is_active !== false ? Colors.success : Colors.danger }]}>
                {item.is_active !== false ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
            <Ionicons name="pencil" size={15} color={Colors.primary} />
            <Text style={[styles.actionText, { color: Colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemoveMember(item)}>
            <Ionicons name="person-remove" size={15} color={Colors.danger} />
            <Text style={[styles.actionText, { color: Colors.danger }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={32} color={Colors.textLight} />
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
      <FlatList
        data={members}
        keyExtractor={(item: any) => String(item.member_id ?? item.user_id ?? item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Members</Text>
            <Text style={styles.emptySubtitle}>No members in this business yet</Text>
          </View>
        }
      />

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Member</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, editRole === r && styles.roleChipActive]}
                  onPress={() => setEditRole(r)}
                >
                  <Text style={[styles.roleChipText, editRole === r && styles.roleChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={editActive}
                onValueChange={setEditActive}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={editActive ? Colors.primary : Colors.textLight}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
  },
  avatarText: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.primary },
  userInfo: { flex: 1 },
  name: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  email: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  badges: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600', textTransform: 'capitalize' },
  cardActions: {
    flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: SPACING.sm,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionText: { fontSize: FONT_SIZE.xs, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text, marginTop: SPACING.md },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: SPACING.xs },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.text, marginTop: SPACING.md, marginBottom: SPACING.xs },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  roleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleChipText: { fontSize: FONT_SIZE.sm, color: Colors.text, textTransform: 'capitalize' },
  roleChipTextActive: { color: '#FFF', fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.lg, paddingVertical: SPACING.sm,
  },
  switchLabel: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  modalFooter: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  cancelBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.textLight },
  saveBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  saveBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#FFF' },
})
