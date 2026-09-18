import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, BORDER_RADIUS, FONTS } from '@/lib/constants'

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  message?: string
}

// Matches the web EmptyState: gray-50 rounded chip, muted outline icon, small title.
export default function EmptyState({ icon = 'folder-open-outline', title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={24} color={Colors.neutralLight} />
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
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  title: {
    fontSize: 15,
    fontFamily: FONTS.semibold,
    color: Colors.text,
  },
  message: {
    fontSize: 13,
    color: Colors.neutralLight,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
})