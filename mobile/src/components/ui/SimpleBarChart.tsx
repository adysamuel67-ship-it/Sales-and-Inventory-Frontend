import React from 'react'
import { View, Text, Dimensions, StyleSheet } from 'react-native'
import Svg, { Rect, Line, G, Text as SvgText } from 'react-native-svg'
import { Colors, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'

const SCREEN_WIDTH = Dimensions.get('window').width

interface BarDataPoint {
  y: number
  label?: string
}

interface SimpleBarChartProps {
  data: BarDataPoint[]
  height?: number
  width?: number
  barColor?: string
  barRadius?: number
  showValues?: boolean
  showLabels?: boolean
}

export default function SimpleBarChart({
  data,
  height = 200,
  width = SCREEN_WIDTH - 64,
  barColor = Colors.primary,
  barRadius = 6,
  showValues = true,
  showLabels = true,
}: SimpleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    )
  }

  const padding = { top: 24, right: 12, bottom: showLabels ? 28 : 8, left: 48 }
  const chartWidth = width
  const chartHeight = height - padding.top - padding.bottom

  const yValues = data.map((d) => d.y)
  const yMax = Math.max(...yValues)
  const yRange = yMax || 1

  const scaleY = (y: number) =>
    padding.top + chartHeight - (y / yRange) * chartHeight

  const barGap = Math.max(4, Math.min(12, (chartWidth - padding.left - padding.right) * 0.06))
  const totalBars = data.length
  const availWidth = chartWidth - padding.left - padding.right
  const barWidth = Math.min(32, Math.max(8, (availWidth - barGap * (totalBars + 1)) / totalBars))

  const totalBarsWithGaps = barWidth * totalBars + barGap * (totalBars + 1)
  const offsetX = padding.left + (availWidth - totalBarsWithGaps) / 2

  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (yRange * i) / yTicks)

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

        {data.map((d, i) => {
          const x = offsetX + barGap + i * (barWidth + barGap)
          const barH = (d.y / yRange) * chartHeight
          const y = padding.top + chartHeight - barH
          const isMax = d.y === yMax && d.y > 0
          const fill = isMax ? Colors.primary : `${barColor}CC`

          return (
            <G key={`bar-${i}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 2)}
                rx={barRadius}
                ry={barRadius}
                fill={fill}
                opacity={isMax ? 1 : 0.7}
              />
              {isMax && (
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 2)}
                  rx={barRadius}
                  ry={barRadius}
                  fill="none"
                  stroke={Colors.primaryDark}
                  strokeWidth={1.5}
                />
              )}
              {showValues && barH > 16 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="700"
                  fill="#FFFFFF"
                >
                  {d.y >= 1000 ? `${(d.y / 1000).toFixed(1)}k` : String(Math.round(d.y))}
                </SvgText>
              )}
              {showValues && barH <= 16 && barH > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="600"
                  fill={Colors.textLight}
                >
                  {d.y >= 1000 ? `${(d.y / 1000).toFixed(1)}k` : String(Math.round(d.y))}
                </SvgText>
              )}
              {showLabels && d.label && (
                <SvgText
                  x={x + barWidth / 2}
                  y={padding.top + chartHeight + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill={Colors.textLight}
                >
                  {d.label}
                </SvgText>
              )}
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textLight, fontSize: FONT_SIZE.sm },
})
