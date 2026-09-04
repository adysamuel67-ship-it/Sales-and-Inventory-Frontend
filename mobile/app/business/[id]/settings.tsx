import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { businessAPI, adminAPI } from '@/lib/api'
import { extractArray, isAdminRole, parseApiError, getRoleColor, getRoleLabel } from '@/lib/utils'
import { Colors, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AlertBadge from '@/components/ui/AlertBadge'
import GradientHero from '@/components/ui/GradientHero'

const { width } = Dimensions.get('window')

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user, currentBusiness, fetchBusinesses, logout } = useAuth()
  const businessId = id ? Number(id) : currentBusiness?.business_id
  const isAdmin = isAdminRole(user?.business_role) || isAdminRole(user?.role)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [businessData, setBusinessData] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [businessKey, setBusinessKey] = useState('')
  const [error, setError] = useState('')

  const [showNameEdit, setShowNameEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNameLoading, setEditNameLoading] = useState(false)

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteName, setDeleteName] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [editingMember, setEditingMember] = useState<any>(null)
  const [memberRole, setMemberRole] = useState('')
  const [actionError, setActionError] = useState('')
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<any>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!businessId) return
    setError('')
    try {
      const [bizRes, keyRes, membersRes] = await Promise.allSettled([
        businessAPI.get(businessId),
        businessAPI.getBusinessKey(businessId),
        adminAPI.listMembers(),
      ])
      if (bizRes.status === 'fulfilled') {
        const d = bizRes.value.data?.data || bizRes.value.data
        setBusinessData(d)
      }
      if (membersRes.status === 'fulfilled') {
        const allMembers = extractArray(membersRes.value.data)
        const bizMembers = allMembers.filter((m: any) => (m.business_id === businessId || Number(m.business_id) === Number(businessId)))
        setMembers(bizMembers)
      }
      if (keyRes.status === 'fulfilled') {
        setBusinessKey(keyRes.value.data?.business_key || keyRes.value.data?.key || '')
      }
    } catch { setError('Failed to load settings') }
  }, [businessId])

  useEffect(() => { setLoading(true); fetchData().finally(() => setLoading(false)) }, [fetchData])

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }, [fetchData])

  const handleUpdateName = async () => {
    if (!editName.trim() || !businessId) return
    setEditNameLoading(true)
    try {
      await businessAPI.update(businessId, { name: editName.trim() })
      setShowNameEdit(false); await fetchData(); await fetchBusinesses()
    } catch (err: any) { setActionError(parseApiError(err)) } finally { setEditNameLoading(false) }
  }

  const handleCopyKey = () => {
    if (businessKey) {
      setShowCopyModal(true)
    }
  }

  const handleLeave = async () => {
    if (!businessId) return
    setLeaveLoading(true)
    try {
      await businessAPI.leave(businessId)
      await fetchBusinesses()
      setShowLeaveConfirm(false)
      router.replace('/(tabs)/dashboard')
    } catch (err: any) { setActionError(parseApiError(err)) } finally { setLeaveLoading(false) }
  }

  const handleDelete = async () => {
    if (!businessId) return
    if (deleteName !== currentBusiness?.name) {
      setActionError('Type the business name to confirm')
      return
    }
    setDeleteLoading(true)
    try {
      await businessAPI.delete(businessId)
      await fetchBusinesses()
      setShowDeleteConfirm(false)
      router.replace('/(tabs)/dashboard')
    } catch (err: any) { setActionError(parseApiError(err)) } finally { setDeleteLoading(false) }
  }

  const handleUpdateMember = async () => {
    if (!editingMember || !businessId) return
    try {
      await businessAPI.updateMember(businessId, editingMember.member_id || editingMember.id, { role: memberRole })
      setEditingMember(null); await fetchData()
    } catch (err: any) { setActionError(parseApiError(err)) }
  }

  const handleToggleActive = async (member: any) => {
    if (!businessId) return
    try {
      await businessAPI.updateMember(businessId, member.member_id || member.id, { is_active: !member.is_active })
      await fetchData()
    } catch (err: any) { setActionError(parseApiError(err)) }
  }

  const handleRemoveMember = async (member: any) => {
    if (!businessId) return
    setRemoveTarget(member)
  }

  const confirmRemoveMember = async () => {
    if (!removeTarget || !businessId) return
    setRemoveLoading(true)
    try {
      await businessAPI.removeMember(businessId, removeTarget.member_id || removeTarget.id)
      await fetchData()
      setRemoveTarget(null)
    } catch (err: any) { setActionError(parseApiError(err)) } finally { setRemoveLoading(false) }
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading settings..." />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <GradientHero topInset={54} height={160} bubbles>
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>{currentBusiness?.name || 'Business Settings'}</Text>
          <View style={styles.heroQuickStats}>
            <View style={styles.heroStat}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroStatValue}>{members.length}</Text>
              <Text style={styles.heroStatLabel}>Members</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Ionicons name={isAdmin ? 'shield-checkmark' : 'person'} size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroStatValue}>{isAdmin ? 'Admin' : 'Member'}</Text>
              <Text style={styles.heroStatLabel}>Your Role</Text>
            </View>
          </View>
        </View>
      </GradientHero>

      <View style={styles.body}>
        {error ? <AlertBadge message={error} type="error" /> : null}

        {isAdmin && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="business" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Business Info</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditName(currentBusiness?.name || ''); setShowNameEdit(true) }} style={styles.editBtn}>
                <Ionicons name="pencil" size={14} color={Colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{currentBusiness?.name || businessData?.name || 'N/A'}</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: Colors.emeraldLight }]}>
                <Ionicons name="key" size={16} color={Colors.emerald} />
              </View>
              <Text style={styles.sectionTitle}>Business Key</Text>
            </View>
          </View>
          <View style={styles.keyCard}>
            <Text style={styles.keyValue}>{businessKey || 'Loading...'}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyKey}>
              <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.keyHint}>Share this key with team members to join your business</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: Colors.purpleLight }]}>
                <Ionicons name="people" size={16} color={Colors.purple} />
              </View>
              <Text style={styles.sectionTitle}>Team Members</Text>
            </View>
            <View style={styles.memberCount}>
              <Text style={styles.memberCountText}>{members.length}</Text>
            </View>
          </View>
          {members.length === 0 ? (
            <View style={styles.emptyMembers}>
              <Ionicons name="people-outline" size={28} color={Colors.textLight} />
              <Text style={styles.emptyText}>No team members yet</Text>
            </View>
          ) : (
            members.map((m, i) => {
              const roleColor = getRoleColor(m.role || 'member')
              return (
                <View key={m.member_id || m.id} style={[styles.memberRow, i < members.length - 1 && styles.memberBorder]}>
                  <View style={[styles.memberAvatar, { backgroundColor: roleColor.bg + '20' }]}>
                    <Text style={[styles.memberInitial, { color: roleColor.text }]}>{(m.name || m.email || '?')[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name || m.email}</Text>
                    <View style={styles.memberMetaRow}>
                      <View style={[styles.roleBadge, { backgroundColor: roleColor.bg + '15' }]}>
                        <Text style={[styles.roleBadgeText, { color: roleColor.text }]}>{getRoleLabel(m.role || 'member')}</Text>
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: m.is_active !== false ? Colors.success : Colors.danger }]} />
                      <Text style={styles.statusText}>{m.is_active !== false ? 'Active' : 'Inactive'}</Text>
                    </View>
                  </View>
                  {isAdmin && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity onPress={() => { setEditingMember(m); setMemberRole(m.role || 'member') }} style={styles.memberActionBtn}>
                        <Ionicons name="pencil" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleToggleActive(m)} style={styles.memberActionBtn}>
                        <Ionicons name={m.is_active !== false ? 'checkmark-circle' : 'close-circle'} size={14} color={m.is_active !== false ? Colors.success : Colors.danger} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveMember(m)} style={styles.memberActionBtn}>
                        <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            })
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: Colors.warningLight }]}>
                <Ionicons name="exit" size={16} color={Colors.warning} />
              </View>
              <Text style={styles.sectionTitle}>Leave Business</Text>
            </View>
          </View>
          <Text style={styles.dangerText}>Once you leave, you'll lose access to this business and all its data.</Text>
          <TouchableOpacity style={styles.leaveBtn} onPress={() => setShowLeaveConfirm(true)}>
            <Ionicons name="exit-outline" size={18} color={Colors.danger} />
            <Text style={styles.leaveBtnText}>Leave Business</Text>
          </TouchableOpacity>
        </View>

        {isAdmin && (
          <View style={[styles.sectionCard, styles.dangerCard]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: Colors.dangerLight }]}>
                  <Ionicons name="warning" size={16} color={Colors.danger} />
                </View>
                <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Danger Zone</Text>
              </View>
            </View>
            <Text style={styles.dangerText}>Permanently delete this business and all its data. This action cannot be undone.</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => { setDeleteName(''); setShowDeleteConfirm(true) }}>
              <Ionicons name="trash" size={18} color="#FFF" />
              <Text style={styles.deleteBtnText}>Delete Business</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={showNameEdit} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="pencil" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Edit Business Name</Text>
            <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} placeholder="Business name" placeholderTextColor={Colors.textLight} />
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setShowNameEdit(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={handleUpdateName} loading={editNameLoading} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showLeaveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="exit" size={22} color={Colors.warning} />
            </View>
            <Text style={styles.modalTitle}>Leave Business</Text>
            <Text style={styles.modalMessage}>Are you sure you want to leave "{currentBusiness?.name}"? You will lose access to all data.</Text>
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setShowLeaveConfirm(false)} style={{ flex: 1 }} />
              <Button title="Leave" variant="danger" onPress={handleLeave} loading={leaveLoading} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="warning" size={22} color={Colors.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: Colors.danger }]}>Delete Business</Text>
            <Text style={styles.modalMessage}>This action is irreversible. Type the business name to confirm deletion.</Text>
            <TextInput style={[styles.textInput, { borderColor: Colors.danger }]} value={deleteName} onChangeText={setDeleteName} placeholder={currentBusiness?.name || ''} placeholderTextColor={Colors.textLight} />
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setShowDeleteConfirm(false)} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" onPress={handleDelete} loading={deleteLoading} disabled={deleteName !== currentBusiness?.name} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingMember} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="person" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Edit Role</Text>
            <Text style={styles.modalMessage}>{editingMember?.name || editingMember?.email}</Text>
            <View style={styles.roleOptions}>
              {['admin', 'manager', 'cashier', 'viewer'].map((r) => {
                const rc = getRoleColor(r)
                return (
                  <TouchableOpacity key={r} style={[styles.roleBtn, memberRole === r && { backgroundColor: rc.bg, borderColor: rc.bg }]} onPress={() => setMemberRole(r)}>
                    <Text style={[styles.roleText, memberRole === r && { color: '#FFF' }]}>{getRoleLabel(r)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setEditingMember(null)} style={{ flex: 1 }} />
              <Button title="Update" onPress={handleUpdateMember} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCopyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: Colors.emeraldLight }]}>
              <Ionicons name="key" size={22} color={Colors.emerald} />
            </View>
            <Text style={styles.modalTitle}>Business Key</Text>
            <View style={styles.keyCard}>
              <Text style={styles.keyValue}>{businessKey}</Text>
            </View>
            <Text style={styles.keyHint}>Share this key with team members to join your business</Text>
            <View style={styles.modalBtns}>
              <Button title="Close" onPress={() => setShowCopyModal(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!removeTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="person-remove" size={22} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Remove Member</Text>
            <Text style={styles.modalMessage}>Remove {removeTarget?.name || removeTarget?.email || 'this member'} from this business?</Text>
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setRemoveTarget(null)} style={{ flex: 1 }} />
              <Button title="Remove" variant="danger" onPress={confirmRemoveMember} loading={removeLoading} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!actionError} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="alert-circle" size={22} color={Colors.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: Colors.danger }]}>Error</Text>
            <Text style={styles.modalMessage}>{actionError}</Text>
            <Button title="OK" onPress={() => setActionError('')} style={{ width: '100%' }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  heroTop: { paddingHorizontal: 20, paddingTop: 2 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  heroQuickStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.xl,
    marginTop: 16, paddingVertical: 14, paddingHorizontal: 12, marginHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  heroStatValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },

  body: { padding: 16, gap: 12 },

  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl,
    padding: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  dangerCard: { borderWidth: 1, borderColor: Colors.danger + '30' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  infoLabel: { fontSize: 14, color: Colors.textLight },
  infoValue: { fontSize: 15, fontWeight: '600', color: Colors.text },

  keyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: 12,
  },
  keyValue: { fontSize: 14, color: Colors.text, fontFamily: 'monospace', fontWeight: '600', flex: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: Colors.primaryLight, borderRadius: BORDER_RADIUS.md },
  copyText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  keyHint: { fontSize: 12, color: Colors.textLight, marginTop: 8 },

  memberCount: { backgroundColor: Colors.primaryLight, borderRadius: BORDER_RADIUS.full, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  memberCountText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  memberBorder: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 16, fontWeight: '700' },
  memberName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  memberMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: Colors.textLight },
  memberActions: { flexDirection: 'row', gap: 8 },
  memberActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

  emptyMembers: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: Colors.textLight, marginTop: 8 },

  dangerText: { fontSize: 13, color: Colors.textLight, lineHeight: 18 },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: Colors.danger + '30', backgroundColor: Colors.dangerLight,
  },
  leaveBtnText: { fontSize: 14, fontWeight: '600', color: Colors.danger },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: Colors.danger,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xxl, padding: 24, width: '100%', maxWidth: 380, alignItems: 'center' },
  modalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: Colors.textLight, marginBottom: 16, lineHeight: 20, textAlign: 'center' },
  textInput: {
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text, marginBottom: 16, width: '100%',
  },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, width: '100%' },
  roleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  roleText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
})
