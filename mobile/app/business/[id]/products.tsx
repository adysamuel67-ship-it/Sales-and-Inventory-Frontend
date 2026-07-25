import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal,
  TextInput, FlatList, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { productAPI } from '@/lib/api'
import { extractArray, normalizeProduct, formatCurrency, parseApiError } from '@/lib/utils'
import { Colors } from '@/lib/constants'
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
  const businessId = Number(id)
  const router = useRouter()

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
    } catch (err: any) { Alert.alert('Error', parseApiError(err)) }
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
      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.sku ? <Text style={styles.productSku}>SKU: {item.sku}</Text> : null}
          </View>
          <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
            <Text style={[styles.stockText, { color: stockColor }]}>{qty} {item.unit || 'units'}</Text>
          </View>
        </View>
        <View style={styles.productMeta}>
          <Text style={styles.productPrice}>{formatCurrency(item.price || 0)}</Text>
          {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Ionicons name="pencil" size={16} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => { setDeleteTarget(item); setShowDeleteConfirm(true) }}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card>
    )
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading products..." />

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.kpiRow} horizontal={false} showsVerticalScrollIndicator={false}>
        <View style={styles.kpiContainer}>
          <KpiCard title="Total" value={String(products.length)} icon="cube" color={Colors.primary} />
          <KpiCard title="Low Stock" value={String(lowStockCount)} icon="warning" color={Colors.warning} />
        </View>
        <View style={styles.kpiContainer}>
          <KpiCard title="Out of Stock" value={String(outOfStockCount)} icon="close-circle" color={Colors.danger} />
          <KpiCard title="Value" value={formatCurrency(totalValue)} icon="cash" color={Colors.success} />
        </View>
      </ScrollView>

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={Colors.textLight} /></TouchableOpacity> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          <TouchableOpacity style={[styles.catBtn, !categoryFilter && styles.catActive]} onPress={() => setCategoryFilter('')}>
            <Text style={[styles.catText, !categoryFilter && styles.catTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity key={c} style={[styles.catBtn, categoryFilter === c && styles.catActive]} onPress={() => setCategoryFilter(c)}>
              <Text style={[styles.catText, categoryFilter === c && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.catBtn, lowStockOnly && { backgroundColor: Colors.warning, borderColor: Colors.warning }]} onPress={() => setLowStockOnly(!lowStockOnly)}>
            <Text style={[styles.catText, lowStockOnly && { color: '#FFF' }]}>Low Stock</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.product_id || item.id)}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState icon="cube-outline" title="No products" message="Add your first product to get started" />}
      />

      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFormModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={formLoading}>
              <Text style={[styles.modalSave, formLoading && { opacity: 0.5 }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formError ? <AlertBadge message={formError} type="error" /> : null}

            <Text style={styles.fieldLabel}>Product Name *</Text>
            <TextInput style={styles.textInput} value={form.name} onChangeText={(v) => updateForm('name', v)} placeholder="Product name" placeholderTextColor={Colors.textLight} />

            <Text style={styles.fieldLabel}>Selling Price *</Text>
            <TextInput style={styles.textInput} value={form.selling_price} onChangeText={(v) => updateForm('selling_price', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />

            <Text style={styles.fieldLabel}>Cost Price</Text>
            <TextInput style={styles.textInput} value={form.cost_price} onChangeText={(v) => updateForm('cost_price', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />

            <Text style={styles.fieldLabel}>Quantity</Text>
            <TextInput style={styles.textInput} value={form.quantity} onChangeText={(v) => updateForm('quantity', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.textLight} />

            <Text style={styles.fieldLabel}>Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity key={u} style={[styles.unitBtn, form.unit === u && styles.unitActive]} onPress={() => updateForm('unit', u)}>
                  <Text style={[styles.unitText, form.unit === u && styles.unitTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Low Stock Threshold</Text>
            <TextInput style={styles.textInput} value={form.low_stock_threshold} onChangeText={(v) => updateForm('low_stock_threshold', v)} keyboardType="number-pad" placeholder="10" placeholderTextColor={Colors.textLight} />

            <Text style={styles.fieldLabel}>Category</Text>
            <TextInput style={styles.textInput} value={form.category} onChangeText={(v) => updateForm('category', v)} placeholder="Category" placeholderTextColor={Colors.textLight} />

            <Text style={styles.fieldLabel}>SKU</Text>
            <TextInput style={styles.textInput} value={form.sku} onChangeText={(v) => updateForm('sku', v)} placeholder="SKU code" placeholderTextColor={Colors.textLight} />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={(v) => updateForm('description', v)} placeholder="Product description" placeholderTextColor={Colors.textLight} multiline numberOfLines={3} />

            <View style={{ marginTop: 20, marginBottom: 40 }}>
              <Button title={editingProduct ? 'Update Product' : 'Add Product'} onPress={handleSave} loading={formLoading} disabled={formLoading} size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Delete Product</Text>
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
  kpiRow: { paddingHorizontal: 16, paddingTop: 16 },
  kpiContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 4 },
  catRow: { marginTop: 8, maxHeight: 40 },
  catBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  catActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  catTextActive: { color: '#FFF' },
  productCard: { marginBottom: 12, padding: 14 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  productSku: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stockText: { fontSize: 12, fontWeight: '700' },
  productMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  productPrice: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  productCategory: { fontSize: 12, color: Colors.textLight, backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  productActions: { flexDirection: 'row', gap: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: Colors.danger },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { fontSize: 16, color: Colors.primary },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalSave: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  textInput: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text },
  unitRow: { maxHeight: 44 },
  unitBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  unitActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  unitTextActive: { color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmModal: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: Colors.textLight, marginBottom: 20, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
})
