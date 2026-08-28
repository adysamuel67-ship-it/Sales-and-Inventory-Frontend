'use client'

import { memo } from 'react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'danger'
  trend?: { value: string; positive: boolean }
}

const colorMap = {
  primary: { iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
  success: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  warning: { iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  danger: { iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
}

export default memo(function KpiCard({ title, value, subtitle, icon, color, trend }: KpiCardProps) {
  const styles = colorMap[color]

  return (
    <div className="kpi-card bg-surface rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-neutral-light">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${styles.iconBg} ${styles.iconText} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {subtitle && !trend && <p className="text-xs text-neutral-light">{subtitle}</p>}
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md shrink-0 ${trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  )
})