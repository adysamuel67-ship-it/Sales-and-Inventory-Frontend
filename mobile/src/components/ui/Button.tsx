import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native'
import { Colors, BORDER_RADIUS, SHADOW } from '@/lib/constants'

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
    : variant === 'secondary' ? Colors.primaryLight
    : 'transparent'
  const txtColor =
    variant === 'primary' || variant === 'danger' || variant === 'success' ? '#FFFFFF'
    : variant === 'secondary' ? Colors.primary
    : Colors.primary
  const borderColor = variant === 'outline' ? Colors.primary : 'transparent'
  const shadow =
    variant === 'primary' ? { ...SHADOW.lg, shadowColor: Colors.primary, shadowOpacity: 0.3, elevation: 5 }
    : variant === 'danger' ? { ...SHADOW.lg, shadowColor: Colors.danger, shadowOpacity: 0.25, elevation: 4 }
    : variant === 'success' ? { ...SHADOW.lg, shadowColor: Colors.success, shadowOpacity: 0.25, elevation: 4 }
    : {}

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        size === 'md' && styles.md,
        size === 'lg' && styles.lg,
        { backgroundColor: bgColor, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0 },
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
    borderRadius: BORDER_RADIUS.full,
    gap: 8,
  },
  sm: { paddingVertical: 10, paddingHorizontal: 20 },
  md: { paddingVertical: 15, paddingHorizontal: 26 },
  lg: { paddingVertical: 18, paddingHorizontal: 30 },
  text: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  textSm: { fontSize: 14 },
  disabled: { opacity: 0.5 },
})
