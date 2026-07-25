import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { customerAPI, debtAPI, saleAPI } from '@/lib/api'
import { extractArray, formatCurrency, parseApiError, formatPayment, mapSale } from '@/lib/utils'
import { Colors, BORDER_RADIUS, FONT_SIZE, SPACING } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

const { width } = Dimensions.get('window')

const AVATAR_COLORS = [
  { bg: '#EFF4FF', text: '#2563EB' },
  { bg: '#DCFCE7', text: '#16A34A' },
  { bg: '#F5F3FF', text: '#7C3AED' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#FEE2E2', text: '#DC2626' },
  { bg: '#ECFDF5', text: '#059669' },
  { bg: '#F1F5F9', text: '#475569' },
  { bg: '#FDF2F8', text: '#DB2777' },
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function CustomersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { currentBusiness } = useAuth()
  const businessId = Number(id) || currentBusiness?.business_id || 0
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
  const [actionError, setActionError] = useState('')

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileCustomer, setProfileCustomer] = useState<any>(null)
  const [profileDebt, setProfileDebt] = useState<any>(null)
  const [profileSales, setProfileSales] = useState<any[]>([])
  const [profileLoading, setProfileLoading] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [showSaleDetail, setShowSaleDetail] = useState(false)

  const fetchCustomers = useCallback(async () => {
    if (!businessId) return
    try {
      let res
      if (tabFilter === 'debt') {
        res = await customerAPI.listWithDebt(businessId)
        const raw = extractArray(res.data)
        setCustomers(raw.map((d: any) => ({
          customer_id: d.debt?.customer_id || d.customer_id,
          name: d.customer_name || d.name || 'Unknown',
          phone: d.customer_phone || d.phone || '',
          email: d.customer_email || d.email || '',
          outstanding_debt: d.debt?.amount || d.amount || 0,
          is_paid: d.debt?.is_paid ?? d.is_paid ?? false,
          debt_id: d.debt?.debt_id || d.debt_id,
          due_date: d.debt?.due_date || d.due_date,
        })))
      } else {
        res = await customerAPI.list(businessId)
        setCustomers(extractArray(res.data))
      }
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
  const totalCustomers = customers.length

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
    } catch (err: any) { setActionError(parseApiError(err)); setTimeout(() => setActionError(''), 4000) }
  }

  const openProfile = async (c: any) => {
    setProfileCustomer(c)
    setShowProfileModal(true)
    setProfileLoading(true)
    setProfileDebt(null)
    setProfileSales([])
    try {
      const [debtRes, txRes, salesRes] = await Promise.allSettled([
        debtAPI.getCustomerDebt(businessId, c.customer_id || c.id),
        debtAPI.getCustomerTransactions(businessId, c.customer_id || c.id),
        saleAPI.list(businessId, { skip: 0, limit: 100 }),
      ])
      const debtData: any = { debt: null, transactions: [] }
      if (debtRes.status === 'fulfilled') {
        debtData.debt = debtRes.value.data?.debt || debtRes.value.data
      }
      if (txRes.status === 'fulfilled') {
        debtData.transactions = extractArray(txRes.value.data)
      }
      setProfileDebt(debtData)

      if (salesRes.status === 'fulfilled') {
        const allSales = extractArray(salesRes.value.data)
        const custId = c.customer_id || c.id
        const custSales = allSales.filter((s: any) => (s.customer_id === custId || s.customer?.customer_id === custId))
        const productRes = await productAPI.list(businessId, { limit: 500 }).catch(() => ({ data: [] }))
        const productMap = new Map<number, string>()
        const prods = extractArray(productRes.data)
        prods.forEach((p: any) => {
          const pid = p.product_id ?? p.id
          if (pid != null) productMap.set(pid, p.name || p.product_name || `Product #${pid}`)
        })
        setProfileSales(custSales.slice(0, 10).map((s: any) => mapSale(s, productMap)))
      }
    } catch {} finally { setProfileLoading(false) }
  }

  const formatTxDate = (dateStr?: string) => {
    if (!dateStr) return { date: '', time: '', relative: '' }
    try {
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)
      let relative = ''
      if (diffMins < 1) relative = 'Just now'
      else if (diffMins < 60) relative = `${diffMins}m ago`
      else if (diffHours < 24) relative = `${diffHours}h ago`
      else if (diffDays < 7) relative = `${diffDays}d ago`
      else relative = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        relative,
      }
    } catch { return { date: dateStr, time: '', relative: '' } }
  }

  const renderCustomer = ({ item, index }: { item: any; index: number }) => {
    const debt = Number(item.outstanding_debt || item.total_debt || 0)
    const initial = (item.name || '?')[0]?.toUpperCase() || '?'
    const colorSet = getAvatarColor(item.name || '')
    const isActive = item.is_active !== false
    return (
      <TouchableOpacity style={styles.customerCard} onPress={() => openProfile(item)} activeOpacity={0.7}>
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <View style={[styles.avatar, { backgroundColor: colorSet.bg }]}>
              <Text style={[styles.avatarText, { color: colorSet.text }]}>{initial}</Text>
            </View>
            <View style={styles.customerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.customerName} numberOfLines={1}>{item.name}</Text>
                {!isActive && <View style={styles.inactiveDot} />}
              </View>
              {item.phone ? (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={11} color={Colors.textLight} />
                  <Text style={styles.customerPhone}>{item.phone}</Text>
                </View>
              ) : null}
              {item.email ? (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={11} color={Colors.textLight} />
                  <Text style={styles.customerEmail} numberOfLines={1}>{item.email}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.cardRight}>
            {debt > 0 ? (
              <View style={styles.debtBadge}>
                <Text style={styles.debtBadgeText}>{formatCurrency(debt)}</Text>
              </View>
            ) : (
              <View style={styles.clearBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.clearBadgeText}>Clear</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} style={{ marginTop: 4 }} />
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading customers..." />

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.statsBadge}>
          <Text style={styles.statsBadgeText}>{totalCustomers} customer{totalCustomers !== 1 ? 's' : ''}</Text>
        </View>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="person-add" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {([
          { key: 'all' as const, label: 'All Customers', icon: 'people' as const },
          { key: 'debt' as const, label: 'With Debt', icon: 'alert-circle' as const },
        ]).map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tabFilter === t.key && styles.tabActive]} onPress={() => setTabFilter(t.key)}>
            <Ionicons name={t.icon} size={14} color={tabFilter === t.key ? '#FFF' : Colors.textLight} />
            <Text style={[styles.tabText, tabFilter === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tabFilter === 'debt' && totalDebt > 0 && (
        <View style={styles.debtBanner}>
          <View style={styles.debtBannerLeft}>
            <Ionicons name="wallet" size={20} color={Colors.danger} />
            <View>
              <Text style={styles.debtBannerLabel}>Total Outstanding</Text>
              <Text style={styles.debtBannerAmount}>{formatCurrency(totalDebt)}</Text>
            </View>
          </View>
        </View>
      )}

      {error ? <AlertBadge message={error} type="error" /> : null}
      {actionError ? <AlertBadge message={actionError} type="error" /> : null}

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput style={styles.searchInput} placeholder="Search by name, phone, or email..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={Colors.textLight} /></TouchableOpacity> : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.customer_id || item.id)}
        renderItem={renderCustomer}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No customers yet</Text>
            <Text style={styles.emptyMsg}>Add your first customer to start tracking</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAddModal}>
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.emptyBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ADD/EDIT MODAL */}
      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFormModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{editingCustomer ? 'Edit Customer' : 'New Customer'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={formLoading}>
              <Text style={[styles.modalSave, formLoading && { opacity: 0.5 }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formError ? <AlertBadge message={formError} type="error" /> : null}

            <View style={styles.formAvatarSection}>
              <View style={[styles.formAvatar, { backgroundColor: getAvatarColor(form.name || '?').bg }]}>
                <Text style={[styles.formAvatarText, { color: getAvatarColor(form.name || '?').text }]}>
                  {(form.name || '?')[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.formAvatarLabel}>{form.name || 'Customer Name'}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldIcon}><Ionicons name="person-outline" size={18} color={Colors.primary} /></View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput style={styles.fieldInput} value={form.name} onChangeText={(v: string) => setForm({ ...form, name: v })} placeholder="Enter customer name" placeholderTextColor={Colors.textLight} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldIcon}><Ionicons name="call-outline" size={18} color={Colors.success} /></View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput style={styles.fieldInput} value={form.phone} onChangeText={(v: string) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholder="0XX XXX XXXX" placeholderTextColor={Colors.textLight} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldIcon}><Ionicons name="mail-outline" size={18} color={Colors.warning} /></View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput style={styles.fieldInput} value={form.email} onChangeText={(v: string) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" placeholder="email@example.com" placeholderTextColor={Colors.textLight} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldIcon}><Ionicons name="location-outline" size={18} color={Colors.purple} /></View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Address</Text>
                <TextInput style={styles.fieldInput} value={form.address} onChangeText={(v: string) => setForm({ ...form, address: v })} placeholder="Physical address" placeholderTextColor={Colors.textLight} />
              </View>
            </View>

            <View style={{ marginTop: 24, marginBottom: 40 }}>
              <Button title={editingCustomer ? 'Update Customer' : 'Add Customer'} onPress={handleSave} loading={formLoading} disabled={formLoading} size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* PROFILE MODAL */}
      <Modal visible={showProfileModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowProfileModal(false)}><Text style={styles.modalCancel}>Close</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Customer Profile</Text>
          <TouchableOpacity onPress={() => { setShowProfileModal(false); openEditModal(profileCustomer) }}>
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        {profileCustomer && (
          <ScrollView style={styles.modalBody}>
            {/* Profile Hero */}
            <View style={styles.profileHero}>
              <View style={[styles.profileAvatar, { backgroundColor: getAvatarColor(profileCustomer.name || '').bg }]}>
                <Text style={[styles.profileAvatarText, { color: getAvatarColor(profileCustomer.name || '').text }]}>
                  {(profileCustomer.name || '?')[0]?.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>{profileCustomer.name}</Text>
              {profileCustomer.phone ? (
                <Text style={styles.profilePhone}>{profileCustomer.phone}</Text>
              ) : null}
            </View>

            {/* Contact Info */}
            <View style={styles.profileSection}>
              <Text style={styles.profileSectionTitle}>Contact Details</Text>
              <View style={styles.contactCard}>
                {profileCustomer.phone && (
                  <View style={styles.contactRow}>
                    <View style={[styles.contactIcon, { backgroundColor: Colors.successLight }]}>
                      <Ionicons name="call" size={16} color={Colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactLabel}>Phone</Text>
                      <Text style={styles.contactValue}>{profileCustomer.phone}</Text>
                    </View>
                  </View>
                )}
                {profileCustomer.email && (
                  <View style={styles.contactRow}>
                    <View style={[styles.contactIcon, { backgroundColor: Colors.warningLight }]}>
                      <Ionicons name="mail" size={16} color={Colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue}>{profileCustomer.email}</Text>
                    </View>
                  </View>
                )}
                {profileCustomer.address && (
                  <View style={styles.contactRow}>
                    <View style={[styles.contactIcon, { backgroundColor: Colors.purpleLight }]}>
                      <Ionicons name="location" size={16} color={Colors.purple} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactLabel}>Address</Text>
                      <Text style={styles.contactValue}>{profileCustomer.address}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Debt Info */}
            {profileLoading ? (
              <LoadingSpinner message="Loading debt info..." />
            ) : profileDebt && profileDebt.debt ? (
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Outstanding Debt</Text>
                <View style={styles.debtCard}>
                  <View style={styles.debtCardHeader}>
                    <View style={styles.debtCardIcon}>
                      <Ionicons name="wallet" size={22} color={Colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.debtCardLabel}>Amount Owed</Text>
                      <Text style={styles.debtCardAmount}>{formatCurrency(Number(profileDebt.debt.amount || 0))}</Text>
                    </View>
                    <View style={[styles.debtStatusBadge, { backgroundColor: profileDebt.debt.is_paid ? Colors.successLight : Colors.dangerLight }]}>
                      <Ionicons name={profileDebt.debt.is_paid ? 'checkmark-circle' : 'alert-circle'} size={14} color={profileDebt.debt.is_paid ? Colors.success : Colors.danger} />
                      <Text style={[styles.debtStatusText, { color: profileDebt.debt.is_paid ? Colors.success : Colors.danger }]}>
                        {profileDebt.debt.is_paid ? 'Paid' : 'Unpaid'}
                      </Text>
                    </View>
                  </View>
                  {profileDebt.debt.due_date && (
                    <View style={styles.debtCardRow}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
                      <Text style={styles.debtCardMeta}>Due: {new Date(profileDebt.debt.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {/* Transaction History */}
            {profileDebt && profileDebt.transactions && profileDebt.transactions.length > 0 && (
              <View style={styles.profileSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.profileSectionTitle}>Payment History</Text>
                  <View style={styles.txCountBadge}>
                    <Text style={styles.txCountText}>{profileDebt.transactions.length} payment{profileDebt.transactions.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                {profileDebt.transactions.map((t: any, i: number) => {
                  const tx = t.transactions || t
                  const txDate = formatTxDate(tx.created_at)
                  const isLast = i === profileDebt.transactions.length - 1
                  return (
                    <View key={i} style={[styles.txItem, !isLast && styles.txItemBorder]}>
                      <View style={[styles.txIconWrap, { backgroundColor: Colors.successLight }]}>
                        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                      </View>
                      <View style={styles.txContent}>
                        <View style={styles.txTopRow}>
                          <Text style={styles.txAmount}>{formatCurrency(tx.amount_paid || 0)}</Text>
                          <Text style={styles.txRelative}>{txDate.relative}</Text>
                        </View>
                        {tx.note && <Text style={styles.txNote} numberOfLines={2}>{tx.note}</Text>}
                        <View style={styles.txMetaRow}>
                          <Text style={styles.txDate}>{txDate.date} at {txDate.time}</Text>
                          {tx.debt_id && <Text style={styles.txId}>#{tx.transaction_id || tx.debt_id}</Text>}
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Purchase History */}
            {profileSales.length > 0 && (
              <View style={styles.profileSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.profileSectionTitle}>Recent Purchases</Text>
                  <View style={styles.txCountBadge}>
                    <Text style={styles.txCountText}>{profileSales.length} sale{profileSales.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                {profileSales.map((sale: any, i: number) => {
                  const isLast = i === profileSales.length - 1
                  const rawSale = sale.raw || {}
                  return (
                    <TouchableOpacity key={sale.id || i} style={[styles.txItem, !isLast && styles.txItemBorder]} onPress={() => { setSelectedSale(sale); setShowSaleDetail(true) }} activeOpacity={0.7}>
                      <View style={[styles.txIconWrap, { backgroundColor: sale.payment === 'cash' ? Colors.successLight : sale.payment === 'mobile_money' ? Colors.primaryLight : Colors.warningLight }]}>
                        <Ionicons name={sale.payment === 'cash' ? 'cash' : sale.payment === 'mobile_money' ? 'phone-portrait' : 'card'} size={18} color={sale.payment === 'cash' ? Colors.success : sale.payment === 'mobile_money' ? Colors.primary : Colors.warning} />
                      </View>
                      <View style={styles.txContent}>
                        <View style={styles.txTopRow}>
                          <Text style={styles.txAmount}>{formatCurrency(sale.amount || 0)}</Text>
                          <Text style={styles.txRelative}>{sale.time?.split(',')[0] || ''}</Text>
                        </View>
                        <Text style={styles.txNote} numberOfLines={1}>{sale.product}</Text>
                        <View style={styles.txMetaRow}>
                          <Text style={styles.txDate}>{formatPayment(sale.payment)} · {sale.qty} items</Text>
                          <Ionicons name="chevron-forward" size={14} color={Colors.textLight} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            {/* No debt or transactions */}
            {(!profileDebt || (!profileDebt.debt && (!profileDebt.transactions || profileDebt.transactions.length === 0))) && !profileLoading && (
              <View style={styles.emptyProfile}>
                <Ionicons name="document-text-outline" size={32} color={Colors.border} />
                <Text style={styles.emptyProfileText}>No financial records yet</Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </Modal>

      {/* SALE DETAIL MODAL */}
      <Modal visible={showSaleDetail} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowSaleDetail(false)}><Text style={styles.modalCancel}>Close</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Sale Details</Text>
          <View style={{ width: 50 }} />
        </View>
        {selectedSale && (
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Status & Amount Hero */}
            <View style={styles.saleHero}>
              <View style={[styles.saleHeroBadge, { backgroundColor: (selectedSale.payment_status === 'fully_paid' || selectedSale.payment === 'borrowed' ? Colors.success : Colors.warning) + '15' }]}>
                <Ionicons name={selectedSale.payment_status === 'fully_paid' || !selectedSale.raw?.debt ? 'checkmark-circle' : 'time'} size={16} color={selectedSale.payment_status === 'fully_paid' || !selectedSale.raw?.debt ? Colors.success : Colors.warning} />
                <Text style={[styles.saleHeroBadgeText, { color: selectedSale.payment_status === 'fully_paid' || !selectedSale.raw?.debt ? Colors.success : Colors.warning }]}>
                  {selectedSale.payment_status === 'fully_paid' || !selectedSale.raw?.debt ? 'Fully Paid' : 'Partial / Borrowed'}
                </Text>
              </View>
              <Text style={styles.saleHeroAmount}>{formatCurrency(selectedSale.amount || 0)}</Text>
              {selectedSale.amount_paid != null && selectedSale.amount_paid !== selectedSale.amount && (
                <Text style={styles.saleHeroSub}>Paid: {formatCurrency(selectedSale.amount_paid)} · Balance: {formatCurrency((selectedSale.amount || 0) - (selectedSale.amount_paid || 0))}</Text>
              )}
              {selectedSale.time && (
                <Text style={styles.saleHeroDate}>{selectedSale.time}</Text>
              )}
            </View>

            {/* Items */}
            {selectedSale.raw?.sales_items && selectedSale.raw.sales_items.length > 0 && (
              <View style={styles.saleSection}>
                <Text style={styles.saleSectionTitle}>Items Purchased ({selectedSale.raw.sales_items.length})</Text>
                <View style={styles.saleItemsCard}>
                  {selectedSale.raw.sales_items.map((item: any, i: number) => (
                    <View key={i} style={[styles.saleItemRow, i < selectedSale.raw.sales_items.length - 1 && styles.saleItemBorder]}>
                      <View style={styles.saleItemLeft}>
                        <Text style={styles.saleItemName}>{item.product_name || `Product #${item.product_id}`}</Text>
                        <Text style={styles.saleItemQty}>{item.quantity} × {formatCurrency(item.unit_price || 0)}</Text>
                      </View>
                      <View style={styles.saleItemRight}>
                        <Text style={styles.saleItemTotal}>{formatCurrency(item.subtotal || item.quantity * (item.unit_price || 0))}</Text>
                        {item.profit != null && item.profit > 0 && (
                          <Text style={styles.saleItemProfit}>+{formatCurrency(item.profit)} profit</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Payment Info */}
            <View style={styles.saleSection}>
              <Text style={styles.saleSectionTitle}>Payment Information</Text>
              <View style={styles.saleInfoCard}>
                <View style={styles.saleInfoRow}>
                  <View style={[styles.saleInfoIcon, { backgroundColor: Colors.primaryLight }]}>
                    <Ionicons name="wallet" size={16} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saleInfoLabel}>Payment Method</Text>
                    <Text style={styles.saleInfoValue}>{formatPayment(selectedSale.payment)}</Text>
                  </View>
                </View>
                <View style={styles.saleInfoRow}>
                  <View style={[styles.saleInfoIcon, { backgroundColor: Colors.successLight }]}>
                    <Ionicons name="cash" size={16} color={Colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saleInfoLabel}>Amount Paid</Text>
                    <Text style={styles.saleInfoValue}>{formatCurrency(selectedSale.amount_paid || selectedSale.amount || 0)}</Text>
                  </View>
                </View>
                {selectedSale.raw?.notes && (
                  <View style={styles.saleInfoRow}>
                    <View style={[styles.saleInfoIcon, { backgroundColor: Colors.warningLight }]}>
                      <Ionicons name="document-text" size={16} color={Colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.saleInfoLabel}>Notes</Text>
                      <Text style={styles.saleInfoValue}>{selectedSale.raw.notes}</Text>
                    </View>
                  </View>
                )}
                {selectedSale.raw?.user_id && (
                  <View style={styles.saleInfoRow}>
                    <View style={[styles.saleInfoIcon, { backgroundColor: Colors.purpleLight }]}>
                      <Ionicons name="person" size={16} color={Colors.purple} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.saleInfoLabel}>Sold By</Text>
                      <Text style={styles.saleInfoValue}>User #{selectedSale.raw.user_id}</Text>
                    </View>
                  </View>
                )}
                {selectedSale.raw?.sale_id && (
                  <View style={[styles.saleInfoRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.saleInfoIcon, { backgroundColor: Colors.surfaceAlt }]}>
                      <Ionicons name="finger-print" size={16} color={Colors.neutral} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.saleInfoLabel}>Sale ID</Text>
                      <Text style={[styles.saleInfoValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>#{selectedSale.raw.sale_id}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Debt Info if exists */}
            {selectedSale.raw?.debt && (
              <View style={styles.saleSection}>
                <Text style={styles.saleSectionTitle}>Debt Information</Text>
                <View style={styles.saleDebtCard}>
                  <View style={styles.saleDebtRow}>
                    <Text style={styles.saleDebtLabel}>Amount Owed</Text>
                    <Text style={styles.saleDebtAmount}>{formatCurrency(selectedSale.raw.debt.amount || 0)}</Text>
                  </View>
                  {selectedSale.raw.debt.due_date && (
                    <View style={styles.saleDebtRow}>
                      <Text style={styles.saleDebtLabel}>Due Date</Text>
                      <Text style={styles.saleDebtMeta}>{new Date(selectedSale.raw.debt.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                  )}
                  <View style={styles.saleDebtRow}>
                    <Text style={styles.saleDebtLabel}>Status</Text>
                    <View style={[styles.saleDebtBadge, { backgroundColor: selectedSale.raw.debt.is_paid ? Colors.successLight : Colors.dangerLight }]}>
                      <Text style={[styles.saleDebtBadgeText, { color: selectedSale.raw.debt.is_paid ? Colors.success : Colors.danger }]}>
                        {selectedSale.raw.debt.is_paid ? 'Paid' : 'Unpaid'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Ionicons name="trash" size={24} color={Colors.danger} />
            </View>
            <Text style={styles.confirmTitle}>Delete Customer</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.</Text>
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

import { productAPI } from '@/lib/api'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface },
  statsBadge: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  statsBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.textLight },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, borderRadius: BORDER_RADIUS.lg, padding: 10, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.textLight },
  tabTextActive: { color: '#FFF' },

  debtBanner: { marginHorizontal: 16, marginTop: 8, backgroundColor: Colors.dangerLight, borderRadius: BORDER_RADIUS.xl, padding: 16, borderWidth: 1, borderColor: '#FECACA' },
  debtBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  debtBannerLabel: { fontSize: 12, color: Colors.danger, fontWeight: '500' },
  debtBannerAmount: { fontSize: 20, fontWeight: '800', color: Colors.danger, marginTop: 2 },

  searchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 2 },

  customerCard: { backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  customerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  inactiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textLight },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  customerPhone: { fontSize: 12, color: Colors.textLight },
  customerEmail: { fontSize: 12, color: Colors.textLight, maxWidth: 140 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  debtBadge: { backgroundColor: Colors.dangerLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
  debtBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.danger },
  clearBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
  clearBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.success },

  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptyMsg: { fontSize: 14, color: Colors.textLight, marginBottom: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: BORDER_RADIUS.full },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Modals
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { fontSize: 16, color: Colors.primary },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalSave: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  modalBody: { flex: 1, padding: 20 },

  // Form
  formAvatarSection: { alignItems: 'center', marginBottom: 24 },
  formAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  formAvatarText: { fontSize: 28, fontWeight: '700' },
  formAvatarLabel: { fontSize: 14, color: Colors.textLight, fontWeight: '500' },

  fieldGroup: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  fieldIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text },

  // Profile
  profileHero: { alignItems: 'center', paddingVertical: 20 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { fontSize: 32, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '800', color: Colors.text },
  profilePhone: { fontSize: 15, color: Colors.textLight, marginTop: 4 },

  profileSection: { marginBottom: 20 },
  profileSectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  contactCard: { backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  contactIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '500' },
  contactValue: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 1 },

  debtCard: { backgroundColor: '#FFFBFB', borderRadius: BORDER_RADIUS.xl, padding: 16, borderWidth: 1, borderColor: '#FECACA' },
  debtCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  debtCardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  debtCardLabel: { fontSize: 12, color: Colors.textLight },
  debtCardAmount: { fontSize: 22, fontWeight: '800', color: Colors.danger, marginTop: 2 },
  debtStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
  debtStatusText: { fontSize: 12, fontWeight: '700' },
  debtCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FECACA' },
  debtCardMeta: { fontSize: 13, color: Colors.textLight },

  txCountBadge: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  txCountText: { fontSize: 11, fontWeight: '600', color: Colors.textLight },

  txItem: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  txItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  txIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  txContent: { flex: 1 },
  txTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txAmount: { fontSize: 15, fontWeight: '700', color: Colors.text },
  txRelative: { fontSize: 12, fontWeight: '600', color: Colors.textLight },
  txNote: { fontSize: 13, color: Colors.textLight, marginTop: 3 },
  txMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  txDate: { fontSize: 11, color: Colors.textLight },
  txId: { fontSize: 11, color: Colors.textLight, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  txStatusDot: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  txStatusText: { fontSize: 10, fontWeight: '700' },

  emptyProfile: { alignItems: 'center', paddingVertical: 32 },
  emptyProfileText: { fontSize: 14, color: Colors.textLight, marginTop: 8 },

  // Confirm modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmModal: { backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' },
  confirmIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: Colors.textLight, marginBottom: 20, lineHeight: 20, textAlign: 'center' },
  confirmBtns: { flexDirection: 'row', gap: 12, width: '100%' },

  // Sale Detail
  saleHero: { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  saleHeroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, marginBottom: 12 },
  saleHeroBadgeText: { fontSize: 13, fontWeight: '700' },
  saleHeroAmount: { fontSize: 32, fontWeight: '800', color: Colors.text },
  saleHeroSub: { fontSize: 14, color: Colors.textLight, marginTop: 4 },
  saleHeroDate: { fontSize: 13, color: Colors.textLight, marginTop: 8 },

  saleSection: { marginBottom: 20 },
  saleSectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },

  saleItemsCard: { backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  saleItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  saleItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  saleItemLeft: { flex: 1 },
  saleItemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  saleItemQty: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  saleItemRight: { alignItems: 'flex-end' },
  saleItemTotal: { fontSize: 14, fontWeight: '700', color: Colors.text },
  saleItemProfit: { fontSize: 11, fontWeight: '600', color: Colors.success, marginTop: 2 },

  saleInfoCard: { backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  saleInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  saleInfoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saleInfoLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '500' },
  saleInfoValue: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 1 },

  saleDebtCard: { backgroundColor: '#FFFBFB', borderRadius: BORDER_RADIUS.xl, padding: 16, borderWidth: 1, borderColor: '#FECACA' },
  saleDebtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  saleDebtLabel: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  saleDebtAmount: { fontSize: 16, fontWeight: '700', color: Colors.danger },
  saleDebtMeta: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  saleDebtBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  saleDebtBadgeText: { fontSize: 12, fontWeight: '700' },
})
