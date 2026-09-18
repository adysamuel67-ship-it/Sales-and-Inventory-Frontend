import React, { useState } from 'react'
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native'
import { Colors, BORDER_RADIUS, FONTS } from '@/lib/constants'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: ViewStyle
}

// Web-style Field: label text-sm/medium gray-700, input rounded-lg border-gray-300
// with a primary focus ring.
export default function Input({ label, error, containerStyle, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.wrap, focused && styles.wrapFocused, error && styles.wrapError]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.neutralLight}
          onFocus={(e) => { setFocused(true); onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); onBlur?.(e) }}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: FONTS.medium, color: Colors.gray700, marginBottom: 6 },
  wrap: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BORDER_RADIUS.md,
  },
  wrapFocused: {
    borderColor: Colors.primary,
    ...({ shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 2 } as object),
  },
  wrapError: { borderColor: Colors.danger },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  error: { color: Colors.danger, fontSize: 12, marginTop: 5 },
})