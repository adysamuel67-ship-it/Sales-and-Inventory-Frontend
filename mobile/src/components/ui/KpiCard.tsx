import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/lib/constants'

interface KpiCardProps {
  title: string
  value: string
  icon?: keyof typeof Ionicons.glyphMap
  color?: string
  style?: StyleProp<ViewStyle>
}

export default function KpiCard({ title, value, icon, color = Colors.primary, style }: KpiCardProps) {
  return (
    <View style={[styles.card, style]}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 12, color: Colors.textLight, fontWeight: '500', marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '700', color: Colors.text },
})
