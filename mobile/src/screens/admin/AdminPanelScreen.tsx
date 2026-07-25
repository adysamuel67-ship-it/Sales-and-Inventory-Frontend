import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { adminAPI, businessAPI, productAPI } from '@/lib/api'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { isSuperAdminUser, isAdminRole, parseApiError, extractArray } from '@/lib/utils'

const JOB_DEFINITIONS = [
  { key: 'daily_summery', label: 'Daily Summary', icon: 'calendar' as const, description: 'Send daily business summary emails' },
  { key: 'weekly_summery', label: 'Weekly Summary', icon: 'calendar-outline' as const, description: 'Send weekly business summary emails' },
  { key: 'monthly_summery', label: 'Monthly Summary', icon: 'bar-chart' as const, description: 'Send monthly business summary emails' },
]

export default function AdminPanelScreen() {
  const { user, currentBusiness } = useAuth()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const [users, setUsers] = useState<any[]>([])
  const [businesses, setBusinesses] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [jobStatuses, setJobStatuses] = useState<Record<string, string>>({})
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null)

  const isSuperAdmin = isSuperAdminUser(user)
  const isAdmin = isAdminRole(user?.business_role || user?.role)

  const fetchData = useCallback(async () => {
    try {
      if (isSuperAdmin) {
        const [usersRes, businessesRes] = await Promise.allSettled([
          adminAPI.listAllUsers(),
          businessAPI.listAll(),
        ])
        if (usersRes.status === 'fulfilled') setUsers(extractArray(usersRes.value.data))
        if (businessesRes.status === 'fulfilled') {
          const bizData = extractArray(businessesRes.value.data)
          setBusinesses(bizData)
        }

        if (currentBusiness) {
          try {
            const lowStockRes = await productAPI.lowStock(currentBusiness.business_id)
            setLowStock(extractArray(lowStockRes.data))
          } catch {
            setLowStock([])
          }
        }
      }

      if (isAdmin && currentBusiness) {
        const [membersRes, approvalsRes, lowStockRes] = await Promise.allSettled([
          adminAPI.listMembers(),
          businessAPI.getApprovals(currentBusiness.business_id, 'pending'),
          productAPI.lowStock(currentBusiness.business_id),
        ])
        if (membersRes.status === 'fulfilled') setMembers(extractArray(membersRes.value.data))
        if (approvalsRes.status === 'fulfilled') setPendingApprovals(extractArray(approvalsRes.value.data))
        if (lowStockRes.status === 'fulfilled') setLowStock(extractArray(lowStockRes.value.data))
      }
    } catch {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isSuperAdmin, isAdmin, currentBusiness])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  const handleToggleActive = async (userId: number) => {
    try {
      await adminAPI.activateUser(userId)
      setUsers((prev) =>
        prev.map((u) =>
          (u.user_id ?? u.id) === userId ? { ...u, is_active: !u.is_active } : u
        )
      )
      Alert.alert('Success', 'User status updated')
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    }
  }

  const handleDeleteUser = async (userId: number, name: string) => {
    Alert.alert('Delete User', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminAPI.deleteUser(userId)
            setUsers((prev) => prev.filter((u) => (u.user_id ?? u.id) !== userId))
            Alert.alert('Success', 'User deleted')
          } catch (err) {
            Alert.alert('Error', parseApiError(err))
          }
        },
      },
    ])
  }

  const handleApproveRequest = async (approvalId: number, approve: boolean) => {
    if (!currentBusiness) return
    try {
      await businessAPI.confirmApproval(currentBusiness.business_id, {
        approval_id: approvalId,
        dir: approve ? 1 : 0,
      })
      setPendingApprovals((prev) => prev.filter((a) => (a.approval_id ?? a.id) !== approvalId))
      Alert.alert('Success', approve ? 'Request approved' : 'Request rejected')
    } catch (err) {
      Alert.alert('Error', parseApiError(err))
    }
  }

  const handleTriggerJob = async (jobKey: string) => {
    setTriggeringJob(jobKey)
    try {
      await adminAPI.triggerJob(jobKey)
      setJobStatuses((prev) => ({ ...prev, [jobKey]: 'Triggered successfully' }))
      Alert.alert('Success', `${jobKey} job triggered`)
    } catch (err: any) {
      setJobStatuses((prev) => ({ ...prev, [jobKey]: 'Failed to trigger' }))
      Alert.alert('Error', parseApiError(err))
    } finally {
      setTriggeringJob(null)
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

  if (loading) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={32} color={Colors.textLight} />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>{isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Manager'} View</Text>
      </View>

      {isSuperAdmin && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={20} color={Colors.primary} />
              <Text style={styles.statValue}>{users.length}</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="business" size={20} color={Colors.success} />
              <Text style={styles.statValue}>{businesses.length}</Text>
              <Text style={styles.statLabel}>Businesses</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <Text style={styles.statValue}>{lowStock.length}</Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/admin/users')}
          >
            <Text style={styles.sectionTitle}>Users</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
          {users.length === 0 ? (
            <Text style={styles.emptyText}>No users found</Text>
          ) : (
            users.slice(0, 5).map((u) => {
              const uid = u.user_id ?? u.id
              return (
                <View key={uid} style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{(u.name || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{u.name || 'Unknown'}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
                  </View>
                  {renderRoleBadge(u.role)}
                  <TouchableOpacity onPress={() => handleToggleActive(uid)} style={styles.iconBtn}>
                    <Ionicons
                      name={u.is_active !== false ? 'checkmark-circle' : 'close-circle'}
                      size={22}
                      color={u.is_active !== false ? Colors.success : Colors.danger}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteUser(uid, u.name)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              )
            })
          )}
          {users.length > 5 && (
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/admin/users')}>
              <Text style={styles.viewAllText}>View all {users.length} users</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/admin/businesses')}
          >
            <Text style={styles.sectionTitle}>Businesses</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
          {businesses.length === 0 ? (
            <Text style={styles.emptyText}>No businesses found</Text>
          ) : (
            businesses.slice(0, 5).map((b: any) => (
              <View key={b.business_id ?? b.id} style={styles.bizCard}>
                <View style={[styles.bizIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="business" size={18} color={Colors.primary} />
                </View>
                <View style={styles.bizInfo}>
                  <Text style={styles.bizName} numberOfLines={1}>{b.name || 'Unnamed'}</Text>
                  <Text style={styles.bizMeta}>{b.members ?? 0} members</Text>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/admin/keys')}
          >
            <Text style={styles.sectionTitle}>Business Keys</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/admin/lowstock')}
          >
            <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/admin/jobs')}
          >
            <Text style={styles.sectionTitle}>Scheduled Jobs</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </>
      )}

      {isAdmin && !isSuperAdmin && (
        <>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/admin/members')}
          >
            <Text style={styles.sectionTitle}>Members</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
          {members.length === 0 ? (
            <Text style={styles.emptyText}>No members found</Text>
          ) : (
            members.slice(0, 5).map((m: any) => {
              const mid = m.member_id ?? m.user_id ?? m.id
              return (
                <View key={mid} style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{(m.name || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{m.name || 'Unknown'}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{m.email}</Text>
                  </View>
                  {renderRoleBadge(m.role || m.business_role)}
                </View>
              )
            })
          )}

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/business/' + currentBusiness?.business_id + '/requests')}
          >
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            {pendingApprovals.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pendingApprovals.length}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
          {pendingApprovals.length === 0 ? (
            <Text style={styles.emptyText}>No pending requests</Text>
          ) : (
            pendingApprovals.map((a: any) => {
              const aid = a.approval_id ?? a.id
              return (
                <View key={aid} style={styles.approvalCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {a.requester?.name || a.requester_name || `User #${a.requester_id}`}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {a.requester?.email || a.requester_email || ''} · {a.role || 'viewer'}
                    </Text>
                    {a.reason && (
                      <Text style={styles.reasonText} numberOfLines={2}>Reason: {a.reason}</Text>
                    )}
                  </View>
                  <View style={styles.approvalActions}>
                    <TouchableOpacity
                      style={[styles.approvalBtn, { backgroundColor: Colors.success }]}
                      onPress={() => handleApproveRequest(aid, true)}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approvalBtn, { backgroundColor: Colors.danger }]}
                      onPress={() => handleApproveRequest(aid, false)}
                    >
                      <Ionicons name="close" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )}

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/admin/lowstock')}
          >
            <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/admin/jobs')}
          >
            <Text style={styles.sectionTitle}>Scheduled Jobs</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: SPACING.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: SPACING.sm, color: Colors.textLight, fontSize: FONT_SIZE.md },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: FONT_SIZE.title, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  statValue: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text, flex: 1 },
  emptyText: { color: Colors.textLight, fontSize: FONT_SIZE.sm, paddingVertical: SPACING.md, textAlign: 'center' },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
  },
  userAvatarText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: Colors.primary },
  userInfo: { flex: 1, marginRight: SPACING.sm },
  userName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  userEmail: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, marginRight: SPACING.xs },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600', textTransform: 'capitalize' },
  iconBtn: { padding: SPACING.xs, marginLeft: 2 },
  bizCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  bizIcon: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
  },
  bizInfo: { flex: 1 },
  bizName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  bizMeta: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  approvalCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.warning,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  approvalActions: { flexDirection: 'row', gap: SPACING.xs },
  approvalBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  reasonText: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginTop: 2, fontStyle: 'italic' },
  countBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: BORDER_RADIUS.full,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
  },
  countBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: Colors.primary },
  viewAllBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  viewAllText: { color: Colors.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  bottomPadding: { height: 40 },
})
