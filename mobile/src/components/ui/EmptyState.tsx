import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, BORDER_RADIUS } from '@/lib/constants'

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  message?: string
}

export default function EmptyState({ icon = 'folder-open-outline', title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={26} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 200,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xxxl,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '22',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  message: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
})
