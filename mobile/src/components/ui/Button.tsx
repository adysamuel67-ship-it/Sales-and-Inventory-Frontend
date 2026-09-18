import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native'
import { Colors, BORDER_RADIUS, SHADOW, FONTS } from '@/lib/constants'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: TextStyle
  icon?: React.ReactNode
}

// Mirrors the web app's Button: rounded-lg (8px), medium weight, subtle primary glow.
export default function Button({
  title, onPress, variant = 'primary', size = 'md', loading, disabled, style, textStyle, icon,
}: ButtonProps) {
  const bgColor =
    variant === 'primary' ? Colors.primary
    : variant === 'danger' ? Colors.danger
    : variant === 'success' ? Colors.success
    : variant === 'secondary' ? Colors.surface
    : 'transparent'
  const txtColor =
    variant === 'primary' || variant === 'danger' || variant === 'success' ? '#FFFFFF'
    : variant === 'secondary' ? Colors.text
    : variant === 'ghost' ? Colors.gray600
    : Colors.primary
  const borderColor = variant === 'secondary' ? Colors.borderStrong : variant === 'outline' ? Colors.primary : 'transparent'
  const borderWidth = variant === 'secondary' || variant === 'outline' ? 1 : 0
  const shadow =
    variant === 'primary' ? SHADOW.primary
    : variant === 'danger' ? { ...SHADOW.primary, shadowColor: Colors.danger, shadowOpacity: 0.2 }
    : variant === 'success' ? { ...SHADOW.primary, shadowColor: Colors.success, shadowOpacity: 0.2 }
    : {}

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        size === 'md' && styles.md,
        size === 'lg' && styles.lg,
        { backgroundColor: bgColor, borderColor, borderWidth },
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
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
  },
  sm: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 },
  md: { paddingVertical: 11, paddingHorizontal: 18, minHeight: 42 },
  lg: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 48 },
  text: { fontSize: 15, fontFamily: FONTS.semibold, letterSpacing: 0.1 },
  textSm: { fontSize: 13 },
  disabled: { opacity: 0.5 },
})