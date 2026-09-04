import React from 'react'
import { useState } from 'react'
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg'
import { GRADIENTS } from '@/lib/constants'

interface GradientHeroProps {
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
  gradient?: readonly [string, string, string]
  height?: number
  topInset?: number
  bubbles?: boolean
}

// Full-bleed brand-gradient hero banner. Uses react-native-svg for the
// gradient so it renders in Expo Go without any extra native dependency.
export default function GradientHero({
  children,
  style,
  gradient = GRADIENTS.primary,
  height = 190,
  topInset = 48,
  bubbles = true,
}: GradientHeroProps) {
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const { w: W, h: H } = dims

  return (
    <View
      style={[styles.wrap, { height: height + topInset, paddingTop: topInset }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout
        setDims({ w: width, h: height })
      }}
    >
      {W > 0 && H > 0 && (
        <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={gradient[0]} />
              <Stop offset="55%" stopColor={gradient[1]} />
              <Stop offset="100%" stopColor={gradient[2]} />
            </LinearGradient>
          </Defs>
          <Rect width={W} height={H} fill="url(#heroGrad)" />
          {bubbles && (
            <>
              <Circle cx={W - 40} cy={-10} r={90} fill="#FFFFFF" fillOpacity={0.08} />
              <Circle cx={-30} cy={H - 40} r={80} fill="#FFFFFF" fillOpacity={0.06} />
              <Circle cx={W * 0.65} cy={20} r={40} fill="#FFFFFF" fillOpacity={0.05} />
              <Circle cx={W * 0.1} cy={H + 10} r={56} fill="#FFFFFF" fillOpacity={0.05} />
            </>
          )}
        </Svg>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
  },
})
