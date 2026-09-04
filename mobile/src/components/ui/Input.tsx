import React, { useState } from 'react'
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native'
import { Colors, BORDER_RADIUS } from '@/lib/constants'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: ViewStyle
}

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
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 7 },
  wrap: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg,
    ...({ shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 } as object),
  },
  wrapFocused: {
    borderColor: Colors.primary,
    ...({ shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 } as object),
  },
  wrapError: { borderColor: Colors.danger },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.text,
  },
  error: { color: Colors.danger, fontSize: 12, marginTop: 5 },
})
