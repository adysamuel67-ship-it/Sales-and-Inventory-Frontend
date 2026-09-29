'use client'

import { memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartDataPoint {
  day: string
  revenue: number
  profit: number
}

interface Props {
  data: ChartDataPoint[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-sm shadow-lg backdrop-blur">
        <p className="mb-1.5 font-semibold text-slate-900">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
            {entry.name}: GH₵{(entry.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default memo(function RevenueChart({ data }: Props) {
  return (
    <section className="surface-card h-full p-5">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-section-title text-slate-900">Revenue Overview</h2>
          <p className="mt-0.5 text-xs text-neutral-light">Revenue by day</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-light">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Revenue
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-light">
            <span className="h-2.5 w-2.5 rounded-sm bg-success" />
            Profit
          </div>
        </div>
      </header>
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                wrapperStyle={{ outline: 'none' }}
              />
              <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" fill="#059669" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
              <svg className="h-5 w-5 text-neutral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-light">No revenue data for this period</p>
          </div>
        )}
      </div>
    </section>
  )
})
