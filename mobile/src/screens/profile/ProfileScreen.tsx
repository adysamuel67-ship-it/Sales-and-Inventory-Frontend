import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { profileAPI } from '@/lib/api'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { parseApiError } from '@/lib/utils'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, logout, fetchProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editPhone, setEditPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleSave = async () => {
    if (!user) return
    if (!editName.trim()) {
      Alert.alert('Validation', 'Name is required')
      return
    }
    setSaving(true)
    try {
      await profileAPI.updateProfile(user.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
      })
      await fetchProfile()
      setEditing(false)
      Alert.alert('Success', 'Profile updated')
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    if (deleteConfirmText !== user.name) {
      Alert.alert('Error', 'Type your name to confirm deletion')
      return
    }
    try {
      await profileAPI.deleteProfile(user.id)
      Alert.alert('Account Deleted', 'Your account has been deleted')
      await logout()
      router.replace('/(auth)/login')
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          {editing ? (
            <>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
                placeholderTextColor={Colors.textLight}
              />
              <TextInput
                style={styles.editInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
              />
            </>
          ) : (
            <>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
              {user.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color={Colors.textLight} />
              <Text style={styles.infoLabel}>Role</Text>
              <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}>
                <Text style={[styles.badgeText, { color: Colors.primary }]}>
                  {(user.role || 'user').replace('_', ' ')}
                </Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={18} color={Colors.textLight} />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            {user.phone && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={18} color={Colors.textLight} />
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{user.phone}</Text>
                </View>
              </>
            )}
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color={Colors.textLight} />
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{formatDate(user.created_at)}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={18} color={Colors.textLight} />
              <Text style={styles.infoLabel}>Verified</Text>
              <View style={[styles.badge, { backgroundColor: user.is_verified ? Colors.successLight : Colors.warningLight }]}>
                <Text style={[styles.badgeText, { color: user.is_verified ? Colors.success : Colors.warning }]}>
                  {user.is_verified ? 'Verified' : 'Not Verified'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          {editing ? (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setEditName(user.name); setEditPhone(user.phone || '') }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Ionicons name="pencil" size={18} color={Colors.primary} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out" size={18} color={Colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteModalVisible(true)}>
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {deleteModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <TouchableOpacity onPress={() => { setDeleteModalVisible(false); setDeleteConfirmText('') }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              This action is permanent and cannot be undone. Type your name <Text style={{ fontWeight: '700' }}>{user.name}</Text> to confirm.
            </Text>
            <TextInput
              style={styles.confirmInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={`Type "${user.name}" to confirm`}
              placeholderTextColor={Colors.textLight}
              autoCapitalize="words"
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setDeleteModalVisible(false); setDeleteConfirmText('') }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteConfirmBtn,
                  deleteConfirmText !== user.name && { opacity: 0.5 },
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== user.name}
              >
                <Text style={styles.deleteConfirmBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textLight, fontSize: FONT_SIZE.md },
  avatarSection: { alignItems: 'center', paddingVertical: SPACING.xxl, backgroundColor: Colors.surface },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.primary },
  name: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: Colors.text },
  email: { fontSize: FONT_SIZE.md, color: Colors.textLight, marginTop: 4 },
  phone: { fontSize: FONT_SIZE.md, color: Colors.textLight, marginTop: 2 },
  editInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONT_SIZE.md, color: Colors.text,
    width: '80%', marginBottom: SPACING.sm, textAlign: 'center',
  },
  section: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.sm },
  infoLabel: { fontSize: FONT_SIZE.md, color: Colors.text, flex: 1 },
  infoValue: { fontSize: FONT_SIZE.md, color: Colors.textLight, textTransform: 'capitalize' },
  infoDivider: { height: 1, backgroundColor: Colors.border },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600', textTransform: 'capitalize' },
  actionsSection: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  editActions: { flexDirection: 'row', gap: SPACING.sm },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: Colors.primary,
    paddingVertical: SPACING.md,
  },
  editBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.primary },
  cancelBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface,
  },
  cancelBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.textLight },
  saveBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  saveBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#FFF' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.dangerLight, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  signOutText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.danger },
  deleteBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  deleteBtnText: { fontSize: FONT_SIZE.sm, color: Colors.textLight, textDecorationLine: 'underline' },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, width: '100%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.danger },
  modalDesc: { fontSize: FONT_SIZE.sm, color: Colors.textLight, lineHeight: 20, marginBottom: SPACING.lg },
  confirmInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: Colors.danger,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONT_SIZE.md, color: Colors.text,
  },
  modalFooter: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  deleteConfirmBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: Colors.danger, alignItems: 'center',
  },
  deleteConfirmBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#FFF' },
})
