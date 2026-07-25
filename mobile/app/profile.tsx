import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { profileAPI, businessAPI } from '@/lib/api'
import { parseApiError, formatDate, isAdminRole, getRoleColor, getRoleLabel } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AlertBadge from '@/components/ui/AlertBadge'

const { width } = Dimensions.get('window')

export default function ProfileScreen() {
  const router = useRouter()
  const { user, currentBusiness, businesses, fetchBusinesses, switchBusiness, logout } = useAuth()
  const isAdmin = isAdminRole(user?.business_role) || isAdminRole(user?.role)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [bizDetails, setBizDetails] = useState<Record<number, { name: string; members: number | null; key: string }>>({})
  const [loadingBiz, setLoadingBiz] = useState<Record<number, boolean>>({})

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    setError('')
    try {
      const res = await profileAPI.getMyProfile()
      const data = res.data
      setName(data.name || data.full_name || '')
      setPhone(data.phone || '')
      setEmail(data.email || user.email || '')

      if (businesses?.length) {
        const details: Record<number, { name: string; members: number | null; key: string }> = {}
        await Promise.all(businesses.map(async (biz) => {
          try {
            const bizRes = await businessAPI.get(biz.business_id)
            const bizData = bizRes.data?.data || bizRes.data
            let key = ''
            try {
              const keyRes = await businessAPI.getBusinessKey(biz.business_id)
              key = keyRes.data?.business_key || keyRes.data?.key || ''
            } catch {}
            details[biz.business_id] = {
              name: bizData?.name || biz.name || '',
              members: bizData?.members || biz.members || null,
              key,
            }
          } catch {
            details[biz.business_id] = { name: biz.name || '', members: biz.members || null, key: '' }
          }
        }))
        setBizDetails(details)
      }
    } catch {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [user, businesses])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await profileAPI.updateProfile(user.id, { name: name.trim(), phone: phone.trim() })
      setSuccess('Profile updated successfully')
      setEditing(false)
      await fetchBusinesses()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.id) return
    setDeleting(true)
    setError('')
    try {
      await profileAPI.deleteProfile(user.id)
      await logout()
      router.replace('/(auth)/login')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete account')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setShowSignOutConfirm(false)
    setSigningOut(true)
    try {
      await logout()
      router.replace('/(auth)/login')
    } catch {
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading profile..." />

  const initial = (name || user?.email || '?')[0]?.toUpperCase() || 'U'
  const displayRole = user?.role || 'user'
  const isVerified = user?.is_verified === true
  const roleColor = getRoleColor(displayRole)
  const memberSince = user?.created_at ? formatDate(user.created_at) : 'N/A'

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        <View style={styles.heroCover}>
          <View style={styles.heroCoverCircle1} />
          <View style={styles.heroCoverCircle2} />
          <View style={styles.heroCoverCircle3} />
          <View style={styles.heroCoverFade} />
        </View>

        <View style={styles.heroInfo}>
          <TouchableOpacity style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={12} color={Colors.primary} />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{name || 'User'}</Text>
          <Text style={styles.userEmail}>{email}</Text>

          {user?.phone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={13} color={Colors.neutralLight} />
              <Text style={styles.userPhone}>{user.phone}</Text>
            </View>
          ) : null}

          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
              <Ionicons name="shield-checkmark" size={12} color={roleColor.text} />
              <Text style={[styles.roleBadgeText, { color: roleColor.text }]}>{getRoleLabel(displayRole)}</Text>
            </View>
            {isVerified ? (
              <View style={[styles.verifyBadge, { backgroundColor: Colors.emeraldLight }]}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.emerald} />
                <Text style={[styles.verifyBadgeText, { color: Colors.emerald }]}>Verified</Text>
              </View>
            ) : (
              <View style={[styles.verifyBadge, { backgroundColor: Colors.warningLight }]}>
                <Ionicons name="alert-circle" size={12} color={Colors.warning} />
                <Text style={[styles.verifyBadgeText, { color: Colors.warning }]}>Unverified</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="business" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{businesses?.length || 0}</Text>
            <Text style={styles.statLabel}>Businesses</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: isVerified ? Colors.emeraldLight : Colors.warningLight }]}>
              <Ionicons name={isVerified ? 'checkmark-circle' : 'alert-circle'} size={18} color={isVerified ? Colors.emerald : Colors.warning} />
            </View>
            <Text style={styles.statValue}>{isVerified ? 'Active' : 'Pending'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.purpleLight }]}>
              <Ionicons name="shield" size={18} color={Colors.purple} />
            </View>
            <Text style={styles.statValue}>{getRoleLabel(displayRole)}</Text>
            <Text style={styles.statLabel}>Role</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.amberLight }]}>
              <Ionicons name="calendar" size={18} color={Colors.amber} />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{memberSince}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
        </View>

        {businesses && businesses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Businesses</Text>
              <Text style={styles.sectionSub}>Tap to switch active business</Text>
            </View>
            {businesses.map((biz) => {
              const isActive = currentBusiness?.business_id === biz.business_id
              const detail = bizDetails[biz.business_id]
              const bizRole = biz.role || user?.business_role || ''
              const bizRoleColor = getRoleColor(bizRole)
              return (
                <TouchableOpacity
                  key={biz.business_id}
                  style={[styles.bizCard, isActive && styles.bizCardActive]}
                  onPress={() => { switchBusiness(biz); router.replace('/(tabs)/dashboard') }}
                  activeOpacity={0.7}
                >
                  <View style={styles.bizCardLeft}>
                    <View style={[styles.bizCardAvatar, isActive && styles.bizCardAvatarActive]}>
                      <Text style={[styles.bizCardInitial, isActive && styles.bizCardInitialActive]}>
                        {(detail?.name || biz.name || '?')[0]?.toUpperCase() || 'B'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.bizCardNameRow}>
                        <Text style={[styles.bizCardName, isActive && styles.bizCardNameActive]} numberOfLines={1}>
                          {detail?.name || biz.name || 'Business'}
                        </Text>
                        {isActive && (
                          <View style={styles.activePill}>
                            <Text style={styles.activePillText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.bizCardMetaRow}>
                        {bizRole ? (
                          <View style={[styles.miniRoleBadge, { backgroundColor: bizRoleColor.bg }]}>
                            <Text style={[styles.miniRoleText, { color: bizRoleColor.text }]}>{getRoleLabel(bizRole)}</Text>
                          </View>
                        ) : null}
                        {detail?.members !== null && detail?.members !== undefined ? (
                          <View style={styles.bizMetaItem}>
                            <Ionicons name="people" size={11} color={Colors.neutralLight} />
                            <Text style={styles.bizMetaText}>{detail.members} members</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
                  {!isActive && <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.sectionSub}>Your personal details</Text>
            </View>
            {!editing && (
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Ionicons name="pencil" size={14} color={Colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {error ? <AlertBadge message={error} type="error" /> : null}
          {success ? <AlertBadge message={success} type="success" /> : null}

          <View style={styles.infoCard}>
            {editing ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full name"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyText}>{email}</Text>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  </View>
                  <Text style={styles.fieldHint}>Email cannot be changed</Text>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone number"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.editActions}>
                  <Button title="Save Changes" onPress={handleSave} loading={saving} disabled={saving} size="lg" />
                  <Button title="Cancel" variant="outline" onPress={() => { setEditing(false); fetchData() }} size="lg" />
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="person-outline" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Full Name</Text>
                    <Text style={styles.infoValue}>{name || '---'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="mail-outline" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{email || '---'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="call-outline" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{user?.phone || '---'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Role</Text>
                    <View style={[styles.miniRoleBadge, { backgroundColor: roleColor.bg, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.miniRoleText, { color: roleColor.text }]}>{getRoleLabel(displayRole)}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>{memberSince}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Password</Text>
          </View>
          <View style={styles.passwordNotice}>
            <View style={styles.passwordNoticeIcon}>
              <Ionicons name="lock-closed" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.passwordNoticeTitle}>Managed by administrator</Text>
              <Text style={styles.passwordNoticeText}>Contact an admin to change your password</Text>
            </View>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.adminCard} onPress={() => router.push('/admin')}>
              <View style={[styles.adminCardIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminCardTitle}>Admin Panel</Text>
                <Text style={styles.adminCardSub}>Manage users, businesses & settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerIcon}>
              <Ionicons name="warning" size={18} color={Colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <Text style={styles.dangerSub}>Irreversible account actions</Text>
            </View>
          </View>
          <View style={styles.dangerDivider} />
          <View style={styles.dangerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerActionTitle}>Delete Account</Text>
              <Text style={styles.dangerActionSub}>Permanently delete your account and all data</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteConfirm(true)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="warning" size={32} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.modalMessage}>
              This action is permanent and cannot be undone. All your data will be removed.
            </Text>
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setShowDeleteConfirm(false)} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" onPress={handleDeleteAccount} loading={deleting} disabled={deleting} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },

  heroCover: {
    height: 160,
    backgroundColor: Colors.primary,
    position: 'relative',
    overflow: 'hidden',
  },
  heroCoverCircle1: {
    position: 'absolute', top: -50, right: -30,
    width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroCoverCircle2: {
    position: 'absolute', bottom: -30, left: -40,
    width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroCoverCircle3: {
    position: 'absolute', top: 20, right: 80,
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroCoverFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
    backgroundColor: Colors.background,
  },

  heroInfo: {
    alignItems: 'center',
    marginTop: -52,
    paddingHorizontal: 20,
  },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: Colors.background,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  userName: { fontSize: 22, fontWeight: '800', color: Colors.text },
  userEmail: { fontSize: 14, color: Colors.neutralLight, marginTop: 2 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
  },
  userPhone: { fontSize: 13, color: Colors.neutralLight },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  verifyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  verifyBadgeText: { fontSize: 12, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, marginTop: 20,
  },
  statCard: {
    flex: 1, minWidth: (width - 48) / 4,
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 13, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  statLabel: { fontSize: 10, color: Colors.neutralLight, marginTop: 2, fontWeight: '500' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sectionHeaderLeft: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sectionSub: { fontSize: 13, color: Colors.neutralLight, marginTop: 2 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  bizCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  bizCardActive: {
    borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bizCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bizCardAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  bizCardAvatarActive: { backgroundColor: Colors.primary },
  bizCardInitial: { fontSize: 16, fontWeight: '800', color: Colors.textLight },
  bizCardInitialActive: { color: '#FFFFFF' },
  bizCardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bizCardName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  bizCardNameActive: { color: Colors.primaryDark },
  activePill: {
    backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  activePillText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  bizCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  bizMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bizMetaText: { fontSize: 11, color: Colors.neutralLight },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.neutralLight, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, fontWeight: '600', color: Colors.text },

  miniRoleBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    alignSelf: 'flex-start',
  },
  miniRoleText: { fontSize: 12, fontWeight: '700' },

  

  infoCard: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.neutralLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 2 },

  fieldGroup: { marginBottom: 16 },
  textInput: {
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: Colors.text,
  },
  readOnlyField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  readOnlyText: { flex: 1, fontSize: 16, color: Colors.textLight },
  fieldHint: { fontSize: 12, color: Colors.neutralLight, marginTop: 4 },
  editActions: { gap: 10, marginTop: 8 },

  passwordNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  passwordNoticeIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  passwordNoticeTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  passwordNoticeText: { fontSize: 12, color: Colors.neutralLight, marginTop: 2 },

  adminCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  adminCardIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  adminCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  adminCardSub: { fontSize: 12, color: Colors.neutralLight, marginTop: 2 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: Colors.danger },

  dangerSection: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5, borderColor: Colors.dangerLight, padding: 16,
  },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dangerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center',
  },
  dangerTitle: { fontSize: 15, fontWeight: '700', color: Colors.danger },
  dangerSub: { fontSize: 12, color: Colors.neutralLight, marginTop: 1 },
  dangerDivider: { height: 1, backgroundColor: '#FEE2E2', marginVertical: 12 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dangerActionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  dangerActionSub: { fontSize: 12, color: Colors.neutralLight, marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: Colors.dangerLight, borderWidth: 1, borderColor: Colors.danger,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: Colors.danger },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 100,
  },
  modalCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 360, alignItems: 'center',
  },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalMessage: {
    fontSize: 14, color: Colors.neutralLight, textAlign: 'center',
    marginTop: 8, lineHeight: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
})
