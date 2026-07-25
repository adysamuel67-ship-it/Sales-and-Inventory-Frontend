import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { debtAPI, customerAPI } from '@/lib/api'
import { extractArray, formatCurrency, parseApiError, isAdminRole } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import KpiCard from '@/components/ui/KpiCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

type TabFilter = 'all' | 'overdue' | 'paid'
type SortType = 'highest' | 'lowest' | 'oldest'

export default function DebtsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, currentBusiness } = useAuth()
  const businessId = Number(id) || currentBusiness?.business_id || 0
  const router = useRouter()
  const isAdmin = isAdminRole(user?.business_role) || isAdminRole(user?.role)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [debts, setDebts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tabFilter, setTabFilter] = useState<TabFilter>('all')
  const [sortType, setSortType] = useState<SortType>('oldest')

  const [totalDebt, setTotalDebt] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)

  const [showPayModal, setShowPayModal] = useState(false)
  const [payTarget, setPayTarget] = useState<any>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payFullyPaid, setPayFullyPaid] = useState(true)
  const [payNote, setPayNote] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ customer_id: '', amount: '', due_date: '', note: '', new_customer_name: '', new_customer_phone: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [isNewCustomer, setIsNewCustomer] = useState(false)

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileDebt, setProfileDebt] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [txDetailItem, setTxDetailItem] = useState<any>(null)
  const [actionError, setActionError] = useState('')

  const fetchData = useCallback(async () => {
    if (!businessId) return
    setError('')
    try {
      const [debtsRes, totalRes, custsRes] = await Promise.allSettled([
        debtAPI.listCustomersWithDebt(businessId),
        debtAPI.getTotalDebt(businessId),
        customerAPI.list(businessId),
      ])
      if (debtsRes.status === 'fulfilled') {
        const raw = extractArray(debtsRes.value.data)
        setDebts(raw.map((d: any) => ({
          customer_id: d.debt?.customer_id || d.customer_id,
          name: d.customer_name || d.name || 'Unknown',
          phone: d.customer_phone || d.phone || '',
          email: d.customer_email || d.email || '',
          amount: d.debt?.amount || d.amount || 0,
          debt_id: d.debt?.debt_id || d.debt_id,
          is_paid: d.debt?.is_paid ?? d.is_paid ?? false,
          due_date: d.debt?.due_date || d.due_date,
          status: (d.debt?.is_paid ?? false) ? 'paid' : 'pending',
        })))
      }
      if (totalRes.status === 'fulfilled') {
        const data = totalRes.value.data?.data || totalRes.value.data
        setTotalDebt(Number(data?.total_debt || data?.total || 0))
        setOverdueCount(Number(data?.overdue_count || data?.overdue || 0))
      }
      if (custsRes.status === 'fulfilled') setCustomers(extractArray(custsRes.value.data))
    } catch { setError('Failed to load debts') }
  }, [businessId])

  useEffect(() => { setLoading(true); fetchData().finally(() => setLoading(false)) }, [fetchData])

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }, [fetchData])

  const filtered = debts.filter((d) => {
    const q = search.toLowerCase()
    const nameMatch = (d.name || d.customer_name || '').toLowerCase().includes(q) || (d.phone || d.customer_phone || '').includes(q)
    const status = (d.status || '').toLowerCase()
    const tabMatch = tabFilter === 'all' || (tabFilter === 'overdue' && (status === 'overdue' || status === 'pending')) || (tabFilter === 'paid' && status === 'paid')
    return nameMatch && tabMatch
  }).sort((a, b) => {
    if (sortType === 'highest') return Number(b.amount || b.debt_amount || 0) - Number(a.amount || a.debt_amount || 0)
    if (sortType === 'lowest') return Number(a.amount || a.debt_amount || 0) - Number(b.amount || b.debt_amount || 0)
    if (sortType === 'oldest') return Number(a.customer_id || 0) - Number(b.customer_id || 0)
    return 0
  })

  const handleRecordPayment = async () => {
    if (!payTarget) return
    const amount = parseFloat(payAmount)
    if (!payFullyPaid && (isNaN(amount) || amount <= 0)) { setPayError('Enter a valid amount'); return }
    setPayLoading(true); setPayError('')
    try {
      const payload: any = { fully_paid: payFullyPaid }
      if (!payFullyPaid) payload.amount = amount
      if (payNote.trim()) payload.note = payNote.trim()
      await debtAPI.updateDebt(businessId, payTarget.customer_id || payTarget.id, payload)
      setShowPayModal(false); setPayTarget(null); setPayAmount(''); setPayNote('')
      await fetchData()
    } catch (err: any) { setPayError(parseApiError(err)) } finally { setPayLoading(false) }
  }

  const handleAddDebt = async () => {
    if (isNewCustomer) {
      if (!addForm.new_customer_name.trim()) { setAddError('Customer name is required'); return }
    } else {
      if (!addForm.customer_id) { setAddError('Select a customer'); return }
    }
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) { setAddError('Enter a valid amount'); return }
    if (!addForm.due_date) { setAddError('Due date is required'); return }
    setAddLoading(true); setAddError('')
    try {
      let customerId: number
      if (isNewCustomer) {
        const custRes = await customerAPI.create(businessId, { name: addForm.new_customer_name.trim(), phone: addForm.new_customer_phone.trim() })
        customerId = custRes.data?.customer_id || custRes.data?.id
        if (!customerId) throw new Error('Failed to create customer')
      } else {
        customerId = parseInt(addForm.customer_id)
        if (isNaN(customerId)) throw new Error('Please select a customer')
      }
      const payload: any = {
        amount: parseFloat(addForm.amount),
        due_date: addForm.due_date,
        note: addForm.note.trim() || 'No note provided',
      }
      await debtAPI.addDebt(businessId, customerId, payload)
      setShowAddModal(false); setAddForm({ customer_id: '', amount: '', due_date: '', note: '', new_customer_name: '', new_customer_phone: '' })
      await fetchData()
    } catch (err: any) { setAddError(parseApiError(err)) } finally { setAddLoading(false) }
  }

  const openProfile = async (d: any) => {
    setProfileLoading(true); setShowProfileModal(true); setProfileDebt(null)
    try {
      const [debtRes, txRes] = await Promise.allSettled([
        debtAPI.getCustomerDebt(businessId, d.customer_id || d.id),
        debtAPI.getCustomerTransactions(businessId, d.customer_id || d.id),
      ])
      const result: any = { debt: null, transactions: [] }
      if (debtRes.status === 'fulfilled') {
        const raw = debtRes.value.data
        result.debt = raw?.debt || raw
      }
      if (txRes.status === 'fulfilled') {
        result.transactions = extractArray(txRes.value.data)
      }
      setProfileDebt(result)
    } catch {} finally { setProfileLoading(false) }
  }

  const getStatusColor = (status: string, isPaid?: boolean) => {
    if (isPaid) return Colors.success
    const s = (status || '').toLowerCase()
    if (s === 'paid') return Colors.success
    if (s === 'overdue' || s === 'pending') return Colors.danger
    return Colors.warning
  }

  const renderDebt = ({ item }: { item: any }) => {
    const amount = Number(item.amount || item.debt_amount || 0)
    const status = (item.status || 'pending').toLowerCase()
    const initial = (item.name || item.customer_name || '?')[0]?.toUpperCase() || '?'
    return (
      <Card style={styles.debtCard}>
        <View style={styles.debtHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtName}>{item.name || item.customer_name || 'Unknown'}</Text>
            {item.phone || item.customer_phone ? <Text style={styles.debtPhone}>{item.phone || item.customer_phone}</Text> : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status, item.is_paid) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(status, item.is_paid) }]}>{status}</Text>
          </View>
        </View>
        <View style={styles.debtAmount}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
        </View>
        <View style={styles.debtActions}>
          <TouchableOpacity style={styles.detailBtn} onPress={() => openProfile(item)}>
            <Text style={styles.detailBtnText}>Details</Text>
          </TouchableOpacity>
          {!item.is_paid && status !== 'paid' && (
            <TouchableOpacity style={styles.payBtn} onPress={() => { setPayTarget(item); setPayAmount(''); setPayFullyPaid(true); setPayNote(''); setShowPayModal(true) }}>
              <Text style={styles.payBtnText}>Record Payment</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    )
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading debts..." />

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ width: 32 }} />
        <Text style={styles.headerTitle}>Debts</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => { setIsNewCustomer(false); setAddForm({ customer_id: '', amount: '', due_date: '', note: '', new_customer_name: '', new_customer_phone: '' }); setShowAddModal(true); setAddError('') }}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.kpiRow}>
        <KpiCard title="Outstanding" value={formatCurrency(totalDebt)} icon="wallet" color="danger" />
        <KpiCard title="Overdue" value={String(overdueCount)} icon="alert-circle" color="warning" />
      </View>

      <View style={styles.tabRow}>
        {(['all', 'overdue', 'paid'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tabFilter === t && styles.tabActive]} onPress={() => setTabFilter(t)}>
            <Text style={[styles.tabText, tabFilter === t && styles.tabTextActive]}>{t === 'all' ? 'In Debt' : t === 'overdue' ? 'Overdue' : 'Paid'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRow}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortRow}>
          {(['highest', 'lowest', 'oldest'] as const).map((s) => (
            <TouchableOpacity key={s} style={[styles.sortBtn, sortType === s && styles.sortActive]} onPress={() => setSortType(s)}>
              <Text style={[styles.sortText, sortType === s && styles.sortTextActive]}>{s === 'highest' ? 'Highest' : s === 'lowest' ? 'Lowest' : 'Oldest'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error ? <AlertBadge message={error} type="error" /> : null}
      {actionError ? <AlertBadge message={actionError} type="error" /> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item: any, i: number) => String(item.customer_id || item.id || i)}
        renderItem={renderDebt}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="No debts" message="All customers are paid up" />}
      />

      <Modal visible={showPayModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPayModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {payTarget && (
              <Card style={{ marginBottom: 16 }}>
                <Text style={styles.payCustomer}>{payTarget.name || payTarget.customer_name}</Text>
                <Text style={styles.payDebt}>Owed: {formatCurrency(Number(payTarget.amount || payTarget.debt_amount || 0))}</Text>
              </Card>
            )}
            {payError ? <AlertBadge message={payError} type="error" /> : null}
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setPayFullyPaid(!payFullyPaid)}>
              <Ionicons name={payFullyPaid ? 'checkbox' : 'square-outline'} size={22} color={Colors.primary} />
              <Text style={styles.checkLabel}>Fully Paid</Text>
            </TouchableOpacity>
            {!payFullyPaid && (
              <>
                <Text style={styles.fieldLabel}>Amount</Text>
                <TextInput style={styles.textInput} value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />
              </>
            )}
            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput style={styles.textInput} value={payNote} onChangeText={setPayNote} placeholder="Payment note" placeholderTextColor={Colors.textLight} />
            <View style={{ marginTop: 20 }}>
              <Button title="Record Payment" onPress={handleRecordPayment} loading={payLoading} disabled={payLoading} size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Add Debt</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {addError ? <AlertBadge message={addError} type="error" /> : null}
            <View style={styles.tabRowInner}>
              <TouchableOpacity style={[styles.tabBtnInner, !isNewCustomer && styles.tabActiveInner]} onPress={() => setIsNewCustomer(false)}>
                <Text style={[styles.tabTextInner, !isNewCustomer && styles.tabTextActiveInner]}>Existing Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabBtnInner, isNewCustomer && styles.tabActiveInner]} onPress={() => setIsNewCustomer(true)}>
                <Text style={[styles.tabTextInner, isNewCustomer && styles.tabTextActiveInner]}>New Customer</Text>
              </TouchableOpacity>
            </View>
            {isNewCustomer ? (
              <>
                <Text style={styles.fieldLabel}>Customer Name *</Text>
                <TextInput style={styles.textInput} value={addForm.new_customer_name} onChangeText={(v: string) => setAddForm({ ...addForm, new_customer_name: v })} placeholder="Customer name" placeholderTextColor={Colors.textLight} />
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput style={styles.textInput} value={addForm.new_customer_phone} onChangeText={(v: string) => setAddForm({ ...addForm, new_customer_phone: v })} keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor={Colors.textLight} />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Select Customer *</Text>
                <ScrollView style={{ maxHeight: 200, backgroundColor: Colors.surfaceAlt, borderRadius: 10, marginBottom: 12 }}>
                  {customers.map((c) => (
                    <TouchableOpacity key={c.customer_id || c.id} style={[styles.customerOption, addForm.customer_id === String(c.customer_id || c.id) && styles.customerOptionActive]} onPress={() => setAddForm({ ...addForm, customer_id: String(c.customer_id || c.id) })}>
                      <Text style={styles.customerOptionText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <Text style={styles.fieldLabel}>Amount *</Text>
            <TextInput style={styles.textInput} value={addForm.amount} onChangeText={(v: string) => setAddForm({ ...addForm, amount: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />
            <Text style={styles.fieldLabel}>Due Date</Text>
            <TextInput style={styles.textInput} value={addForm.due_date} onChangeText={(v: string) => setAddForm({ ...addForm, due_date: v })} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textLight} />
            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput style={styles.textInput} value={addForm.note} onChangeText={(v: string) => setAddForm({ ...addForm, note: v })} placeholder="Note" placeholderTextColor={Colors.textLight} />
            <View style={{ marginTop: 20, marginBottom: 40 }}>
              <Button title="Add Debt" onPress={handleAddDebt} loading={addLoading} disabled={addLoading} size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showProfileModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowProfileModal(false)}><Text style={styles.modalCancel}>Close</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Debt History</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={styles.modalBody}>
          {profileLoading ? <LoadingSpinner message="Loading..." /> : profileDebt && (
            <>
              {profileDebt.debt && (
                <Card style={{ marginBottom: 12 }}>
                  <Text style={styles.infoLabel}>Debt Details</Text>
                  <View style={styles.debtDetailRow}>
                    <Text style={styles.debtDetailLabel}>Amount</Text>
                    <Text style={[styles.debtDetailValue, { color: Colors.danger, fontSize: 22, fontWeight: '700' }]}>
                      {formatCurrency(Number(profileDebt.debt.amount || 0))}
                    </Text>
                  </View>
                  {profileDebt.debt.due_date && (
                    <View style={styles.debtDetailRow}>
                      <Text style={styles.debtDetailLabel}>Due Date</Text>
                      <Text style={styles.debtDetailValue}>{new Date(profileDebt.debt.due_date).toLocaleDateString()}</Text>
                    </View>
                  )}
                  <View style={[styles.debtDetailRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.debtDetailLabel}>Status</Text>
                    <View style={[styles.debtStatusBadge, { backgroundColor: profileDebt.debt.is_paid ? Colors.successLight : Colors.dangerLight }]}>
                      <Text style={[styles.debtStatusText, { color: profileDebt.debt.is_paid ? Colors.success : Colors.danger }]}>
                        {profileDebt.debt.is_paid ? 'Paid' : 'Unpaid'}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}

              <Card>
                <Text style={styles.infoLabel}>Transaction History ({profileDebt.transactions?.length || 0})</Text>
                {profileDebt.transactions && profileDebt.transactions.length > 0 ? (
                  profileDebt.transactions.map((t: any, i: number) => {
                    const tx = t.transactions || t
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.txRow, i < profileDebt.transactions.length - 1 && styles.txBorder]}
                        onPress={() => setTxDetailItem(tx)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txAmount}>{formatCurrency(tx.amount_paid || 0)}</Text>
                          {tx.note && <Text style={styles.txNote}>{tx.note}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.txDate}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}</Text>
                          <Text style={styles.txTime}>{tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : ''}</Text>
                        </View>
                      </TouchableOpacity>
                    )
                  })
                ) : (
                  <Text style={[styles.infoValue, { textAlign: 'center', paddingVertical: 16 }]}>No transactions recorded</Text>
                )}
              </Card>
            </>
          )}
        </ScrollView>
      </Modal>

      <Modal visible={!!txDetailItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Transaction Details</Text>
            {txDetailItem && (
              <>
                <View style={styles.debtDetailRow}>
                  <Text style={styles.debtDetailLabel}>Amount Paid</Text>
                  <Text style={[styles.debtDetailValue, { color: Colors.success, fontWeight: '700' }]}>{formatCurrency(txDetailItem.amount_paid || 0)}</Text>
                </View>
                <View style={styles.debtDetailRow}>
                  <Text style={styles.debtDetailLabel}>Note</Text>
                  <Text style={styles.debtDetailValue}>{txDetailItem.note || 'N/A'}</Text>
                </View>
                <View style={[styles.debtDetailRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.debtDetailLabel}>Date</Text>
                  <Text style={styles.debtDetailValue}>{txDetailItem.created_at ? new Date(txDetailItem.created_at).toLocaleString() : 'N/A'}</Text>
                </View>
              </>
            )}
            <View style={{ marginTop: 16 }}>
              <Button title="Close" variant="outline" onPress={() => setTxDetailItem(null)} />
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
  addBtn: { backgroundColor: Colors.primary, borderRadius: BORDER_RADIUS.lg, padding: 8 },
  kpiRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 12, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  tabTextActive: { color: '#FFF' },
  filterRow: { paddingHorizontal: 16, paddingTop: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 4 },
  sortRow: { marginTop: 8, maxHeight: 36 },
  sortBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  sortActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortText: { fontSize: 12, fontWeight: '600', color: Colors.textLight },
  sortTextActive: { color: '#FFF' },
  debtCard: { marginBottom: 12, padding: 14 },
  debtHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  debtName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  debtPhone: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  debtAmount: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 1, borderBottomColor: Colors.border },
  amountLabel: { fontSize: 13, color: Colors.textLight },
  amountValue: { fontSize: 18, fontWeight: '700', color: Colors.danger },
  debtActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  detailBtn: { flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  detailBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  payBtn: { flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.lg, backgroundColor: Colors.primary, alignItems: 'center' },
  payBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { fontSize: 16, color: Colors.primary },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  textInput: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  checkLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  payCustomer: { fontSize: 16, fontWeight: '600', color: Colors.text },
  payDebt: { fontSize: 14, color: Colors.danger, marginTop: 4 },
  tabRowInner: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginTop: 8 },
  tabBtnInner: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActiveInner: { backgroundColor: Colors.primary },
  tabTextInner: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  tabTextActiveInner: { color: '#FFF' },
  customerOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  customerOptionActive: { backgroundColor: Colors.primaryLight },
  customerOptionText: { fontSize: 14, color: Colors.text },
  infoLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  infoValue: { fontSize: 14, color: Colors.textLight },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  txAmount: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1 },
  txStatus: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize', flex: 1, textAlign: 'center' },
  txDate: { fontSize: 12, color: Colors.textLight, flex: 1, textAlign: 'right' },
  debtDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  debtDetailLabel: { fontSize: 14, color: Colors.textLight },
  debtDetailValue: { fontSize: 14, fontWeight: '500', color: Colors.text },
  debtStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999 },
  debtStatusText: { fontSize: 12, fontWeight: '700' },
  txBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  txNote: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  txTime: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
})
