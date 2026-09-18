import React, { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Colors } from '@/lib/constants'

interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

// Subtle pulsing skeleton block — mirrors the web app's skeleton loaders.
export default function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: Colors.gray100, opacity }, style]}
    />
  )
}