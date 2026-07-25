import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, RefreshControl,
  TextInput, FlatList, KeyboardAvoidingView, Platform,
  Modal as RNModal, ScrollView,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { productAPI } from '@/lib/api'
import { extractArray, normalizeProduct, formatCurrency, parseApiError } from '@/lib/utils'
import { Colors, BORDER_RADIUS } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import KpiCard from '@/components/ui/KpiCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import AlertBadge from '@/components/ui/AlertBadge'

const UNITS = ['units', 'kg', 'g', 'L', 'mL', 'pcs', 'boxes', 'bags']

interface ProductForm {
  name: string
  selling_price: string
  cost_price: string
  quantity: string
  unit: string
  low_stock_threshold: string
  category: string
  sku: string
  description: string
}

const emptyForm: ProductForm = { name: '', selling_price: '', cost_price: '', quantity: '', unit: 'units', low_stock_threshold: '10', category: '', sku: '', description: '' }

export default function ProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { currentBusiness } = useAuth()
  const businessId = Number(id) || currentBusiness?.business_id || 0

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [actionError, setActionError] = useState('')

  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const fetchProducts = useCallback(async () => {
    if (!businessId) return
    try {
      const res = await productAPI.list(businessId)
      setProducts(extractArray(res.data).map(normalizeProduct))
    } catch {
      setError('Failed to load products')
    }
  }, [businessId])

  useEffect(() => { setLoading(true); fetchProducts().finally(() => setLoading(false)) }, [fetchProducts])

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchProducts(); setRefreshing(false) }, [fetchProducts])

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    const nameMatch = (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
    const catMatch = !categoryFilter || p.category === categoryFilter
    const stockMatch = !lowStockOnly || (p.quantity ?? 0) <= (p.low_stock_threshold ?? 10)
    return nameMatch && catMatch && stockMatch
  })

  const totalValue = filtered.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0)
  const lowStockCount = products.filter((p) => (p.quantity ?? 0) <= (p.low_stock_threshold ?? 10) && (p.quantity ?? 0) > 0).length
  const outOfStockCount = products.filter((p) => (p.quantity ?? 0) === 0).length

  const openAddModal = () => { setEditingProduct(null); setForm(emptyForm); setShowFormModal(true); setFormError('') }
  const openEditModal = (p: any) => {
    setEditingProduct(p)
    setForm({
      name: p.name || '',
      selling_price: String(p.price || ''),
      cost_price: String(p.cost_price || ''),
      quantity: String(p.quantity ?? ''),
      unit: p.unit || 'units',
      low_stock_threshold: String(p.low_stock_threshold ?? 10),
      category: p.category || '',
      sku: p.sku || '',
      description: p.description || '',
    })
    setShowFormModal(true); setFormError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Product name is required'); return }
    if (!form.selling_price || parseFloat(form.selling_price) < 0) { setFormError('Valid selling price is required'); return }
    setFormLoading(true); setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        price: parseFloat(form.selling_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        quantity: parseInt(form.quantity) || 0,
        unit: form.unit,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
        category: form.category.trim(),
        sku: form.sku.trim(),
        description: form.description.trim(),
      }
      if (editingProduct) {
        await productAPI.update(businessId, editingProduct.product_id || editingProduct.id, payload)
      } else {
        await productAPI.create(businessId, payload)
      }
      setShowFormModal(false)
      await fetchProducts()
    } catch (err: any) {
      setFormError(parseApiError(err))
    } finally { setFormLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await productAPI.delete(businessId, deleteTarget.product_id || deleteTarget.id)
      setShowDeleteConfirm(false); setDeleteTarget(null)
      await fetchProducts()
    } catch (err: any) { setActionError(parseApiError(err)); setTimeout(() => setActionError(''), 4000) }
  }

  const getStockColor = (qty: number, threshold: number) => {
    if (qty === 0) return Colors.danger
    if (qty <= threshold) return Colors.warning
    return Colors.success
  }

  const updateForm = (key: keyof ProductForm, value: string) => setForm({ ...form, [key]: value })

  const renderProduct = ({ item }: { item: any }) => {
    const qty = item.quantity ?? 0
    const threshold = item.low_stock_threshold ?? 10
    const stockColor = getStockColor(qty, threshold)
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => { setSelectedProduct(item); setShowDetailModal(true) }}>
        <Card style={s.productCard}>
          <View style={s.productHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.productName}>{item.name}</Text>
              {item.sku ? <Text style={s.productSku}>SKU: {item.sku}</Text> : null}
            </View>
            <View style={[s.stockBadge, { backgroundColor: stockColor + '20' }]}>
              <Text style={[s.stockText, { color: stockColor }]}>{qty} {item.unit || 'units'}</Text>
            </View>
          </View>
          <View style={s.productMeta}>
            <Text style={s.productPrice}>{formatCurrency(item.price || 0)}</Text>
            {item.category && <Text style={s.productCategory}>{item.category}</Text>}
          </View>
          <View style={s.productActions}>
            <TouchableOpacity style={s.productActionBtn} onPress={() => openEditModal(item)}>
              <Ionicons name="pencil" size={14} color={Colors.primary} />
              <Text style={s.productActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.productActionBtn} onPress={() => { setDeleteTarget(item); setShowDeleteConfirm(true) }}>
              <Ionicons name="trash-outline" size={14} color={Colors.danger} />
              <Text style={[s.productActionText, { color: Colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading products..." />

  return (
    <View style={s.root}>
      <View style={s.heroBanner}>
        <View style={s.heroCircle1} />
        <View style={s.heroCircle2} />
        <View style={s.heroContent}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroTitle}>Products</Text>
              <Text style={s.heroSubtitle}>{products.length} products in inventory</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={openAddModal}>
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={s.heroQuickStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{products.length}</Text>
              <Text style={s.heroStatLabel}>Total</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={[s.heroStatValue, lowStockCount > 0 && { color: Colors.warning }]}>{lowStockCount}</Text>
              <Text style={s.heroStatLabel}>Low Stock</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={[s.heroStatValue, outOfStockCount > 0 && { color: Colors.danger }]}>{outOfStockCount}</Text>
              <Text style={s.heroStatLabel}>Out</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{formatCurrency(totalValue).replace('GH₵ ', '₵')}</Text>
              <Text style={s.heroStatLabel}>Value</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.stickySection}>
        {error ? <AlertBadge message={error} type="error" /> : null}
        {actionError ? <AlertBadge message={actionError} type="error" /> : null}

        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput style={s.searchInput} placeholder="Search products..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={Colors.textLight} /></TouchableOpacity> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catBar} contentContainerStyle={s.catContent}>
          <TouchableOpacity style={[s.catBtn, !categoryFilter && s.catActive]} onPress={() => setCategoryFilter('')}>
            <Text style={[s.catText, !categoryFilter && s.catTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity key={c} style={[s.catBtn, categoryFilter === c && s.catActive]} onPress={() => setCategoryFilter(c)}>
              <Text style={[s.catText, categoryFilter === c && s.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.catBtn, lowStockOnly && s.catLowActive]} onPress={() => setLowStockOnly(!lowStockOnly)}>
            <Text style={[s.catText, lowStockOnly && s.catTextActive]}>Low Stock</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.product_id || item.id)}
        renderItem={renderProduct}
        style={s.list}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState icon="cube-outline" title="No products" message="Add your first product to get started" />}
      />

      <RNModal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalNav}>
            <TouchableOpacity onPress={() => setShowFormModal(false)}>
              <Text style={s.modalAction}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalNavTitle}>{editingProduct ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={formLoading}>
              <Text style={[s.modalAction, { fontWeight: '700' }, formLoading && { opacity: 0.5 }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">
            {formError ? <AlertBadge message={formError} type="error" /> : null}

            <Text style={s.fieldLabel}>Product Name *</Text>
            <TextInput style={s.textInput} value={form.name} onChangeText={(v: string) => updateForm('name', v)} placeholder="Product name" placeholderTextColor={Colors.textLight} />

            <Text style={s.fieldLabel}>Selling Price *</Text>
            <TextInput style={s.textInput} value={form.selling_price} onChangeText={(v: string) => updateForm('selling_price', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />

            <Text style={s.fieldLabel}>Cost Price</Text>
            <TextInput style={s.textInput} value={form.cost_price} onChangeText={(v: string) => updateForm('cost_price', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />

            <Text style={s.fieldLabel}>Quantity</Text>
            <TextInput style={s.textInput} value={form.quantity} onChangeText={(v: string) => updateForm('quantity', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.textLight} />

            <Text style={s.fieldLabel}>Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }}>
              {UNITS.map((u) => (
                <TouchableOpacity key={u} style={[s.unitBtn, form.unit === u && s.unitActive]} onPress={() => updateForm('unit', u)}>
                  <Text style={[s.unitText, form.unit === u && s.unitTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>Low Stock Threshold</Text>
            <TextInput style={s.textInput} value={form.low_stock_threshold} onChangeText={(v: string) => updateForm('low_stock_threshold', v)} keyboardType="number-pad" placeholder="10" placeholderTextColor={Colors.textLight} />

            <Text style={s.fieldLabel}>Category</Text>
            <TextInput style={s.textInput} value={form.category} onChangeText={(v: string) => updateForm('category', v)} placeholder="Category" placeholderTextColor={Colors.textLight} />

            <Text style={s.fieldLabel}>SKU</Text>
            <TextInput style={s.textInput} value={form.sku} onChangeText={(v: string) => updateForm('sku', v)} placeholder="SKU code" placeholderTextColor={Colors.textLight} />

            <Text style={s.fieldLabel}>Description</Text>
            <TextInput style={[s.textInput, { height: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={(v: string) => updateForm('description', v)} placeholder="Product description" placeholderTextColor={Colors.textLight} multiline numberOfLines={3} />

            <View style={{ marginTop: 20, marginBottom: 40 }}>
              <Button title={editingProduct ? 'Update Product' : 'Add Product'} onPress={handleSave} loading={formLoading} disabled={formLoading} size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </RNModal>

      <RNModal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalNav}>
          <TouchableOpacity onPress={() => setShowDetailModal(false)}>
            <Text style={s.modalAction}>Close</Text>
          </TouchableOpacity>
          <Text style={s.modalNavTitle}>Product Details</Text>
          {selectedProduct && (
            <TouchableOpacity onPress={() => { setShowDetailModal(false); openEditModal(selectedProduct) }}>
              <Ionicons name="pencil" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        {selectedProduct && (
          <ScrollView style={s.modalScroll}>
            <View style={s.detailHeader}>
              <View style={[s.detailIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="cube" size={32} color={Colors.primary} />
              </View>
              <Text style={s.detailName}>{selectedProduct.name}</Text>
              {selectedProduct.sku && <Text style={s.detailSku}>SKU: {selectedProduct.sku}</Text>}
            </View>

            <Card style={{ marginBottom: 12 }}>
              <View style={s.detailPriceRow}>
                <View>
                  <Text style={s.detailPriceLabel}>Selling Price</Text>
                  <Text style={s.detailPriceValue}>{formatCurrency(selectedProduct.price || 0)}</Text>
                </View>
                <View>
                  <Text style={s.detailPriceLabel}>Cost Price</Text>
                  <Text style={[s.detailPriceValue, { color: Colors.textLight }]}>{formatCurrency(selectedProduct.cost_price || 0)}</Text>
                </View>
                <View>
                  <Text style={s.detailPriceLabel}>Profit</Text>
                  <Text style={[s.detailPriceValue, { color: Colors.success }]}>{formatCurrency((selectedProduct.price || 0) - (selectedProduct.cost_price || 0))}</Text>
                </View>
              </View>
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <View style={s.detailInfoRow}>
                <Text style={s.detailInfoLabel}>Stock Quantity</Text>
                <Text style={[s.detailInfoValue, { color: (selectedProduct.quantity ?? 0) <= (selectedProduct.low_stock_threshold ?? 10) ? Colors.danger : Colors.success, fontWeight: '700' }]}>
                  {selectedProduct.quantity ?? 0} {selectedProduct.unit || 'units'}
                </Text>
              </View>
              <View style={s.detailInfoRow}>
                <Text style={s.detailInfoLabel}>Low Stock Threshold</Text>
                <Text style={s.detailInfoValue}>{selectedProduct.low_stock_threshold ?? 10}</Text>
              </View>
              {selectedProduct.category && (
                <View style={s.detailInfoRow}>
                  <Text style={s.detailInfoLabel}>Category</Text>
                  <Text style={s.detailInfoValue}>{selectedProduct.category}</Text>
                </View>
              )}
              {selectedProduct.description && (
                <View style={s.detailInfoRow}>
                  <Text style={s.detailInfoLabel}>Description</Text>
                  <Text style={[s.detailInfoValue, { flex: 1, textAlign: 'right' }]} numberOfLines={3}>{selectedProduct.description}</Text>
                </View>
              )}
              {selectedProduct.created_at && (
                <View style={[s.detailInfoRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.detailInfoLabel}>Created</Text>
                  <Text style={s.detailInfoValue}>{new Date(selectedProduct.created_at).toLocaleDateString()}</Text>
                </View>
              )}
            </Card>

            <Card>
              <View style={s.detailInfoRow}>
                <Text style={s.detailInfoLabel}>Inventory Value</Text>
                <Text style={[s.detailInfoValue, { fontWeight: '700', color: Colors.primary }]}>{formatCurrency((selectedProduct.price || 0) * (selectedProduct.quantity || 0))}</Text>
              </View>
              <View style={[s.detailInfoRow, { borderBottomWidth: 0 }]}>
                <Text style={s.detailInfoLabel}>Status</Text>
                <View style={[s.stockBadge, { backgroundColor: ((selectedProduct.quantity ?? 0) === 0 ? Colors.danger : (selectedProduct.quantity ?? 0) <= (selectedProduct.low_stock_threshold ?? 10) ? Colors.warning : Colors.success) + '20' }]}>
                  <Text style={[s.stockText, { color: (selectedProduct.quantity ?? 0) === 0 ? Colors.danger : (selectedProduct.quantity ?? 0) <= (selectedProduct.low_stock_threshold ?? 10) ? Colors.warning : Colors.success }]}>
                    {(selectedProduct.quantity ?? 0) === 0 ? 'Out of Stock' : (selectedProduct.quantity ?? 0) <= (selectedProduct.low_stock_threshold ?? 10) ? 'Low Stock' : 'In Stock'}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 40 }}>
              <Button title="Edit" onPress={() => { setShowDetailModal(false); openEditModal(selectedProduct) }} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" onPress={() => { setShowDetailModal(false); setDeleteTarget(selectedProduct); setShowDeleteConfirm(true) }} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        )}
      </RNModal>

      <RNModal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.confirmCard}>
            <Text style={s.confirmTitle}>Delete Product</Text>
            <Text style={s.confirmMsg}>Are you sure you want to delete "{deleteTarget?.name}"?</Text>
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

  heroBanner: {
    backgroundColor: Colors.navy,
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
    position: 'relative', overflow: 'hidden',
  },
  heroCircle1: { position: 'absolute', top: -60, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(37,99,235,0.3)' },
  heroCircle2: { position: 'absolute', bottom: -20, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(37,99,235,0.2)' },
  heroContent: { position: 'relative', zIndex: 1 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  heroQuickStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.xl,
    marginTop: 16, paddingVertical: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: '500' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },

  stickySection: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10,
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 4 },

  catBar: { marginTop: 8 },
  catContent: { paddingHorizontal: 16, gap: 8 },
  catBtn: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  catActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catLowActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  catText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  catTextActive: { color: '#FFF' },

  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },

  productCard: { marginBottom: 12, padding: 14 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  productSku: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  stockText: { fontSize: 11, fontWeight: '700' },
  productMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  productPrice: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  productCategory: {
    fontSize: 11, color: Colors.textLight, backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row', gap: 16, marginTop: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10,
  },
  productActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productActionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

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
  unitBtn: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 8,
  },
  unitActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  unitTextActive: { color: '#FFF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: Colors.textLight, marginBottom: 20, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 12 },

  detailHeader: { alignItems: 'center', marginBottom: 20 },
  detailIcon: { width: 72, height: 72, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  detailName: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  detailSku: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  detailPriceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailPriceLabel: { fontSize: 12, color: Colors.textLight },
  detailPriceValue: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 4 },
  detailInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  detailInfoLabel: { fontSize: 13, color: Colors.textLight },
  detailInfoValue: { fontSize: 14, fontWeight: '500', color: Colors.text },
})
