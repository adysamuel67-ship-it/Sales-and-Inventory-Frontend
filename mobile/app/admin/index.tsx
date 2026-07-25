import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { adminAPI, businessAPI, cronAPI } from '@/lib/api'
import { extractArray, parseApiError, isAdminRole, isSuperAdminUser } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import KpiCard from '@/components/ui/KpiCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

type AdminTab = 'businesses' | 'users' | 'jobs'

export default function AdminPanelScreen() {
  const router = useRouter()
  const { user, switchBusiness } = useAuth()
  const isSuperAdmin = isSuperAdminUser(user)
  const canManageUsers = isAdminRole(user?.role) || isSuperAdmin

  const [activeTab, setActiveTab] = useState<AdminTab>('businesses')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [businesses, setBusinesses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])

  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userAction, setUserAction] = useState<'activate' | 'deactivate' | 'delete'>('activate')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    setError('')
    try {
      const results = await Promise.allSettled([
        isSuperAdmin ? businessAPI.listAll() : Promise.resolve({ data: [] }),
        canManageUsers ? adminAPI.listUsers() : Promise.resolve({ data: [] }),
        adminAPI.listMembers(),
      ])

      if (results[0].status === 'fulfilled') {
        const raw = extractArray(results[0].value.data)
        const mapped = raw.map((item: any) => {
          const biz = item.business || item
          return {
            ...biz,
            business_id: biz.business_id ?? biz.id,
            name: biz.name || 'Unnamed',
            members: item.members ?? biz.members ?? 0,
          }
        })
        setBusinesses(mapped)
      }
      if (results[1].status === 'fulfilled') {
        setUsers(extractArray(results[1].value.data))
      }
      if (results[2].status === 'fulfilled') {
        const members = extractArray(results[2].value.data)
        setUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id || u.user_id))
          const newMembers = members.filter((m) => !existingIds.has(m.id || m.user_id))
          return [...prev, ...newMembers]
        })
      }
    } catch {
      setError('Failed to load admin data')
    }
  }, [user, isSuperAdmin, canManageUsers])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const handleUserAction = async (action: 'activate' | 'deactivate' | 'delete', u: any) => {
    const userId = u.user_id || u.id
    if (action === 'delete') {
      setDeleteTarget(u)
      return
    }

    try {
      if (action === 'activate') {
        await adminAPI.activateUser(userId)
      } else {
        await adminAPI.updateUser(userId, { is_active: false })
      }
      setUsers((prev) =>
        prev.map((x) =>
          (x.user_id || x.id) === userId
            ? { ...x, is_active: action === 'activate' }
            : x
        )
      )
    } catch (err: any) {
      setActionError(parseApiError(err))
      setTimeout(() => setActionError(''), 4000)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const userId = deleteTarget.user_id || deleteTarget.id
    setDeleteLoading(true)
    try {
      await adminAPI.deleteUser(userId)
      setUsers((prev) => prev.filter((x) => (x.user_id || x.id) !== userId))
      setDeleteTarget(null)
    } catch (err: any) {
      setActionError(parseApiError(err))
      setTimeout(() => setActionError(''), 4000)
    } finally { setDeleteLoading(false) }
  }

  const handleTriggerJob = async (jobKey: string) => {
    try {
      await cronAPI.triggerJob(jobKey)
      setActionMessage(`Job "${jobKey}" triggered`)
      setTimeout(() => setActionMessage(''), 4000)
    } catch (err: any) {
      setActionError(parseApiError(err))
      setTimeout(() => setActionError(''), 4000)
    }
  }

  const renderBusinesses = () => (
    <View>
      <View style={styles.kpiRow}>
        <KpiCard title="Total Businesses" value={String(businesses.length)} icon="business-outline" color="primary" />
        <KpiCard title="Total Users" value={String(users.length)} icon="people-outline" color="success" />
      </View>
      {businesses.map((biz) => {
        const bizId = biz.business_id || biz.id
        const members = biz.members ?? 0
        return (
          <TouchableOpacity
            key={bizId}
            activeOpacity={0.7}
            onPress={() => {
              switchBusiness({ business_id: bizId, name: biz.name || 'Business', is_active: biz.is_active, members, role: biz.role })
              router.push(`/business/${bizId}/dashboard`)
            }}
          >
            <Card style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemAvatar}>
                  <Text style={styles.itemAvatarText}>{(biz.name || '?')[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{biz.name || 'Unnamed'}</Text>
                  <Text style={styles.itemSub}>{members} member{members !== 1 ? 's' : ''}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: biz.is_active !== false ? Colors.successLight : Colors.dangerLight }]}>
                  <Text style={[styles.statusText, { color: biz.is_active !== false ? Colors.success : Colors.danger }]}>
                    {biz.is_active !== false ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textLight} style={{ marginLeft: 4 }} />
              </View>
            </Card>
          </TouchableOpacity>
        )
      })}
      {businesses.length === 0 && (
        <EmptyState icon="business-outline" title="No businesses" message="No businesses found" />
      )}
    </View>
  )

  const renderUsers = () => (
    <View>
      {users.map((u) => {
        const uid = u.user_id || u.id
        const isActive = u.is_active !== false
        return (
          <Card key={uid} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemAvatar}>
                <Text style={styles.itemAvatarText}>{(u.name || u.email || '?')[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{u.name || 'Unnamed'}</Text>
                <Text style={styles.itemSub}>{u.email}</Text>
                <Text style={styles.itemSub}>{u.phone}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isActive ? Colors.successLight : Colors.dangerLight }]}>
                <Text style={[styles.statusText, { color: isActive ? Colors.success : Colors.danger }]}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.userActions}>
              {isActive ? (
                <Button
                  title="Deactivate"
                  variant="outline"
                  size="sm"
                  onPress={() => handleUserAction('deactivate', u)}
                />
              ) : (
                <Button
                  title="Activate"
                  variant="success"
                  size="sm"
                  onPress={() => handleUserAction('activate', u)}
                />
              )}
              <Button
                title="Delete"
                variant="danger"
                size="sm"
                onPress={() => handleUserAction('delete', u)}
              />
            </View>
          </Card>
        )
      })}
      {users.length === 0 && (
        <EmptyState icon="people-outline" title="No users" message="No users found" />
      )}
    </View>
  )

  const renderJobs = () => (
    <View>
      {jobs.map((job) => (
        <Card key={job.id || job.name} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemAvatar}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{job.name || job.id}</Text>
              <Text style={styles.itemSub}>Schedule: {job.schedule || 'N/A'}</Text>
            </View>
            <Button
              title="Run"
              variant="outline"
              size="sm"
              onPress={() => handleTriggerJob(job.id || job.name)}
            />
          </View>
        </Card>
      ))}
      {jobs.length === 0 && (
        <EmptyState icon="hourglass-outline" title="No Jobs" message="No scheduled jobs found" />
      )}
    </View>
  )

  if (loading) return <LoadingSpinner fullScreen message="Loading admin panel..." />

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 32 }} />
      </View>

      {error ? <AlertBadge message={error} type="error" /> : null}
      {actionError ? <AlertBadge message={actionError} type="error" /> : null}
      {actionMessage ? <AlertBadge message={actionMessage} type="success" /> : null}

      <View style={styles.tabRow}>
        {(['businesses', 'users', 'jobs'] as AdminTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'businesses' ? 'Businesses' : tab === 'users' ? 'Users' : 'Jobs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'businesses' && renderBusinesses()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'jobs' && renderJobs()}
      </ScrollView>

      <Modal visible={showUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>User Action</Text>
            <Text style={styles.modalMessage}>
              Action: {userAction} for {selectedUser?.name || selectedUser?.email}
            </Text>
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setShowUserModal(false)} style={{ flex: 1 }} />
              <Button title="Confirm" onPress={() => setShowUserModal(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete User</Text>
            <Text style={styles.modalMessage}>Delete {deleteTarget?.name || deleteTarget?.email}?</Text>
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setDeleteTarget(null)} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" onPress={confirmDelete} loading={deleteLoading} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primaryLight },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  tabTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  itemCard: { marginBottom: 12, padding: 14 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  itemAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.xl },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  userActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  modalMessage: { fontSize: 14, color: Colors.textLight, marginBottom: 16, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
})
