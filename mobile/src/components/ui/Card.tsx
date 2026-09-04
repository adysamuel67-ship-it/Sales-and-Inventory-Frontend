import React from 'react'
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Colors, BORDER_RADIUS, SHADOW } from '@/lib/constants'

interface CardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  padding?: number
  outlined?: boolean
  flat?: boolean
}

export default function Card({ children, style, padding = 16, outlined = false, flat = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding },
        outlined && styles.outlined,
        flat && styles.flat,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.xxl,
    ...SHADOW.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...SHADOW.sm,
  },
  flat: {
    elevation: 0,
    shadowOpacity: 0,
  },
})
