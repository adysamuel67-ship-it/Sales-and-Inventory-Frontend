import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { businessAPI } from '@/lib/api'
import { isAdminRole } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import Button from '@/components/ui/Button'
import GradientHero from '@/components/ui/GradientHero'

export default function MoreScreen() {
  const router = useRouter()
  const { user, currentBusiness, businesses, switchBusiness, fetchBusinesses, logout } = useAuth()
  const [showBizSelector, setShowBizSelector] = useState(false)
  const [loadingLeave, setLoadingLeave] = useState(false)
  const isAdmin = isAdminRole(user?.business_role) || isAdminRole(user?.role)

  const [confirmType, setConfirmType] = useState<'signout' | 'leave' | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const handleLeaveBusiness = () => {
    if (!currentBusiness) return
    setConfirmType('leave')
  }

  const handleConfirmAction = async () => {
    setConfirmLoading(true)
    try {
      if (confirmType === 'leave' && currentBusiness) {
        await businessAPI.leave(currentBusiness.business_id)
        await fetchBusinesses()
        setConfirmType(null)
        router.replace('/more')
      } else if (confirmType === 'signout') {
        await logout()
        setConfirmType(null)
        router.replace('/(auth)/login')
      }
    } catch (e: any) {
      setConfirmType(null)
      setErrorConfirm(e?.response?.data?.detail || 'Action failed')
    } finally {
      setConfirmLoading(false)
    }
  }

  const [errorConfirm, setErrorConfirm] = useState('')

  const handleSignOut = () => {
    setConfirmType('signout')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GradientHero topInset={54} height={120}>
        <View style={styles.profileHeaderInner}>
          <View style={styles.heroAvatar}>
            <Text style={styles.profileAvatarText}>{(user?.name || 'U')[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, paddingLeft: 14 }}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            {currentBusiness && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user?.business_role || user?.role || 'Member'}</Text>
              </View>
            )}
          </View>
        </View>
      </GradientHero>

      <View style={styles.afterHero}>
      {currentBusiness && (
        <>
          <Text style={styles.sectionHeader}>Business</Text>
          <TouchableOpacity style={styles.bizCard} onPress={() => setShowBizSelector(true)}>
            <View style={styles.bizIcon}>
              <Text style={styles.bizInitial}>{(currentBusiness.name || '?')[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bizName}>{currentBusiness.name}</Text>
              <Text style={styles.bizRole}>Tap to switch business</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </>
      )}

      {isAdmin && (
        <>
          <Text style={styles.sectionHeader}>Administration</Text>
          <TouchableOpacity style={styles.adminCard} onPress={() => router.push('/admin')}>
            <View style={styles.adminIcon}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminTitle}>Admin Panel</Text>
              <Text style={styles.adminSubtitle}>Manage businesses, users, and system</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.sectionHeader}>Manage</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/join-business')}>
          <View style={[styles.menuIcon, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="business-outline" size={20} color={Colors.purple} />
          </View>
          <Text style={styles.menuLabel}>Join Business</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={() => { if (currentBusiness) router.push(`/business/${currentBusiness.business_id}/notifications`) }}>
          <View style={[styles.menuIcon, { backgroundColor: '#EFF4FF' }]}>
            <Ionicons name="notifications" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        {currentBusiness && (
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push(`/business/${currentBusiness.business_id}/requests`)}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="paper-plane-outline" size={20} color={Colors.warning} />
            </View>
            <Text style={styles.menuLabel}>Join Requests</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.menuRow} onPress={() => { if (currentBusiness) router.push(`/business/${currentBusiness.business_id}/reports`) }}>
          <View style={[styles.menuIcon, { backgroundColor: '#EFF4FF' }]}>
            <Ionicons name="bar-chart" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Reports</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={() => { if (currentBusiness) router.push(`/business/${currentBusiness.business_id}/settings`) }}>
          <View style={[styles.menuIcon, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="settings" size={20} color={Colors.neutral} />
          </View>
          <Text style={styles.menuLabel}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/profile')}>
          <View style={[styles.menuIcon, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="person" size={20} color={Colors.success} />
          </View>
          <Text style={styles.menuLabel}>Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Account</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={handleLeaveBusiness} disabled={loadingLeave}>
          <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="exit" size={20} color={Colors.warning} />
          </View>
          <Text style={[styles.menuLabel, { color: Colors.warning }]}>Leave Business</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} onPress={handleSignOut}>
          <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="log-out" size={20} color={Colors.danger} />
          </View>
          <Text style={[styles.menuLabel, styles.dangerText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionHeader, { textAlign: 'center', marginTop: 24 }]}>Sales & Inventory Tracker v1.0</Text>
      </View>

      <Modal visible={showBizSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Switch Business</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {businesses.map((biz) => (
                <TouchableOpacity
                  key={biz.business_id}
                  style={[styles.bizSelectItem, biz.business_id === currentBusiness?.business_id && styles.bizSelectActive]}
                  onPress={() => {
                    switchBusiness(biz)
                    setShowBizSelector(false)
                    router.replace('/(tabs)/dashboard')
                  }}
                >
                  <Text style={[styles.bizSelectName, biz.business_id === currentBusiness?.business_id && styles.bizSelectActiveText]}>
                    {biz.name}
                  </Text>
                  {biz.business_id === currentBusiness?.business_id && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Close" variant="outline" onPress={() => setShowBizSelector(false)} style={{ marginTop: 16 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={confirmType !== null} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIconWrap, { backgroundColor: confirmType === 'signout' ? Colors.dangerLight : Colors.warningLight }]}>
              <Ionicons name={confirmType === 'signout' ? 'log-out' : 'exit'} size={28} color={confirmType === 'signout' ? Colors.danger : Colors.warning} />
            </View>
            <Text style={styles.confirmTitle}>{confirmType === 'signout' ? 'Sign Out?' : 'Leave Business?'}</Text>
            <Text style={styles.confirmMsg}>
              {confirmType === 'signout'
                ? 'Are you sure you want to sign out of your account?'
                : `Are you sure you want to leave "${currentBusiness?.name}"?`}
            </Text>
            {errorConfirm ? <Text style={styles.confirmError}>{errorConfirm}</Text> : null}
            <View style={styles.confirmActions}>
              <Button title="Cancel" variant="outline" onPress={() => { setConfirmType(null); setErrorConfirm('') }} style={{ flex: 1 }} />
              <Button
                title={confirmType === 'signout' ? 'Sign Out' : 'Leave'}
                variant={confirmType === 'signout' ? 'danger' : 'danger'}
                onPress={handleConfirmAction}
                loading={confirmLoading}
                disabled={confirmLoading}
                style={{ flex: 1 }}
              />
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
  profileHeaderInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4 },
  heroAvatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  profileAvatarText: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textTransform: 'capitalize' },
  afterHero: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4, marginBottom: 8, marginTop: 8 },
  bizCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.xl, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  bizIcon: {
    width: 48, height: 48, borderRadius: BORDER_RADIUS.xl, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  bizInitial: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  bizName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  bizRole: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  section: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  adminCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  adminIcon: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.lg, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  adminTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  adminSubtitle: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },
  dangerText: { color: Colors.danger },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  bizSelectItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: BORDER_RADIUS.lg, marginBottom: 8, backgroundColor: Colors.surfaceAlt,
  },
  bizSelectActive: { backgroundColor: Colors.primaryLight },
  bizSelectName: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  bizSelectActiveText: { color: Colors.primary },

  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  confirmCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center',
  },
  confirmIconWrap: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  confirmMsg: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  confirmError: { fontSize: 13, color: Colors.danger, textAlign: 'center', marginTop: 8 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
})
