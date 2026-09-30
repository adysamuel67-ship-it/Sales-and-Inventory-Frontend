'use client'

import { memo } from 'react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'danger'
  trend?: { value: string; positive: boolean }
  /** Renders a shimmering placeholder instead of a value while data loads. */
  loading?: boolean
  /** Compact variant used inside dense panels and narrow columns. */
  dense?: boolean
}

// Tinted plate + matching icon. Desaturated on purpose: a KPI row is four
// colours at once, so they must stay quieter than a CTA.
const colorMap = {
  primary: { plate: 'bg-blue-50 text-blue-600', bar: 'bg-primary' },
  success: { plate: 'bg-emerald-50 text-emerald-600', bar: 'bg-success' },
  warning: { plate: 'bg-amber-50 text-amber-600', bar: 'bg-warning' },
  danger: { plate: 'bg-rose-50 text-rose-600', bar: 'bg-danger' },
}

function TrendChip({ value, positive }: { value: string; positive: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
        positive
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-rose-50 text-rose-700 ring-rose-600/20'
      }`}
    >
      <svg
        className={`h-3 w-3 ${positive ? 'rotate-0' : 'rotate-180'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {value}
    </span>
  )
}

export default memo(function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  loading = false,
  dense = false,
}: KpiCardProps) {
  const styles = colorMap[color]

  return (
    <div
      className={`kpi-card group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card ${
        dense ? 'p-4' : 'p-4 sm:p-5'
      }`}
    >
      {/* Hairline accent bar ties the card to its metric colour without adding
          another filled shape competing with the number. */}
      <span
        className={`absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${styles.bar}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          {/* Uppercase micro-label: reads as a category, not as content. */}
          <p className="truncate text-micro uppercase tracking-[0.06em] text-neutral-light">{title}</p>

          {loading ? (
            <div className="mt-2.5 space-y-2">
              <div className="skeleton h-7 w-24 sm:h-8" />
            </div>
          ) : (
            /* Currency values like "GH₵24,580" are far wider than a phone-width
               grid cell, so the type scales down below `sm` and is allowed to
               wrap. `tabular-nums` keeps the columns aligned when it does. */
            <p
              className={`mt-1.5 break-words font-display font-bold leading-tight tracking-tight text-slate-900 tabular-nums ${
                dense
                  ? 'text-lg sm:text-xl'
                  : 'text-xl sm:text-2xl lg:text-kpi'
              }`}
            >
              {value}
            </p>
          )}
        </div>

        <div
          className={`flex shrink-0 items-center justify-center rounded-xl ${styles.plate} ${
            dense ? 'h-8 w-8 sm:h-9 sm:w-9' : 'h-9 w-9 sm:h-10 sm:w-10'
          }`}
        >
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
          {trend && !loading && <TrendChip value={trend.value} positive={trend.positive} />}
          {subtitle &&
            (loading ? (
              <div className="skeleton h-3 w-24" />
            ) : (
              <p className="truncate text-xs text-neutral-light">{subtitle}</p>
            ))}
        </div>
      )}
    </div>
  )
})