import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, RefreshControl,
  TextInput, FlatList, KeyboardAvoidingView, Platform, Dimensions,
  Modal as RNModal, ScrollView,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { saleAPI, productAPI, customerAPI } from '@/lib/api'
import { extractArray, mapSale, formatCurrency, formatPayment, parseApiError } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'
import GradientHero from '@/components/ui/GradientHero'

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
  const { currentBusiness } = useAuth()
  const businessId = Number(id) || currentBusiness?.business_id || 0

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
  const [actionError, setActionError] = useState('')

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
        productAPI.list(businessId, { limit: 500 }),
        customerAPI.list(businessId),
      ])

      const productMap = new Map<number, string>()
      if (productsRes.status === 'fulfilled') {
        const prods = extractArray(productsRes.value.data)
        prods.forEach((p: any) => {
          const pid = p.product_id ?? p.id
          if (pid != null) productMap.set(pid, p.name || p.product_name || `Product #${pid}`)
        })
      }

      if (salesRes.status === 'fulfilled') {
        const items = extractArray(salesRes.value.data)
        const mapped = items.map((item) => mapSale(item, productMap))
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
      setActionError(parseApiError(err)); setTimeout(() => setActionError(''), 4000)
    }
  }

  const getPaymentBadgeColor = (method: string) => {
    switch (method) {
      case 'cash': return Colors.success
      case 'mobile_money': return Colors.primary
      case 'card': return Colors.warning
      default: return Colors.textLight
    }
  }

  const renderSale = ({ item }: { item: any }) => {
    const isPartial = item.payment_status === 'partial'
    const itemCount = item.sales_items?.length || 0
    const displayTime = item.created_at ? new Date(item.created_at) : null
    const timeLabel = displayTime
      ? displayTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + displayTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : item.time?.split(',')[0] || ''

    return (
      <TouchableOpacity style={s.card} onPress={() => { setSelectedSale(item); setShowDetailModal(true) }} activeOpacity={0.7}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Text style={s.cardId}>#{item.id}</Text>
            <View style={[s.statusDot, { backgroundColor: isPartial ? Colors.warning : Colors.success }]} />
            <Text style={[s.statusText, { color: isPartial ? Colors.warning : Colors.success }]}>
              {isPartial ? 'Partial' : 'Paid'}
            </Text>
          </View>
          <Text style={s.cardTime}>{timeLabel}</Text>
        </View>

        {item.sales_items && itemCount > 0 ? (
          <View style={s.itemsList}>
            {item.sales_items.slice(0, 3).map((si: any, idx: number) => (
              <View key={idx} style={s.itemRow}>
                <View style={s.itemDot} />
                <Text style={s.itemName} numberOfLines={1}>{si.product_name || `Product #${si.product_id}`}</Text>
                <Text style={s.itemQty}>×{si.quantity}</Text>
                <Text style={s.itemPrice}>{formatCurrency(si.unit_price || 0)}</Text>
              </View>
            ))}
            {itemCount > 3 && (
              <Text style={s.itemMore}>+{itemCount - 3} more</Text>
            )}
          </View>
        ) : (
          <Text style={s.itemFallback} numberOfLines={1}>{item.product}</Text>
        )}

        <View style={s.cardDivider} />

        <View style={s.cardFooter}>
          <View style={s.footerLeft}>
            <View style={s.footerMeta}>
              <Ionicons name="person-outline" size={12} color={item.customer_name ? Colors.neutralLight : Colors.textLight} />
              <Text style={[s.footerMetaText, !item.customer_name && { color: Colors.textLight }]} numberOfLines={1}>
                {item.customer_name || 'Walk-in'}
              </Text>
            </View>
            {item.sold_by_name && (
              <View style={s.footerMeta}>
                <Ionicons name="briefcase-outline" size={12} color={Colors.neutralLight} />
                <Text style={s.footerMetaText} numberOfLines={1}>{item.sold_by_name}</Text>
              </View>
            )}
          </View>

          <View style={s.footerRight}>
            {isPartial && item.amount_paid != null && (
              <Text style={s.paidSmall}>Paid {formatCurrency(item.amount_paid)}</Text>
            )}
            <Text style={s.amount}>{formatCurrency(item.amount)}</Text>
          </View>
        </View>

        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: getPaymentBadgeColor(item.payment) + '15' }]}>
            <Ionicons
              name={item.payment === 'cash' ? 'cash-outline' : item.payment === 'mobile_money' ? 'phone-portrait-outline' : 'card-outline'}
              size={11} color={getPaymentBadgeColor(item.payment)}
            />
            <Text style={[s.badgeText, { color: getPaymentBadgeColor(item.payment) }]}>{formatPayment(item.payment)}</Text>
          </View>
          {item.qty > 0 && (
            <View style={[s.badge, { backgroundColor: Colors.surfaceAlt }]}>
              <Ionicons name="cube-outline" size={11} color={Colors.textLight} />
              <Text style={[s.badgeText, { color: Colors.textLight }]}>{item.qty} item{item.qty !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {item.note && (
            <View style={[s.badge, { backgroundColor: Colors.purpleLight }]}>
              <Ionicons name="document-text-outline" size={11} color={Colors.purple} />
              <Text style={[s.badgeText, { color: Colors.purple }]}>Note</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading sales..." />

  return (
    <View style={s.root}>
      <GradientHero topInset={54} height={140} bubbles>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroTitle}>Sales</Text>
            <Text style={s.heroSubtitle}>{sales.length} transactions recorded</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowRecordModal(true)}>
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={s.heroQuickStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{sales.length}</Text>
            <Text style={s.heroStatLabel}>Sales</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{totalItems}</Text>
            <Text style={s.heroStatLabel}>Items</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{formatCurrency(totalAmount).replace('GH₵ ', '₵')}</Text>
            <Text style={s.heroStatLabel}>Total</Text>
          </View>
        </View>
      </GradientHero>

      <View style={s.stickySection}>
        {error ? <AlertBadge message={error} type="error" /> : null}
        {actionError ? <AlertBadge message={actionError} type="error" /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
          {DATE_FILTERS.map((f) => (
            <TouchableOpacity key={f.label} style={[s.filterBtn, activeFilter === f.days && s.filterActive]} onPress={() => setActiveFilter(f.days)}>
              <Text style={[s.filterText, activeFilter === f.days && s.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={renderSale}
        style={s.list}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="No sales yet" message="Record your first sale to get started" />}
        ListFooterComponent={loadingMore ? <LoadingSpinner message="Loading more..." /> : null}
      />

      <RNModal visible={showRecordModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalNav}>
            <TouchableOpacity onPress={() => { setShowRecordModal(false); resetForm() }}>
              <Text style={s.modalAction}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalNavTitle}>Record Sale</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">
            {recordError ? <AlertBadge message={recordError} type="error" /> : null}

            <Text style={s.fieldLabel}>Add Products</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setShowProductDropdown(!showProductDropdown)}>
              <Text style={selectedProduct ? s.dropdownVal : s.dropdownPh}>
                {selectedProduct ? `${selectedProduct.name || selectedProduct.product_name} - ${formatCurrency(selectedProduct.price || 0)}` : 'Select a product'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textLight} />
            </TouchableOpacity>

            {showProductDropdown && (
              <View style={s.dropdownList}>
                <TextInput style={s.dropdownSearch} placeholder="Search..." placeholderTextColor={Colors.textLight} value={productSearch} onChangeText={setProductSearch} />
                <ScrollView style={{ maxHeight: 200 }}>
                  {filteredProducts.map((p) => {
                    const stock = p.quantity ?? p.stock ?? 0
                    return (
                      <TouchableOpacity key={p.product_id || p.id} style={s.dropdownItem} onPress={() => { setSelectedProduct(p); setShowProductDropdown(false); setProductSearch('') }}>
                        <Text style={s.dropdownItemText}>{p.name || p.product_name}</Text>
                        <Text style={s.dropdownItemMeta}>{formatCurrency(p.price || 0)} · {stock} in stock</Text>
                      </TouchableOpacity>
                    )
                  })}
                  {filteredProducts.length === 0 && <Text style={{ fontSize: 13, color: Colors.textLight, textAlign: 'center', padding: 12 }}>No products found</Text>}
                </ScrollView>
              </View>
            )}

            <View style={s.qtyRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Quantity</Text>
                <TextInput style={s.qtyInput} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
              </View>
              <Button title="Add" onPress={addItem} size="sm" style={{ marginTop: 22 }} />
            </View>

            {saleItems.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={s.fieldLabel}>Order Items</Text>
                {saleItems.map((item, idx) => (
                  <View key={idx} style={s.orderItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.orderItemName}>{item.product_name}</Text>
                      <Text style={s.orderItemDetail}>{item.quantity} × {formatCurrency(item.unit_price)}</Text>
                    </View>
                    <Text style={s.orderItemTotal}>{formatCurrency(item.quantity * item.unit_price)}</Text>
                    <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={22} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValue}>{formatCurrency(orderTotal)}</Text>
                </View>
              </View>
            )}

            <Text style={s.fieldLabel}>Payment Method</Text>
            <View style={s.payRow}>
              {(['cash', 'mobile_money', 'card'] as const).map((m) => (
                <TouchableOpacity key={m} style={[s.payBtn, paymentMethod === m && s.payBtnActive]} onPress={() => setPaymentMethod(m)}>
                  <Text style={[s.payBtnText, paymentMethod === m && s.payBtnTextActive]}>
                    {m === 'cash' ? 'Cash' : m === 'mobile_money' ? 'MoMo' : 'Card'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Payment Status</Text>
            <View style={s.payRow}>
              <TouchableOpacity style={[s.payBtn, paymentStatus === 'fully_paid' && s.payBtnActive]} onPress={() => setPaymentStatus('fully_paid')}>
                <Text style={[s.payBtnText, paymentStatus === 'fully_paid' && s.payBtnTextActive]}>Fully Paid</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.payBtn, paymentStatus === 'partial' && s.payBtnActive]} onPress={() => setPaymentStatus('partial')}>
                <Text style={[s.payBtnText, paymentStatus === 'partial' && s.payBtnTextActive]}>Partial Payment</Text>
              </TouchableOpacity>
            </View>

            {paymentStatus === 'partial' && (
              <View style={{ marginTop: 8 }}>
                <Text style={s.fieldLabel}>Amount Paid</Text>
                <TextInput style={s.textInput} value={amountPaid} onChangeText={setAmountPaid} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />
                <Text style={s.fieldLabel}>Customer Name (optional)</Text>
                <TextInput style={s.textInput} value={customerName} onChangeText={setCustomerName} placeholder="Customer name" placeholderTextColor={Colors.textLight} />
                <Text style={s.fieldLabel}>Phone (optional)</Text>
                <TextInput style={s.textInput} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor={Colors.textLight} />
              </View>
            )}

            <View style={{ marginTop: 20, marginBottom: 40 }}>
              <Button title="Confirm Sale" onPress={handleRecordSale} loading={recordLoading} disabled={recordLoading || saleItems.length === 0} size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </RNModal>

      <RNModal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalNav}>
          <TouchableOpacity onPress={() => setShowDetailModal(false)}>
            <Text style={s.modalAction}>Close</Text>
          </TouchableOpacity>
          <Text style={s.modalNavTitle}>Sale Details</Text>
          <TouchableOpacity onPress={() => {
            if (selectedSale) { setDeleteTarget(selectedSale.id); setShowDeleteConfirm(true); setShowDetailModal(false) }
          }}>
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        </View>
        {selectedSale && (
          <ScrollView style={s.modalScroll}>
            <View style={s.detailTopBar}>
              <View style={[s.detailBadge, { backgroundColor: (selectedSale.payment_status === 'fully_paid' ? Colors.success : Colors.warning) + '20' }]}>
                <Text style={[s.detailBadgeText, { color: selectedSale.payment_status === 'fully_paid' ? Colors.success : Colors.warning }]}>
                  {selectedSale.payment_status === 'fully_paid' ? 'Paid' : 'Partial'}
                </Text>
              </View>
              <Text style={s.detailDate}>{selectedSale.time}</Text>
            </View>

            <Card style={{ marginBottom: 12 }}>
              <View style={s.detailRow}>
                <Text style={s.detailRowLabel}>Total Amount</Text>
                <Text style={s.detailRowValue}>{formatCurrency(selectedSale.amount)}</Text>
              </View>
              {selectedSale.amount_paid != null && selectedSale.amount_paid < selectedSale.amount && (
                <>
                  <View style={s.detailRow}>
                    <Text style={s.detailRowLabel}>Amount Paid</Text>
                    <Text style={[s.detailRowValue, { color: Colors.success }]}>{formatCurrency(selectedSale.amount_paid)}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailRowLabel}>Remaining</Text>
                    <Text style={[s.detailRowValue, { color: Colors.danger }]}>{formatCurrency(selectedSale.amount - selectedSale.amount_paid)}</Text>
                  </View>
                </>
              )}
            </Card>

            {selectedSale.sales_items && selectedSale.sales_items.length > 0 && (
              <Card style={{ marginBottom: 12 }}>
                <Text style={s.detailSectionTitle}>Items ({selectedSale.sales_items.length})</Text>
                {selectedSale.sales_items.map((item: any, i: number) => (
                  <View key={i} style={[s.detailItemRow, i < selectedSale.sales_items.length - 1 && s.detailItemBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailItemName}>{item.product_name || `Product #${item.product_id}`}</Text>
                      <Text style={s.detailItemMeta}>{item.quantity} × {formatCurrency(item.unit_price || 0)}</Text>
                    </View>
                    <Text style={s.detailItemTotal}>{formatCurrency(item.subtotal || item.quantity * (item.unit_price || 0))}</Text>
                  </View>
                ))}
              </Card>
            )}

            <Card style={{ marginBottom: 12 }}>
              <Text style={s.detailSectionTitle}>Payment Info</Text>
              <View style={s.detailInfoRow}>
                <Text style={s.detailInfoLabel}>Method</Text>
                <Text style={s.detailInfoValue}>{formatPayment(selectedSale.payment)}</Text>
              </View>
              {selectedSale.customer_name && (
                <View style={s.detailInfoRow}>
                  <Text style={s.detailInfoLabel}>Customer</Text>
                  <Text style={s.detailInfoValue}>{selectedSale.customer_name}</Text>
                </View>
              )}
              {selectedSale.sold_by_name && (
                <View style={s.detailInfoRow}>
                  <Text style={s.detailInfoLabel}>Sold By</Text>
                  <Text style={s.detailInfoValue}>{selectedSale.sold_by_name}</Text>
                </View>
              )}
              {selectedSale.note && (
                <View style={s.detailInfoRow}>
                  <Text style={s.detailInfoLabel}>Note</Text>
                  <Text style={s.detailInfoValue}>{selectedSale.note}</Text>
                </View>
              )}
            </Card>
          </ScrollView>
        )}
      </RNModal>

      <RNModal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.confirmCard}>
            <Text style={s.confirmTitle}>Delete Sale</Text>
            <Text style={s.confirmMsg}>Are you sure? This cannot be undone.</Text>
            <View style={s.confirmActions}>
              <Button title="Cancel" variant="outline" onPress={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" onPress={handleDelete} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </RNModal>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 2 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  heroQuickStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.xl,
    marginTop: 16, paddingVertical: 14, paddingHorizontal: 12, marginHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: '500' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },

  stickySection: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },

  filterBar: { maxHeight: 48 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterBtn: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
  },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  filterTextActive: { color: '#FFF' },

  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardId: { fontSize: 12, fontWeight: '700', color: Colors.textLight, fontFamily: 'monospace' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTime: { fontSize: 11, color: Colors.textLight },

  itemsList: { marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: 6 },
  itemDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, opacity: 0.4 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.text },
  itemQty: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  itemPrice: { fontSize: 12, fontWeight: '600', color: Colors.neutralLight, minWidth: 55, textAlign: 'right' },
  itemMore: { fontSize: 11, color: Colors.textLight, fontStyle: 'italic', marginTop: 2, marginLeft: 10 },
  itemFallback: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 10 },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  footerLeft: { flex: 1, gap: 4, marginRight: 12 },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerMetaText: { fontSize: 12, color: Colors.neutralLight },
  footerRight: { alignItems: 'flex-end' },
  paidSmall: { fontSize: 10, color: Colors.success, fontWeight: '600', marginBottom: 1 },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.md,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },

  modalNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalAction: { fontSize: 16, color: Colors.primary },
  modalNavTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalScroll: { flex: 1, padding: 20 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  textInput: {
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text,
  },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownVal: { fontSize: 14, color: Colors.text, flex: 1 },
  dropdownPh: { fontSize: 14, color: Colors.textLight, flex: 1 },
  dropdownList: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg, marginTop: 4, padding: 8,
  },
  dropdownSearch: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, fontSize: 14, color: Colors.text, marginBottom: 8,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  dropdownItemMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  qtyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  qtyInput: {
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text,
  },
  orderItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  orderItemName: { fontSize: 14, fontWeight: '500', color: Colors.text },
  orderItemDetail: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  orderItemTotal: { fontSize: 14, fontWeight: '600', color: Colors.text, marginRight: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  payRow: { flexDirection: 'row', gap: 8 },
  payBtn: {
    flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surfaceAlt,
  },
  payBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  payBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  payBtnTextActive: { color: '#FFF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: Colors.textLight, marginBottom: 20, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 12 },

  detailTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  detailBadgeText: { fontSize: 13, fontWeight: '700' },
  detailDate: { fontSize: 12, color: Colors.textLight },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  detailRowLabel: { fontSize: 14, color: Colors.textLight },
  detailRowValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  detailSectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  detailItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailItemName: { fontSize: 14, fontWeight: '500', color: Colors.text },
  detailItemMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  detailItemTotal: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  detailInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  detailInfoLabel: { fontSize: 13, color: Colors.textLight },
  detailInfoValue: { fontSize: 14, fontWeight: '500', color: Colors.text },
})
