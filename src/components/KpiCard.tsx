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
  primary: {
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    border: 'border-blue-100/80',
  },
  success: {
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    border: 'border-emerald-100/80',
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    border: 'border-amber-100/80',
  },
  danger: {
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-600',
    border: 'border-rose-100/80',
  },
}

export default memo(function KpiCard({ title, value, subtitle, icon, color, trend }: KpiCardProps) {
  const styles = colorMap[color]

  return (
    <div className={`kpi-card bg-white rounded-xl p-4 border ${styles.border} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${styles.iconBg} ${styles.iconText} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold text-gray-900 truncate mt-0.5">{value}</p>
        </div>
        {trend && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[10px] text-gray-400 mt-2 pl-[52px]">{subtitle}</p>}
    </div>
  )
})
