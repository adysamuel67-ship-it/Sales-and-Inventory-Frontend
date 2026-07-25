import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal,
  TextInput, FlatList, Alert, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { saleAPI, productAPI, customerAPI } from '@/lib/api'
import { extractArray, mapSale, formatCurrency, formatPayment, parseApiError } from '@/lib/utils'
import { Colors } from '@/lib/constants'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

const { width } = Dimensions.get('window')

const DATE_FILTERS = [
  { label: 'All', days: 0 },
  { label: 'Today', days: 1 },
  { label: '3d', days: 3 },
  { label: '5d', days: 5 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

interface SaleItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
}

export default function SalesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const businessId = Number(id)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [showRecordModal, setShowRecordModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [recordLoading, setRecordLoading] = useState(false)
  const [recordError, setRecordError] = useState('')

  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [quantity, setQuantity] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentStatus, setPaymentStatus] = useState<'fully_paid' | 'partial'>('fully_paid')
  const [amountPaid, setAmountPaid] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const fetchData = useCallback(async (reset = false) => {
    if (!businessId) return
    const currentPage = reset ? 0 : page
    setError('')
    try {
      const params: any = { skip: currentPage * 20, limit: 20 }
      if (activeFilter > 0) {
        const d = new Date()
        d.setDate(d.getDate() - activeFilter)
        params.start_date = d.toISOString().split('T')[0]
      }
      const [salesRes, productsRes, customersRes] = await Promise.allSettled([
        saleAPI.list(businessId, params),
        productAPI.list(businessId),
        customerAPI.list(businessId),
      ])
      if (salesRes.status === 'fulfilled') {
        const items = extractArray(salesRes.value.data)
        const mapped = items.map((item) => mapSale(item))
        if (reset) { setSales(mapped); setPage(1) }
        else {
          setSales((prev) => [...prev, ...mapped])
          setPage(currentPage + 1)
        }
        setHasMore(mapped.length >= 20)
      }
      if (productsRes.status === 'fulfilled') setProducts(extractArray(productsRes.value.data))
      if (customersRes.status === 'fulfilled') setCustomers(extractArray(customersRes.value.data))
    } catch {
      setError('Failed to load sales data')
    }
  }, [businessId, activeFilter, page])

  useEffect(() => { setLoading(true); fetchData(true).finally(() => setLoading(false)) }, [activeFilter])

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(true); setRefreshing(false) }, [fetchData])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await fetchData(false)
    setLoadingMore(false)
  }

  const totalAmount = sales.reduce((sum, s) => sum + (s.amount || 0), 0)
  const totalItems = sales.reduce((sum, s) => sum + (s.qty || 0), 0)

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase()
    return (p.name || '').toLowerCase().includes(q) || (p.product_name || '').toLowerCase().includes(q)
  })

  const addItem = () => {
    if (!selectedProduct) { setRecordError('Please select a product'); return }
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) { setRecordError('Invalid quantity'); return }
    const stock = selectedProduct.quantity ?? selectedProduct.stock ?? 0
    const pid = selectedProduct.product_id || selectedProduct.id
    const existingQty = saleItems.filter((i) => i.product_id === pid).reduce((s, i) => s + i.quantity, 0)
    if (existingQty + qty > stock) { setRecordError(`Only ${stock - existingQty} units available`); return }
    const existing = saleItems.findIndex((i) => i.product_id === pid)
    if (existing >= 0) {
      const updated = [...saleItems]
      updated[existing].quantity += qty
      setSaleItems(updated)
    } else {
      setSaleItems([...saleItems, {
        product_id: pid,
        product_name: selectedProduct.name || selectedProduct.product_name,
        quantity: qty,
        unit_price: selectedProduct.price || 0,
      }])
    }
    setSelectedProduct(null)
    setQuantity('1')
    setProductSearch('')
    setShowProductDropdown(false)
    setRecordError('')
  }

  const removeItem = (idx: number) => setSaleItems(saleItems.filter((_, i) => i !== idx))

  const orderTotal = saleItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  const handleRecordSale = async () => {
    if (saleItems.length === 0) { setRecordError('Add at least one item'); return }
    const total = saleItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
    if (paymentStatus === 'partial') {
      const paid = parseFloat(amountPaid)
      if (isNaN(paid) || paid <= 0) { setRecordError('Enter a valid amount paid'); return }
    }
    setRecordLoading(true)
    setRecordError('')
    try {
      const payload: any = {
        payment_method: paymentMethod,
        amount_paid: paymentStatus === 'partial' ? parseFloat(amountPaid) : total,
        list_items: saleItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      }
      if (paymentStatus === 'partial') {
        if (customerName.trim()) payload.customer_name = customerName.trim()
        if (customerPhone.trim()) payload.customer_phone = customerPhone.trim()
      }
      await saleAPI.record(businessId, payload)
      setShowRecordModal(false)
      resetForm()
      await fetchData(true)
    } catch (err: any) {
      setRecordError(parseApiError(err))
    } finally { setRecordLoading(false) }
  }

  const resetForm = () => {
    setSaleItems([])
    setSelectedProduct(null)
    setQuantity('1')
    setPaymentMethod('cash')
    setPaymentStatus('fully_paid')
    setAmountPaid('')
    setCustomerName('')
    setCustomerPhone('')
    setRecordError('')
  }

  const handleDelete = async () => {
    if (deleteTarget === null) return
    try {
      await saleAPI.delete(businessId, deleteTarget)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      await fetchData(true)
    } catch (err: any) {
      Alert.alert('Error', parseApiError(err))
    }
  }

  const getPaymentBadgeColor = (method: string) => {
    switch (method) {
      case 'cash': return Colors.success
      case 'mobile_money': return Colors.primary
      case 'card': return '#8B5CF6'
      default: return Colors.textLight
    }
  }

  const getStatusBadgeColor = (status?: string) => {
    if (status === 'fully_paid' || status === 'paid') return Colors.success
    if (status === 'partial') return Colors.warning
    return Colors.textLight
  }

  const renderSale = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.saleCard} onPress={() => { setSelectedSale(item); setShowDetailModal(true) }}>
      <View style={styles.saleHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.saleProduct} numberOfLines={1}>{item.product}</Text>
          <Text style={styles.saleSub}>{item.customer_name || 'Walk-in'} · {item.sold_by_name || `User #${item.user_id || ''}`}</Text>
        </View>
        <Text style={styles.saleAmount}>{formatCurrency(item.amount)}</Text>
      </View>
      <View style={styles.saleFooter}>
        <Text style={styles.saleQty}>{item.qty} items</Text>
        <View style={[styles.badge, { backgroundColor: getPaymentBadgeColor(item.payment) + '20' }]}>
          <Text style={[styles.badgeText, { color: getPaymentBadgeColor(item.payment) }]}>{formatPayment(item.payment)}</Text>
        </View>
        {item.payment_status && (
          <View style={[styles.badge, { backgroundColor: getStatusBadgeColor(item.payment_status) + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusBadgeColor(item.payment_status) }]}>
              {item.payment_status === 'fully_paid' ? 'Paid' : 'Partial'}
            </Text>
          </View>
        )}
        <Text style={styles.saleTime}>{item.time?.split(',')[0] || ''}</Text>
      </View>
    </TouchableOpacity>
  )

  if (loading) return <LoadingSpinner fullScreen message="Loading sales..." />

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales</Text>
        <TouchableOpacity style={styles.recordBtn} onPress={() => setShowRecordModal(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {error ? <AlertBadge message={error} type="error" /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {DATE_FILTERS.map((f) => (
          <TouchableOpacity key={f.label} style={[styles.filterBtn, activeFilter === f.days && styles.filterActive]} onPress={() => setActiveFilter(f.days)}>
            <Text style={[styles.filterText, activeFilter === f.days && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{sales.length} sales</Text>
        <Text style={styles.summaryText}>{totalItems} items</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(totalAmount)}</Text>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSale}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="No sales yet" message="Record your first sale to get started" />}
        ListFooterComponent={loadingMore ? <LoadingSpinner message="Loading more..." /> : null}
      />

      <Modal visible={showRecordModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowRecordModal(false); resetForm() }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Record Sale</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {recordError ? <AlertBadge message={recordError} type="error" /> : null}

            <Text style={styles.fieldLabel}>Add Products</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowProductDropdown(!showProductDropdown)}>
              <Text style={selectedProduct ? styles.dropdownText : styles.dropdownPlaceholder}>
                {selectedProduct ? `${selectedProduct.name || selectedProduct.product_name} - ${formatCurrency(selectedProduct.price || 0)}` : 'Select a product'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textLight} />
            </TouchableOpacity>

            {showProductDropdown && (
              <View style={styles.dropdownList}>
                <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={Colors.textLight} value={productSearch} onChangeText={setProductSearch} />
                <ScrollView style={{ maxHeight: 200 }}>
                  {filteredProducts.map((p) => {
                    const stock = p.quantity ?? p.stock ?? 0
                    return (
                      <TouchableOpacity key={p.product_id || p.id} style={styles.dropdownItem} onPress={() => { setSelectedProduct(p); setShowProductDropdown(false); setProductSearch('') }}>
                        <Text style={styles.dropdownItemText}>{p.name || p.product_name}</Text>
                        <Text style={styles.dropdownItemMeta}>{formatCurrency(p.price || 0)} · {stock} in stock</Text>
                      </TouchableOpacity>
                    )
                  })}
                  {filteredProducts.length === 0 && <Text style={styles.emptyText}>No products found</Text>}
                </ScrollView>
              </View>
            )}

            <View style={styles.qtyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput style={styles.qtyInput} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
              </View>
              <Button title="Add" onPress={addItem} size="sm" style={{ marginTop: 22 }} />
            </View>

            {saleItems.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.fieldLabel}>Order Items</Text>
                {saleItems.map((item, idx) => (
                  <View key={idx} style={styles.orderItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderItemName}>{item.product_name}</Text>
                      <Text style={styles.orderItemDetail}>{item.quantity} × {formatCurrency(item.unit_price)}</Text>
                    </View>
                    <Text style={styles.orderItemTotal}>{formatCurrency(item.quantity * item.unit_price)}</Text>
                    <TouchableOpacity onPress={() => removeItem(idx)} style={styles.removeBtn}>
                      <Ionicons name="close-circle" size={22} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(orderTotal)}</Text>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.paymentRow}>
              {(['cash', 'mobile_money', 'card'] as const).map((m) => (
                <TouchableOpacity key={m} style={[styles.payBtn, paymentMethod === m && styles.payBtnActive]} onPress={() => setPaymentMethod(m)}>
                  <Text style={[styles.payBtnText, paymentMethod === m && styles.payBtnTextActive]}>
                    {m === 'cash' ? 'Cash' : m === 'mobile_money' ? 'MoMo' : 'Card'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Payment Status</Text>
            <View style={styles.paymentRow}>
              <TouchableOpacity style={[styles.payBtn, paymentStatus === 'fully_paid' && styles.payBtnActive]} onPress={() => setPaymentStatus('fully_paid')}>
                <Text style={[styles.payBtnText, paymentStatus === 'fully_paid' && styles.payBtnTextActive]}>Fully Paid</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.payBtn, paymentStatus === 'partial' && styles.payBtnActive]} onPress={() => setPaymentStatus('partial')}>
                <Text style={[styles.payBtnText, paymentStatus === 'partial' && styles.payBtnTextActive]}>Partial Payment</Text>
              </TouchableOpacity>
            </View>

            {paymentStatus === 'partial' && (
              <View style={styles.partialSection}>
                <Text style={styles.fieldLabel}>Amount Paid</Text>
                <TextInput style={styles.textInput} value={amountPaid} onChangeText={setAmountPaid} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />
                <Text style={styles.fieldLabel}>Customer Name (optional)</Text>
                <TextInput style={styles.textInput} value={customerName} onChangeText={setCustomerName} placeholder="Customer name" placeholderTextColor={Colors.textLight} />
                <Text style={styles.fieldLabel}>Phone (optional)</Text>
                <TextInput style={styles.textInput} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor={Colors.textLight} />
              </View>
            )}

            <View style={{ marginTop: 20, marginBottom: 40 }}>
              <Button title="Confirm Sale" onPress={handleRecordSale} loading={recordLoading} disabled={recordLoading || saleItems.length === 0} size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowDetailModal(false)}>
            <Text style={styles.modalCancel}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Sale Details</Text>
          <TouchableOpacity onPress={() => {
            if (selectedSale) { setDeleteTarget(selectedSale.id); setShowDeleteConfirm(true); setShowDetailModal(false) }
          }}>
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        </View>
        {selectedSale && (
          <ScrollView style={styles.modalBody}>
            <Card style={{ marginBottom: 12 }}>
              <Text style={styles.detailLabel}>Product</Text>
              <Text style={styles.detailValue}>{selectedSale.product}</Text>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailValue, { color: Colors.primary }]}>{formatCurrency(selectedSale.amount)}</Text>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>{selectedSale.qty} items</Text>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{formatPayment(selectedSale.payment)}</Text>
              {selectedSale.payment_status && (
                <>
                  <Text style={styles.detailLabel}>Payment Status</Text>
                  <Text style={styles.detailValue}>{selectedSale.payment_status === 'fully_paid' ? 'Fully Paid' : 'Partial Payment'}</Text>
                </>
              )}
              {selectedSale.customer_name && (
                <>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{selectedSale.customer_name}</Text>
                </>
              )}
              {selectedSale.sold_by_name && (
                <>
                  <Text style={styles.detailLabel}>Sold By</Text>
                  <Text style={styles.detailValue}>{selectedSale.sold_by_name}</Text>
                </>
              )}
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{selectedSale.time}</Text>
            </Card>
          </ScrollView>
        )}
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Delete Sale</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to delete this sale? This action cannot be undone.</Text>
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
  recordBtn: { backgroundColor: Colors.primary, borderRadius: 10, padding: 8 },
  filterRow: { maxHeight: 50, backgroundColor: Colors.surface },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  filterTextActive: { color: '#FFF' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.primaryLight },
  summaryText: { fontSize: 13, color: Colors.primaryDark, fontWeight: '500' },
  summaryAmount: { fontSize: 14, color: Colors.primaryDark, fontWeight: '700' },
  saleCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  saleProduct: { fontSize: 15, fontWeight: '600', color: Colors.text },
  saleSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  saleAmount: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  saleFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  saleQty: { fontSize: 12, color: Colors.textLight },
  saleTime: { fontSize: 12, color: Colors.textLight, marginLeft: 'auto' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { fontSize: 16, color: Colors.primary },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 12 },
  textInput: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dropdownText: { fontSize: 14, color: Colors.text },
  dropdownPlaceholder: { fontSize: 14, color: Colors.textLight },
  dropdownList: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginTop: 4, padding: 8 },
  searchInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: Colors.text, marginBottom: 8 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  dropdownItemMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  emptyText: { fontSize: 13, color: Colors.textLight, textAlign: 'center', padding: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  qtyInput: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text },
  itemsSection: { marginTop: 8 },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderItemName: { fontSize: 14, fontWeight: '500', color: Colors.text },
  orderItemDetail: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  orderItemTotal: { fontSize: 14, fontWeight: '600', color: Colors.text, marginRight: 8 },
  removeBtn: { padding: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  paymentRow: { flexDirection: 'row', gap: 8 },
  payBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surfaceAlt },
  payBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  payBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  payBtnTextActive: { color: '#FFF' },
  partialSection: { marginTop: 8 },
  detailLabel: { fontSize: 12, color: Colors.textLight, marginTop: 10 },
  detailValue: { fontSize: 15, fontWeight: '500', color: Colors.text, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmModal: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: Colors.textLight, marginBottom: 20, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
})
