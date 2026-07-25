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
import { formatPayment } from '@/lib/utils'
import type { MappedSale } from '@/lib/utils'

interface Props {
  sale: MappedSale
  visible: boolean
  onClose: () => void
}

const paymentColorMap: Record<string, { bg: string; color: string }> = {
  cash: { bg: Colors.successLight, color: Colors.success },
  mobile_money: { bg: Colors.primaryLight, color: Colors.primary },
  card: { bg: Colors.warningLight, color: Colors.warning },
}

export default function SaleDetailModal({ sale, visible, onClose }: Props) {
  const isPartial = sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0
  const balance = sale.amount - (sale.amount_paid ?? sale.amount)
  const paymentStyle = paymentColorMap[sale.payment] || { bg: Colors.surfaceAlt, color: Colors.textLight }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Sale Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.saleHeader}>
              <View style={styles.saleIcon}>
                <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.saleId}>Sale #{sale.id}</Text>
                {isPartial ? (
                  <Text style={styles.balanceAmount}>
                    GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <Text style={styles.balanceLabel}> remaining</Text>
                  </Text>
                ) : (
                  <Text style={styles.totalAmount}>
                    GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Payment Method</Text>
                <View style={[styles.paymentBadge, { backgroundColor: paymentStyle.bg }]}>
                  <Text style={[styles.paymentBadgeText, { color: paymentStyle.color }]}>
                    {formatPayment(sale.payment)}
                  </Text>
                </View>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Status</Text>
                {isPartial ? (
                  <View style={[styles.paymentBadge, { backgroundColor: Colors.warningLight }]}>
                    <Text style={[styles.paymentBadgeText, { color: Colors.warning }]}>Partial</Text>
                  </View>
                ) : (
                  <View style={[styles.paymentBadge, { backgroundColor: Colors.successLight }]}>
                    <Text style={[styles.paymentBadgeText, { color: Colors.success }]}>Fully Paid</Text>
                  </View>
                )}
              </View>
            </View>

            {isPartial && (
              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>Payment Progress</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, ((sale.amount_paid ?? 0) / sale.amount) * 100)}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.paidText}>
                    GH₵{(sale.amount_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} paid
                  </Text>
                  <Text style={styles.remainingText}>
                    GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining
                  </Text>
                </View>
              </View>
            )}

            {(sale.customer_name || sale.customer_phone || sale.customer_email) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customer</Text>
                <View style={styles.customerCard}>
                  {sale.customer_name && (
                    <View style={styles.customerRow}>
                      <View style={styles.customerAvatar}>
                        <Text style={styles.customerAvatarText}>
                          {sale.customer_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.customerName}>{sale.customer_name}</Text>
                    </View>
                  )}
                  {sale.customer_phone && (
                    <View style={styles.customerDetailRow}>
                      <Ionicons name="call-outline" size={14} color={Colors.textLight} />
                      <Text style={styles.customerDetailText}>{sale.customer_phone}</Text>
                    </View>
                  )}
                  {sale.customer_email && (
                    <View style={styles.customerDetailRow}>
                      <Ionicons name="mail-outline" size={14} color={Colors.textLight} />
                      <Text style={styles.customerDetailText}>{sale.customer_email}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {sale.sold_by_name && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sold By</Text>
                <View style={styles.customerRow}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>
                      {sale.sold_by_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.customerName}>{sale.sold_by_name}</Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items</Text>
              {sale.sales_items && sale.sales_items.length > 0 ? (
                sale.sales_items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.product_name || item.name || 'Unknown Product'}
                      </Text>
                      <Text style={styles.itemQty}>× {item.quantity}</Text>
                    </View>
                    {item.unit_price != null && (
                      <Text style={styles.itemSubtotal}>
                        GH₵{(Number(item.unit_price) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{sale.product}</Text>
                    <Text style={styles.itemQty}>× {sale.qty}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Sale Amount</Text>
                <Text style={styles.summaryValue}>
                  GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              {sale.amount_paid != null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount Paid</Text>
                  <Text style={[styles.summaryValue, { color: Colors.success }]}>
                    GH₵{sale.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
              {isPartial && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Outstanding Balance</Text>
                  <Text style={[styles.summaryValue, { color: Colors.danger }]}>
                    GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.metaSection}>
              {sale.time && (
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.textLight} />
                  <Text style={styles.metaText}>{sale.time}</Text>
                </View>
              )}
              {sale.note && (
                <View style={styles.metaRow}>
                  <Ionicons name="chatbubble-outline" size={16} color={Colors.textLight} />
                  <Text style={styles.metaText}>{sale.note}</Text>
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
  saleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  saleIcon: {
    width: 48, height: 48, borderRadius: BORDER_RADIUS.lg, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  saleId: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  totalAmount: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: Colors.text },
  balanceAmount: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: Colors.danger },
  balanceLabel: { fontSize: FONT_SIZE.sm, fontWeight: '500', color: Colors.textLight },
  infoRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  infoCard: {
    flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
  },
  infoLabel: { fontSize: FONT_SIZE.xs, color: Colors.textLight, marginBottom: SPACING.xs },
  paymentBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  paymentBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  progressSection: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  progressLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.textLight, textTransform: 'uppercase', marginBottom: SPACING.sm },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.sm },
  progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  paidText: { fontSize: FONT_SIZE.xs, color: Colors.success, fontWeight: '600' },
  remainingText: { fontSize: FONT_SIZE.xs, color: Colors.danger, fontWeight: '600' },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  customerCard: { backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  customerAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  customerAvatarText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: Colors.primary },
  customerName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  customerDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerDetailText: { fontSize: FONT_SIZE.sm, color: Colors.textLight },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.xs,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.text },
  itemQty: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  itemSubtotal: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.text },
  summarySection: {
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: SPACING.md, marginBottom: SPACING.lg,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  summaryLabel: { fontSize: FONT_SIZE.sm, color: Colors.textLight },
  summaryValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: Colors.text },
  metaSection: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  metaText: { fontSize: FONT_SIZE.sm, color: Colors.text, flex: 1 },
  closeFooter: {
    paddingVertical: SPACING.md, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: Colors.surfaceAlt, borderRadius: BORDER_RADIUS.md, alignItems: 'center',
  },
  closeFooterText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.textLight },
})
