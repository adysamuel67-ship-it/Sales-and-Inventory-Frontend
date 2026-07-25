import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native'
import { Colors, BORDER_RADIUS } from '@/lib/constants'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: TextStyle
  icon?: React.ReactNode
}

export default function Button({
  title, onPress, variant = 'primary', size = 'md', loading, disabled, style, textStyle, icon,
}: ButtonProps) {
  const bgColor =
    variant === 'primary' ? Colors.primary
    : variant === 'danger' ? Colors.danger
    : variant === 'success' ? Colors.success
    : variant === 'secondary' ? Colors.surfaceAlt
    : 'transparent'
  const txtColor =
    variant === 'primary' || variant === 'danger' || variant === 'success' ? '#FFFFFF'
    : variant === 'secondary' ? Colors.text
    : Colors.primary
  const borderColor =
    variant === 'outline' ? Colors.primary : 'transparent'
  const shadow =
    variant === 'primary' ? {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    } : {}

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        size === 'md' && styles.md,
        size === 'lg' && styles.lg,
        { backgroundColor: bgColor, borderColor, borderWidth: variant === 'outline' ? 1 : 0 },
        shadow,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={txtColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: txtColor }, size === 'sm' && styles.textSm, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    gap: 8,
  },
  sm: { paddingVertical: 10, paddingHorizontal: 20 },
  md: { paddingVertical: 14, paddingHorizontal: 24 },
  lg: { paddingVertical: 18, paddingHorizontal: 28 },
  text: { fontSize: 16, fontWeight: '600' },
  textSm: { fontSize: 14 },
  disabled: { opacity: 0.5 },
})
