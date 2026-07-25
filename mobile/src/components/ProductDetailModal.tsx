import React from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'

interface Product {
  product_id: number
  id?: number
  name: string
  price: number
  cost_price: number
  quantity: number
  unit?: string
  low_stock_threshold?: number
  category?: string
  description?: string
  sku?: string
  created_at?: string
  updated_at?: string
}

interface Props {
  product: Product
  visible: boolean
  onClose: () => void
}

export default function ProductDetailModal({ product, visible, onClose }: Props) {
  const margin =
    product.price > 0 && product.cost_price > 0
      ? (((product.price - product.cost_price) / product.price) * 100).toFixed(1)
      : null
  const isLowStock = product.quantity <= (product.low_stock_threshold ?? 10)
  const isOutOfStock = product.quantity === 0

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Product Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.productHeader}>
              <View style={styles.productIcon}>
                <Ionicons name="cube-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                {product.sku && (
                  <Text style={styles.sku}>SKU: {product.sku}</Text>
                )}
              </View>
              {isOutOfStock ? (
                <View style={[styles.statusBadge, { backgroundColor: Colors.dangerLight }]}>
                  <Text style={[styles.statusBadgeText, { color: Colors.danger }]}>Out of Stock</Text>
                </View>
              ) : isLowStock ? (
                <View style={[styles.statusBadge, { backgroundColor: Colors.warningLight }]}>
                  <Text style={[styles.statusBadgeText, { color: Colors.warning }]}>Low Stock</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: Colors.successLight }]}>
                  <Text style={[styles.statusBadgeText, { color: Colors.success }]}>In Stock</Text>
                </View>
              )}
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Selling Price</Text>
                <Text style={styles.priceValue}>GH₵{Number(product.price).toFixed(2)}</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Cost Price</Text>
                <Text style={styles.priceValue}>GH₵{Number(product.cost_price).toFixed(2)}</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Margin</Text>
                <Text style={styles.priceValue}>{margin !== null ? `${margin}%` : '—'}</Text>
              </View>
            </View>

            <View style={styles.stockRow}>
              <View style={styles.stockCard}>
                <Text style={styles.stockLabel}>Stock Quantity</Text>
                <View style={styles.stockValueRow}>
                  <Text style={styles.stockValue}>{product.quantity}</Text>
                  <Text style={styles.stockUnit}>{product.unit || 'units'}</Text>
                </View>
                {isLowStock && !isOutOfStock && (
                  <Text style={styles.thresholdWarning}>
                    Below threshold ({product.low_stock_threshold ?? 10})
                  </Text>
                )}
              </View>
              <View style={styles.stockCard}>
                <Text style={styles.stockLabel}>Category</Text>
                <Text style={styles.categoryText}>{product.category || 'Uncategorized'}</Text>
              </View>
            </View>

            {product.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <View style={styles.descBox}>
                  <Text style={styles.descText}>{product.description}</Text>
                </View>
              </View>
            )}

            <View style={styles.metaSection}>
              {product.created_at && (
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.textLight} />
                  <Text style={styles.metaText}>Added {formatDate(product.created_at)}</Text>
                </View>
              )}
              {product.updated_at && (
                <View style={styles.metaRow}>
                  <Ionicons name="refresh-outline" size={16} color={Colors.textLight} />
                  <Text style={styles.metaText}>Updated {formatDate(product.updated_at)}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeFooter} onPress={onClose}>
            <Text style={styles.closeFooterText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  container: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text },
  closeBtn: { padding: SPACING.xs },
  scrollContent: { padding: SPACING.lg },
  productHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.lg },
  productIcon: {
    width: 48, height: 48, borderRadius: BORDER_RADIUS.lg, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text },
  sku: { fontSize: FONT_SIZE.xs, color: Colors.textLight, fontFamily: 'monospace', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  statusBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  priceRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  priceCard: {
    flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    alignItems: 'center',
  },
  priceLabel: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginBottom: 4 },
  priceValue: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: Colors.text },
  stockRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  stockCard: {
    flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
  },
  stockLabel: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginBottom: 4 },
  stockValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  stockValue: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: Colors.text },
  stockUnit: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  thresholdWarning: { fontSize: FONT_SIZE.xs, color: Colors.warning, marginTop: 4 },
  categoryText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text, marginTop: 4 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  descBox: { backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md },
  descText: { fontSize: FONT_SIZE.md, color: Colors.text, lineHeight: 22 },
  metaSection: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    gap: SPACING.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  metaText: { fontSize: FONT_SIZE.sm, color: Colors.text, flex: 1 },
  closeFooter: {
    paddingVertical: SPACING.md, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, alignItems: 'center',
  },
  closeFooterText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.textLight },
})
