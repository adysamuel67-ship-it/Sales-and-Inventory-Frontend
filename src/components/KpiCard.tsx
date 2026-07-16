'use client'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  color: 'primary' | 'success' | 'warning' | 'danger'
  trend?: { value: string; positive: boolean }
}

const colorMap = {
  primary: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    gradient: 'from-blue-50 to-white',
    ring: 'ring-blue-100',
  },
  success: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    gradient: 'from-emerald-50 to-white',
    ring: 'ring-emerald-100',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    gradient: 'from-amber-50 to-white',
    ring: 'ring-amber-100',
  },
  danger: {
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    gradient: 'from-rose-50 to-white',
    ring: 'ring-rose-100',
  },
}

export default function KpiCard({ title, value, subtitle, icon, color, trend }: KpiCardProps) {
  const styles = colorMap[color]

  return (
    <div className={`kpi-card bg-gradient-to-br ${styles.gradient} rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow ring-1 ${styles.ring}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${styles.iconBg} ${styles.iconText} flex items-center justify-center text-lg shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        </div>
        {trend && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${trend.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[10px] text-gray-400 mt-2 pl-[52px]">{subtitle}</p>}
    </div>
  )
}
