import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Colors } from '@/lib/constants'

interface AlertBadgeProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  style?: StyleProp<ViewStyle>
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
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  text: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
})
