import React from 'react'
import { View, Text, Dimensions, StyleSheet } from 'react-native'
import Svg, { Path, Circle, Line, G, Text as SvgText } from 'react-native-svg'
import { Colors, FONT_SIZE } from '@/lib/constants'

const SCREEN_WIDTH = Dimensions.get('window').width

interface ChartDataPoint {
  x: number
  y: number
  label?: string
}

interface SimpleLineChartProps {
  data: ChartDataPoint[]
  height?: number
  width?: number
  lineColor?: string
  fillColor?: string
  showDots?: boolean
}

export default function SimpleLineChart({
  data,
  height = 200,
  width = SCREEN_WIDTH - 64,
  lineColor = Colors.primary,
  fillColor = Colors.primaryLight,
  showDots = true,
}: SimpleLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    )
  }

  const padding = { top: 20, right: 16, bottom: 30, left: 48 }
  const chartWidth = width
  const chartHeight = height - padding.top - padding.bottom

  const yValues = data.map((d) => d.y)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)
  const yRange = yMax - yMin || 1

  const scaleX = (i: number) =>
    padding.left + (i / Math.max(data.length - 1, 1)) * (chartWidth - padding.left - padding.right)

  const scaleY = (y: number) =>
    padding.top + chartHeight - ((y - yMin) / yRange) * chartHeight

  const points = data.map((d, i) => ({ x: scaleX(i), y: scaleY(d.y) }))

  let pathData = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx1 = prev.x + (curr.x - prev.x) / 3
    const cpx2 = prev.x + (2 * (curr.x - prev.x)) / 3
    pathData += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`
  }

  const fillPathData =
    pathData +
    ` L ${points[points.length - 1].x} ${padding.top + chartHeight}` +
    ` L ${points[0].x} ${padding.top + chartHeight} Z`

  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange * i) / yTicks)

  const formatY = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
    return String(Math.round(val))
  }

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={height}>
        {yTickValues.map((val, i) => (
          <G key={`tick-${i}`}>
            <Line
              x1={padding.left}
              y1={scaleY(val)}
              x2={chartWidth - padding.right}
              y2={scaleY(val)}
              stroke={Colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
            <SvgText
              x={padding.left - 8}
              y={scaleY(val) + 4}
              textAnchor="end"
              fontSize={10}
              fill={Colors.textLight}
            >
              {formatY(val)}
            </SvgText>
          </G>
        ))}

        <Path d={fillPathData} fill={fillColor} opacity={0.5} />
        <Path d={pathData} fill="none" stroke={lineColor} strokeWidth={2} />

        {showDots &&
          points.map((pt, i) => (
            <Circle
              key={`dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill={Colors.surface}
              stroke={lineColor}
              strokeWidth={2}
            />
          ))}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textLight, fontSize: FONT_SIZE.sm },
})
