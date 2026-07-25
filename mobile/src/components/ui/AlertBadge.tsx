import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, BORDER_RADIUS } from '@/lib/constants'

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

export default function AlertBadge({ message, type = 'info', style }: AlertBadgeProps) {
  const bgColor =
    type === 'success' ? Colors.successLight
    : type === 'error' ? Colors.dangerLight
    : type === 'warning' ? Colors.warningLight
    : Colors.primaryLight
  const textColor =
    type === 'success' ? Colors.success
    : type === 'error' ? Colors.danger
    : type === 'warning' ? Colors.warning
    : Colors.primary

  if (!message) return null

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <Ionicons name={iconMap[type]} size={16} color={textColor} style={styles.icon} />
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: 12,
  },
  icon: {
    marginRight: 8,
  },
  text: { fontSize: 14, fontWeight: '500', flex: 1 },
})
