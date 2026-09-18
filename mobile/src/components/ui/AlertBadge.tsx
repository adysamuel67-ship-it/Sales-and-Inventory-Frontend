import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, BORDER_RADIUS, FONTS } from '@/lib/constants'

interface AlertBadgeProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  style?: StyleProp<ViewStyle>
}

const iconMap = {
  success: 'checkmark-circle' as const,
  error: 'alert-circle' as const,
  warning: 'warning' as const,
  info: 'information-circle' as const,
}

const typeMap = {
  success: { bg: Colors.successLight, text: Colors.success, border: '#86EFAC' },
  error: { bg: Colors.dangerLight, text: Colors.danger, border: '#FECACA' },
  warning: { bg: Colors.warningLight, text: Colors.warning, border: '#FDE68A' },
  info: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
}

export default function AlertBadge({ message, type = 'info', style }: AlertBadgeProps) {
  const c = typeMap[type]
  if (!message) return null

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      <Ionicons name={iconMap[type]} size={17} color={c.text} style={styles.icon} />
      <Text style={[styles.text, { color: c.text }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: { fontSize: 13, fontFamily: FONTS.medium, flex: 1 },
})