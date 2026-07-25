import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { businessAPI } from '@/lib/api'
import { extractArray, isAdminRole, parseApiError } from '@/lib/utils'
import { Colors } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AlertBadge from '@/components/ui/AlertBadge'

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const businessId = Number(id)
  const router = useRouter()
  const { user, currentBusiness, fetchBusinesses, logout } = useAuth()
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

  const fetchData = useCallback(async () => {
    if (!businessId) return
    setError('')
    try {
      const [bizRes, keyRes] = await Promise.allSettled([
        businessAPI.get(businessId),
        businessAPI.getBusinessKey(businessId),
      ])
      if (bizRes.status === 'fulfilled') {
        const d = bizRes.value.data?.data || bizRes.value.data
        setBusinessData(d)
        setMembers(extractArray(d?.members || d?.team_members))
      }
      if (keyRes.status === 'fulfilled') {
        setBusinessKey(keyRes.value.data?.business_key || keyRes.value.data?.key || '')
      }
    } catch { setError('Failed to load settings') }
  }, [businessId])

  useEffect(() => { setLoading(true); fetchData().finally(() => setLoading(false)) }, [fetchData])

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }, [fetchData])

  const handleUpdateName = async () => {
    if (!editName.trim()) return
    setEditNameLoading(true)
    try {
      await businessAPI.update(businessId, { name: editName.trim() })
      setShowNameEdit(false); await fetchData(); await fetchBusinesses()
    } catch (err: any) { Alert.alert('Error', parseApiError(err)) } finally { setEditNameLoading(false) }
  }

  const handleCopyKey = () => {
    if (businessKey) {
      Alert.alert('Business Key', businessKey)
    }
  }

  const handleLeave = async () => {
    setLeaveLoading(true)
    try {
      await businessAPI.leave(businessId)
      await fetchBusinesses()
      setShowLeaveConfirm(false)
      router.replace('/(tabs)/more')
    } catch (err: any) { Alert.alert('Error', parseApiError(err)) } finally { setLeaveLoading(false) }
  }

  const handleDelete = async () => {
    if (deleteName !== currentBusiness?.name) {
      Alert.alert('Error', 'Type the business name to confirm')
      return
    }
    setDeleteLoading(true)
    try {
      await businessAPI.delete(businessId)
      await fetchBusinesses()
      setShowDeleteConfirm(false)
      router.replace('/(tabs)/more')
    } catch (err: any) { Alert.alert('Error', parseApiError(err)) } finally { setDeleteLoading(false) }
  }

  const handleUpdateMember = async () => {
    if (!editingMember) return
    try {
      await businessAPI.updateMember(businessId, editingMember.member_id || editingMember.id, { role: memberRole })
      setEditingMember(null); await fetchData()
    } catch (err: any) { Alert.alert('Error', parseApiError(err)) }
  }

  const handleToggleActive = async (member: any) => {
    try {
      await businessAPI.updateMember(businessId, member.member_id || member.id, { is_active: !member.is_active })
      await fetchData()
    } catch (err: any) { Alert.alert('Error', parseApiError(err)) }
  }

  const handleRemoveMember = async (member: any) => {
    Alert.alert('Remove Member', `Remove ${member.name || 'this member'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await businessAPI.removeMember(businessId, member.member_id || member.id)
            await fetchData()
          } catch (err: any) { Alert.alert('Error', parseApiError(err)) }
        }
      },
    ])
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading settings..." />

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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      {error ? <AlertBadge message={error} type="error" /> : null}

      {isAdmin && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Business Name</Text>
          <View style={styles.nameRow}>
            <Text style={styles.nameValue}>{currentBusiness?.name || businessData?.name || 'N/A'}</Text>
            <TouchableOpacity onPress={() => { setEditName(currentBusiness?.name || ''); setShowNameEdit(true) }}>
              <Ionicons name="pencil" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Business Key</Text>
        <Text style={styles.keyValue}>{businessKey || 'Loading...'}</Text>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopyKey}>
          <Ionicons name="copy-outline" size={18} color={Colors.primary} />
          <Text style={styles.copyText}>Copy Key</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Team Members</Text>
        {members.length === 0 && <Text style={styles.emptyText}>No team members</Text>}
        {members.map((m) => (
          <View key={m.member_id || m.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberInitial}>{(m.name || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.name || m.email}</Text>
              <Text style={styles.memberRole}>{m.role || 'member'}</Text>
            </View>
            {isAdmin && (
              <View style={styles.memberActions}>
                <TouchableOpacity onPress={() => { setEditingMember(m); setMemberRole(m.role || 'member') }} style={styles.memberAction}>
                  <Ionicons name="pencil" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleToggleActive(m)} style={styles.memberAction}>
                  <Ionicons name={m.is_active ? 'checkmark-circle' : 'close-circle'} size={16} color={m.is_active ? Colors.success : Colors.danger} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveMember(m)} style={styles.memberAction}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Business</Text>
        <Text style={styles.dangerText}>Once you leave, you'll lose access to this business.</Text>
        <Button title="Leave Business" variant="outline" onPress={() => setShowLeaveConfirm(true)} style={{ marginTop: 12 }} />
      </Card>

      {isAdmin && (
        <Card style={[styles.section, { borderColor: Colors.danger, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Danger Zone</Text>
          <Text style={styles.dangerText}>Permanently delete this business and all its data.</Text>
          <Button title="Delete Business" variant="danger" onPress={() => { setDeleteName(''); setShowDeleteConfirm(true) }} style={{ marginTop: 12 }} />
        </Card>
      )}

      <Modal visible={showNameEdit} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
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
            <Text style={styles.modalTitle}>Leave Business</Text>
            <Text style={styles.modalMessage}>Are you sure you want to leave "{currentBusiness?.name}"?</Text>
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
            <Text style={[styles.modalTitle, { color: Colors.danger }]}>Delete Business</Text>
            <Text style={styles.modalMessage}>This action is irreversible. Type the business name to confirm.</Text>
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
            <Text style={styles.modalTitle}>Edit Role</Text>
            <Text style={styles.modalMessage}>{editingMember?.name || editingMember?.email}</Text>
            <View style={styles.roleOptions}>
              {['admin', 'manager', 'cashier', 'viewer'].map((r) => (
                <TouchableOpacity key={r} style={[styles.roleBtn, memberRole === r && styles.roleActive]} onPress={() => setMemberRole(r)}>
                  <Text style={[styles.roleText, memberRole === r && styles.roleTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setEditingMember(null)} style={{ flex: 1 }} />
              <Button title="Update" onPress={handleUpdateMember} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  section: { marginHorizontal: 16, marginTop: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameValue: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  keyValue: { fontSize: 14, color: Colors.text, fontFamily: 'monospace', backgroundColor: Colors.surfaceAlt, padding: 10, borderRadius: 8, marginBottom: 8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  copyText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  memberName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  memberRole: { fontSize: 12, color: Colors.textLight, marginTop: 2, textTransform: 'capitalize' },
  memberActions: { flexDirection: 'row', gap: 12 },
  memberAction: { padding: 4 },
  dangerText: { fontSize: 13, color: Colors.textLight, lineHeight: 18 },
  emptyText: { fontSize: 14, color: Colors.textLight, textAlign: 'center', padding: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  modalMessage: { fontSize: 14, color: Colors.textLight, marginBottom: 16, lineHeight: 20 },
  textInput: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  roleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  roleTextActive: { color: '#FFF' },
})
