'use client'

import { memo, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface ChartDataPoint {
  day: string
  revenue: number
  profit: number
}

interface Props {
  data: ChartDataPoint[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const rev = payload[0]?.value ?? 0
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-sm">
      <p className="font-bold text-gray-900 mb-1">{label}</p>
      <p className="text-primary font-medium">
        Revenue: GH₵{rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export default memo(function FluctuationChart({ data }: Props) {
  const stats = useMemo(() => {
    if (!data.length) return { avg: 0, trend: 0, high: 0, low: 0, latest: 0, prevLatest: 0 }
    const revenues = data.map((d) => d.revenue)
    const total = revenues.reduce((a, b) => a + b, 0)
    const avg = total / revenues.length
    const high = Math.max(...revenues)
    const low = Math.min(...revenues)
    const latest = revenues[revenues.length - 1] ?? 0
    const prevLatest = revenues.length > 1 ? revenues[revenues.length - 2] : latest
    const trend = prevLatest > 0 ? ((latest - prevLatest) / prevLatest) * 100 : 0
    return { avg, trend, high, low, latest, prevLatest }
  }, [data])

  const enrichedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      avg: stats.avg,
    }))
  }, [data, stats.avg])

  if (!data.length) {
    return (
      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="mb-5">
          <h3 className="font-semibold text-gray-900">Revenue Fluctuations</h3>
          <p className="text-xs text-neutral-light mt-0.5">Daily revenue trend</p>
        </div>
        <div className="h-56 flex flex-col items-center justify-center text-neutral-light">
          <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-sm">No data to visualize fluctuations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-900">Revenue Fluctuations</h3>
          <p className="text-xs text-neutral-light mt-0.5">Daily revenue trend with average line</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
          stats.trend > 0 ? 'bg-emerald-50 text-emerald-700'
            : stats.trend < 0 ? 'bg-red-50 text-red-600'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {stats.trend > 0 ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          ) : stats.trend < 0 ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
            </svg>
          ) : null}
          {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}% vs yesterday
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surfaceAlt rounded-xl px-3 py-2">
          <p className="text-[10px] text-neutral-light uppercase tracking-wider">Average</p>
          <p className="text-sm font-bold text-gray-900">GH₵{stats.avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-surfaceAlt rounded-xl px-3 py-2">
          <p className="text-[10px] text-neutral-light uppercase tracking-wider">Highest</p>
          <p className="text-sm font-bold text-emerald-600">GH₵{stats.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-surfaceAlt rounded-xl px-3 py-2">
          <p className="text-[10px] text-neutral-light uppercase tracking-wider">Lowest</p>
          <p className="text-sm font-bold text-red-500">GH₵{stats.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={enrichedData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#2563EB', strokeWidth: 1, strokeDasharray: '4 4' }}
              wrapperStyle={{ outline: 'none' }}
            />
            <ReferenceLine
              y={stats.avg}
              stroke="#94A3B8"
              strokeDasharray="6 4"
              strokeWidth={1}
              label={{
                value: 'Avg',
                position: 'right',
                fill: '#94A3B8',
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563EB"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={data.length <= 14 ? { r: 3, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
