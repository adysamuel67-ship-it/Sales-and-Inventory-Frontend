import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { adminAPI } from '@/lib/api'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { parseApiError, extractArray } from '@/lib/utils'

interface UserData {
  user_id: number
  id?: number
  name: string
  email: string
  phone?: string
  role: string
  is_verified?: boolean
  is_active?: boolean
  created_at?: string
}

const ROLES = ['user', 'admin', 'manager', 'cashier', 'viewer']

export default function AdminUsersScreen() {
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('user')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminAPI.listAllUsers()
      setUsers(extractArray(res.data))
    } catch {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchUsers()
  }, [fetchUsers])

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  const openEdit = (user: UserData) => {
    setEditingUser(user)
    setEditName(user.name || '')
    setEditEmail(user.email || '')
    setEditRole((user.role || 'user').toLowerCase())
    setEditPhone(user.phone || '')
    setEditModalVisible(true)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    if (!editName.trim()) {
      Alert.alert('Validation', 'Name is required')
      return
    }
    setSaving(true)
    try {
      await adminAPI.updateUser(editingUser.user_id ?? editingUser.id!, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        phone: editPhone.trim(),
      })
      setUsers((prev) =>
        prev.map((u) =>
          (u.user_id ?? u.id) === (editingUser.user_id ?? editingUser.id)
            ? { ...u, name: editName.trim(), email: editEmail.trim(), role: editRole, phone: editPhone.trim() }
            : u
        )
      )
      setEditModalVisible(false)
      Alert.alert('Success', 'User updated')
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (user: UserData) => {
    const uid = user.user_id ?? user.id
    Alert.alert('Delete User', `Are you sure you want to delete ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminAPI.deleteUser(uid)
            setUsers((prev) => prev.filter((u) => (u.user_id ?? u.id) !== uid))
            Alert.alert('Success', 'User deleted')
          } catch (err) {
            Alert.alert('Error', parseApiError(err))
          }
        },
      },
    ])
  }

  const handleToggleActive = async (user: UserData) => {
    const uid = user.user_id ?? user.id
    try {
      await adminAPI.activateUser(uid)
      setUsers((prev) =>
        prev.map((u) =>
          (u.user_id ?? u.id) === uid ? { ...u, is_active: !u.is_active } : u
        )
      )
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    }
  }

  const handleVerify = async (user: UserData) => {
    try {
      await adminAPI.verifyUser(user.email)
      setUsers((prev) =>
        prev.map((u) =>
          (u.user_id ?? u.id) === (user.user_id ?? user.id) ? { ...u, is_verified: true } : u
        )
      )
      Alert.alert('Success', `User ${user.name} verified`)
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    }
  }

  const renderRoleBadge = (role?: string) => {
    const r = (role || 'user').toLowerCase()
    let bg = Colors.surfaceAlt
    let color = Colors.textLight
    if (r === 'super_admin') { bg = Colors.dangerLight; color = Colors.danger }
    else if (r === 'admin' || r === 'owner') { bg = Colors.primaryLight; color = Colors.primary }
    else if (r === 'manager') { bg = Colors.successLight; color = Colors.success }
    else if (r === 'cashier') { bg = Colors.warningLight; color = Colors.warning }
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{r.replace('_', ' ')}</Text>
      </View>
    )
  }

  const renderItem = ({ item }: { item: UserData }) => {
    const uid = item.user_id ?? item.id
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name || 'Unknown'}</Text>
              {item.is_verified !== false && (
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
            {item.phone ? <Text style={styles.phone} numberOfLines={1}>{item.phone}</Text> : null}
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
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleActive(item)}>
            <Ionicons name={item.is_active !== false ? 'pause' : 'play'} size={15} color={Colors.warning} />
            <Text style={[styles.actionText, { color: Colors.warning }]}>{item.is_active !== false ? 'Deactivate' : 'Activate'}</Text>
          </TouchableOpacity>
          {item.is_verified !== true && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleVerify(item)}>
              <Ionicons name="shield-checkmark" size={15} color={Colors.success} />
              <Text style={[styles.actionText, { color: Colors.success }]}>Verify</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={15} color={Colors.danger} />
            <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={32} color={Colors.textLight} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.count}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</Text>
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.user_id ?? item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptySubtitle}>{search ? 'Try a different search' : 'No users available'}</Text>
          </View>
        }
      />

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Full name" placeholderTextColor={Colors.textLight} />
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="Email" placeholderTextColor={Colors.textLight} keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Phone" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" />
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
            </ScrollView>
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: SPACING.sm, color: Colors.textLight, fontSize: FONT_SIZE.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.lg, margin: SPACING.lg, marginBottom: 0,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: FONT_SIZE.md, color: Colors.text },
  count: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, fontSize: FONT_SIZE.xs, color: Colors.textLight },
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  email: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  phone: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginTop: 1 },
  badges: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600', textTransform: 'capitalize' },
  cardActions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm,
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
    padding: SPACING.xl, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.text, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONT_SIZE.md, color: Colors.text,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  roleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleChipText: { fontSize: FONT_SIZE.sm, color: Colors.text, textTransform: 'capitalize' },
  roleChipTextActive: { color: '#FFF', fontWeight: '600' },
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
