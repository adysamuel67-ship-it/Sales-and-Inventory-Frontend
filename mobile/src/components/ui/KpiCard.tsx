import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, BORDER_RADIUS, SHADOW, FONTS, CHIP_COLORS } from '@/lib/constants'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: keyof typeof Ionicons.glyphMap
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'emerald'
  trend?: { value: string; positive: boolean }
  style?: StyleProp<ViewStyle>
}

// Matches the web KpiCard: bordered white card (rounded-2xl), colored icon chip,
// uppercase 11px label, bold value, tinted trend pill.
export default function KpiCard({ title, value, subtitle, icon, color = 'primary', trend, style }: KpiCardProps) {
  const chip = CHIP_COLORS[color]

  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: chip.bg }]}>
            <Ionicons name={icon} size={18} color={chip.text} />
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.value} numberOfLines={1}>{value}</Text>
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.positive ? Colors.successLight : Colors.dangerLight }]}>
            <Text style={[styles.trendText, { color: trend.positive ? Colors.success : Colors.danger }]}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </Text>
          </View>
        )}
      </View>
      {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    flex: 1,
    minWidth: '45%',
    ...SHADOW.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 11,
    color: Colors.neutralLight,
    fontFamily: FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
    color: Colors.text,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: 6,
  },
  trendText: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.neutralLight,
    marginTop: 8,
    marginLeft: 52,
  },
})