import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal,
  TextInput, FlatList, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { customerAPI, debtAPI } from '@/lib/api'
import { extractArray, formatCurrency, parseApiError } from '@/lib/utils'
import { Colors } from '@/lib/constants'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

export default function CustomersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const businessId = Number(id)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tabFilter, setTabFilter] = useState<'all' | 'debt'>('all')

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileCustomer, setProfileCustomer] = useState<any>(null)
  const [profileDebt, setProfileDebt] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const fetchCustomers = useCallback(async () => {
    if (!businessId) return
    try {
      let res
      if (tabFilter === 'debt') {
        res = await customerAPI.listWithDebt(businessId)
      } else {
        res = await customerAPI.list(businessId)
      }
      setCustomers(extractArray(res.data))
    } catch {
      setError('Failed to load customers')
    }
  }, [businessId, tabFilter])

  useEffect(() => { setLoading(true); fetchCustomers().finally(() => setLoading(false)) }, [fetchCustomers])

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchCustomers(); setRefreshing(false) }, [fetchCustomers])

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q)
  })

  const totalDebt = customers.reduce((sum, c) => sum + (Number(c.outstanding_debt || c.total_debt || 0)), 0)

  const openAddModal = () => { setEditingCustomer(null); setForm({ name: '', phone: '', email: '', address: '' }); setShowFormModal(true); setFormError('') }
  const openEditModal = (c: any) => {
    setEditingCustomer(c); setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', address: c.address || '' }); setShowFormModal(true); setFormError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Customer name is required'); return }
    setFormLoading(true); setFormError('')
    try {
      if (editingCustomer) {
        await customerAPI.update(businessId, editingCustomer.customer_id || editingCustomer.id, form)
      } else {
        await customerAPI.create(businessId, form)
      }
      setShowFormModal(false); await fetchCustomers()
    } catch (err: any) { setFormError(parseApiError(err)) } finally { setFormLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await customerAPI.delete(businessId, deleteTarget.customer_id || deleteTarget.id)
      setShowDeleteConfirm(false); setDeleteTarget(null); await fetchCustomers()
    } catch (err: any) { Alert.alert('Error', parseApiError(err)) }
  }

  const openProfile = async (c: any) => {
    setProfileCustomer(c); setShowProfileModal(true); setProfileLoading(true); setProfileDebt(null)
    try {
      const res = await debtAPI.getCustomerDebt(businessId, c.customer_id || c.id)
      setProfileDebt(res.data)
    } catch {} finally { setProfileLoading(false) }
  }

  const renderCustomer = ({ item }: { item: any }) => {
    const debt = Number(item.outstanding_debt || item.total_debt || 0)
    const initial = (item.name || '?')[0]?.toUpperCase() || '?'
    return (
      <TouchableOpacity style={styles.customerCard} onPress={() => openProfile(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          {item.phone ? <Text style={styles.customerPhone}>{item.phone}</Text> : null}
          {item.email ? <Text style={styles.customerEmail} numberOfLines={1}>{item.email}</Text> : null}
        </View>
        {debt > 0 && (
          <View style={styles.debtBadge}>
            <Text style={styles.debtText}>{formatCurrency(debt)}</Text>
          </View>
        )}
        <View style={styles.customerActions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
            <Ionicons name="pencil" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDeleteTarget(item); setShowDeleteConfirm(true) }} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading customers..." />

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tabFilter === 'all' && styles.tabActive]} onPress={() => setTabFilter('all')}>
          <Text style={[styles.tabText, tabFilter === 'all' && styles.tabTextActive]}>All Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tabFilter === 'debt' && styles.tabActive]} onPress={() => setTabFilter('debt')}>
          <Text style={[styles.tabText, tabFilter === 'debt' && styles.tabTextActive]}>With Debt</Text>
        </TouchableOpacity>
      </View>

      {tabFilter === 'debt' && totalDebt > 0 && (
        <View style={styles.debtBanner}>
          <Text style={styles.debtBannerText}>Total Outstanding Debt</Text>
          <Text style={styles.debtBannerAmount}>{formatCurrency(totalDebt)}</Text>
        </View>
      )}

      {error ? <AlertBadge message={error} type="error" /> : null}

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput style={styles.searchInput} placeholder="Search customers..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={Colors.textLight} /></TouchableOpacity> : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.customer_id || item.id)}
        renderItem={renderCustomer}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No customers" message="Add your first customer to get started" />}
      />

      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFormModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={formLoading}>
              <Text style={[styles.modalSave, formLoading && { opacity: 0.5 }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formError ? <AlertBadge message={formError} type="error" /> : null}
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput style={styles.textInput} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Customer name" placeholderTextColor={Colors.textLight} />
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.textInput} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor={Colors.textLight} />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.textInput} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" placeholder="Email address" placeholderTextColor={Colors.textLight} />
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput style={styles.textInput} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholder="Address" placeholderTextColor={Colors.textLight} />
            <View style={{ marginTop: 20, marginBottom: 40 }}>
              <Button title={editingCustomer ? 'Update Customer' : 'Add Customer'} onPress={handleSave} loading={formLoading} disabled={formLoading} size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showProfileModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowProfileModal(false)}><Text style={styles.modalCancel}>Close</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Customer Profile</Text>
          <View style={{ width: 60 }} />
        </View>
        {profileCustomer && (
          <ScrollView style={styles.modalBody}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{(profileCustomer.name || '?')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.profileName}>{profileCustomer.name}</Text>
            </View>
            <Card style={{ marginBottom: 12 }}>
              <Text style={styles.infoLabel}>Contact Information</Text>
              {profileCustomer.phone && <Text style={styles.infoValue}>Phone: {profileCustomer.phone}</Text>}
              {profileCustomer.email && <Text style={styles.infoValue}>Email: {profileCustomer.email}</Text>}
              {profileCustomer.address && <Text style={styles.infoValue}>Address: {profileCustomer.address}</Text>}
            </Card>
            {profileLoading ? <LoadingSpinner message="Loading debt info..." /> : profileDebt && (
              <>
                <Card style={{ marginBottom: 12 }}>
                  <Text style={styles.infoLabel}>Outstanding Debt</Text>
                  <Text style={[styles.infoValue, { color: Colors.danger, fontSize: 20, fontWeight: '700' }]}>
                    {formatCurrency(Number(profileDebt.outstanding_debt || profileDebt.total_debt || 0))}
                  </Text>
                </Card>
                {Array.isArray(profileDebt.transactions) && profileDebt.transactions.length > 0 && (
                  <Card>
                    <Text style={styles.infoLabel}>Debt Transactions</Text>
                    {profileDebt.transactions.map((t: any, i: number) => (
                      <View key={i} style={styles.transactionRow}>
                        <Text style={styles.transactionAmount}>{formatCurrency(t.amount || 0)}</Text>
                        <Text style={styles.transactionDate}>{t.date || t.created_at || ''}</Text>
                      </View>
                    ))}
                  </Card>
                )}
              </>
            )}
          </ScrollView>
        )}
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Delete Customer</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to delete "{deleteTarget?.name}"?</Text>
            <View style={styles.confirmBtns}>
              <Button title="Cancel" variant="outline" onPress={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" onPress={handleDelete} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 10, padding: 8 },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, paddingHorizontal: 16, paddingBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textLight },
  tabTextActive: { color: Colors.primary, fontWeight: '600' },
  debtBanner: { backgroundColor: Colors.dangerLight, padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  debtBannerText: { fontSize: 12, color: Colors.danger, fontWeight: '500' },
  debtBannerAmount: { fontSize: 18, fontWeight: '700', color: Colors.danger, marginTop: 2 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 4 },
  customerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  customerPhone: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  customerEmail: { fontSize: 12, color: Colors.textLight, marginTop: 1, maxWidth: 150 },
  debtBadge: { backgroundColor: Colors.dangerLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  debtText: { fontSize: 11, fontWeight: '700', color: Colors.danger },
  customerActions: { gap: 8 },
  actionBtn: { padding: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { fontSize: 16, color: Colors.primary },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalSave: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  textInput: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 10 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  infoValue: { fontSize: 14, color: Colors.textLight, marginBottom: 4 },
  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  transactionAmount: { fontSize: 14, fontWeight: '600', color: Colors.text },
  transactionDate: { fontSize: 12, color: Colors.textLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmModal: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: Colors.textLight, marginBottom: 20, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
})
