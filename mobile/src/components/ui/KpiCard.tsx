import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, BORDER_RADIUS, FONT_SIZE, SHADOW } from '@/lib/constants'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: keyof typeof Ionicons.glyphMap
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'emerald'
  trend?: { value: string; positive: boolean }
  style?: StyleProp<ViewStyle>
}

const colorMap: Record<NonNullable<KpiCardProps['color']>, { bg: string; text: string; accent: string }> = {
  primary: { bg: Colors.primaryLight, text: Colors.primary, accent: Colors.primary },
  success: { bg: Colors.successLight, text: Colors.success, accent: Colors.success },
  warning: { bg: Colors.warningLight, text: Colors.warning, accent: Colors.warning },
  danger: { bg: Colors.dangerLight, text: Colors.danger, accent: Colors.danger },
  purple: { bg: Colors.purpleLight, text: Colors.purple, accent: Colors.purple },
  emerald: { bg: Colors.emeraldLight, text: Colors.emerald, accent: Colors.emerald },
}

export default function KpiCard({ title, value, subtitle, icon, color = 'primary', trend, style }: KpiCardProps) {
  const colors = colorMap[color]

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
      <View style={styles.row}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colors.bg }]}>
            <Ionicons name={icon} size={18} color={colors.text} />
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
    padding: 14,
    flex: 1,
    minWidth: '45%',
    ...SHADOW.md,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 10,
    color: Colors.neutralLight,
    marginTop: 8,
    marginLeft: 52,
  },
})
