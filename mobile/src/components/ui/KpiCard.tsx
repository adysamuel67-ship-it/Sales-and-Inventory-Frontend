import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, BORDER_RADIUS, FONT_SIZE, SPACING } from '@/lib/constants'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: keyof typeof Ionicons.glyphMap
  color?: 'primary' | 'success' | 'warning' | 'danger'
  trend?: { value: string; positive: boolean }
  style?: StyleProp<ViewStyle>
}

const colorMap = {
  primary: {
    iconBg: '#EFF4FF',
    iconText: '#2563EB',
    border: '#DBEAFE',
  },
  success: {
    iconBg: '#DCFCE7',
    iconText: '#16A34A',
    border: '#BBF7D0',
  },
  warning: {
    iconBg: '#FEF3C7',
    iconText: '#D97706',
    border: '#FDE68A',
  },
  danger: {
    iconBg: '#FEE2E2',
    iconText: '#DC2626',
    border: '#FECDD3',
  },
}

export default function KpiCard({ title, value, subtitle, icon, color = 'primary', trend, style }: KpiCardProps) {
  const colors = colorMap[color]

  return (
    <View style={[styles.card, { borderColor: colors.border }, style]}>
      <View style={styles.row}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
            <Ionicons name={icon} size={20} color={colors.iconText} />
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.positive ? '#DCFCE7' : '#FEE2E2' }]}>
            <Text style={[styles.trendText, { color: trend.positive ? '#16A34A' : '#DC2626' }]}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </Text>
          </View>
        )}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 10,
    color: Colors.neutralLight,
    marginTop: 8,
    marginLeft: 52,
  },
})
