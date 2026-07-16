'use client'

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
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-sm">
        <p className="font-bold text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {entry.name}: GH₵{entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function RevenueChart({ data }: Props) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
          <p className="text-xs text-neutral-light mt-0.5">Revenue by day</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-light">
            <span className="w-3 h-3 rounded-sm bg-primary" />
            Revenue
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-light">
            <span className="w-3 h-3 rounded-sm bg-success" />
            Profit
          </div>
        </div>
      </div>
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(26, 86, 219, 0.05)' }} />
              <Bar dataKey="revenue" fill="#1A56DB" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" fill="#057A55" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-light text-sm">
            No revenue data for this period
          </div>
        )}
      </div>
    </div>
  )
}
