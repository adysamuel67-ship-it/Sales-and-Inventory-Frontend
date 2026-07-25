import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { businessAPI } from '@/lib/api'
import { isAdminRole } from '@/lib/utils'
import { Colors } from '@/lib/constants'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  color?: string
  danger?: boolean
}

export default function MoreScreen() {
  const router = useRouter()
  const { user, currentBusiness, businesses, switchBusiness, fetchBusinesses, logout } = useAuth()
  const [showBizSelector, setShowBizSelector] = useState(false)
  const [loadingLeave, setLoadingLeave] = useState(false)
  const isAdmin = isAdminRole(user?.business_role) || isAdminRole(user?.role)

  const handleLeaveBusiness = () => {
    if (!currentBusiness) return
    Alert.alert('Leave Business', `Are you sure you want to leave "${currentBusiness.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          setLoadingLeave(true)
          try {
            await businessAPI.leave(currentBusiness.business_id)
            await fetchBusinesses()
            router.replace('/(tabs)/more')
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Failed to leave business')
          } finally { setLoadingLeave(false) }
        }
      },
    ])
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login') } },
    ])
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'wallet-outline', label: 'Debts', onPress: () => {
        if (currentBusiness) router.push(`/business/${currentBusiness.business_id}/debts`)
      }
    },
    {
      icon: 'bar-chart-outline', label: 'Reports', onPress: () => {
        if (currentBusiness) router.push(`/business/${currentBusiness.business_id}/reports`)
      }
    },
    {
      icon: 'settings-outline', label: 'Settings', onPress: () => {
        if (currentBusiness) router.push(`/business/${currentBusiness.business_id}/settings`)
      }
    },
    { icon: 'person-outline', label: 'Profile', onPress: () => router.push('/profile') },
  ]

  if (isAdmin) {
    menuItems.push({
      icon: 'shield-checkmark-outline', label: 'Admin Panel', onPress: () => router.push('/admin'),
    })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>More</Text>

      {currentBusiness && (
        <TouchableOpacity style={styles.bizCard} onPress={() => setShowBizSelector(true)}>
          <View style={styles.bizIcon}>
            <Text style={styles.bizInitial}>{(currentBusiness.name || '?')[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bizName}>{currentBusiness.name}</Text>
            <Text style={styles.bizRole}>{user?.business_role || user?.role || 'Member'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
            <Ionicons name={item.icon} size={22} color={item.danger ? Colors.danger : Colors.text} />
            <Text style={[styles.menuLabel, item.danger && styles.dangerText]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={handleLeaveBusiness} disabled={loadingLeave}>
          <Ionicons name="exit-outline" size={22} color={Colors.warning} />
          <Text style={[styles.menuLabel, { color: Colors.warning }]}>Leave Business</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          <Text style={[styles.menuLabel, styles.dangerText]}>Sign Out</Text>
        </TouchableOpacity>
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  bizCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 12, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  bizIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  bizInitial: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  bizName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  bizRole: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  section: {
    backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
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
    padding: 14, borderRadius: 10, marginBottom: 8, backgroundColor: Colors.surfaceAlt,
  },
  bizSelectActive: { backgroundColor: Colors.primaryLight },
  bizSelectName: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  bizSelectActiveText: { color: Colors.primary },
})
