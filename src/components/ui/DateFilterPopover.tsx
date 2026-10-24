'use client'

import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

export interface DatePreset {
  label: string
  value: number | 'all'
}

interface Props {
  presets: DatePreset[]
  activePreset: number | 'all'
  onPreset: (value: number | 'all') => void
  start: string
  end: string
  onChange: (next: { start: string; end: string }) => void
  onApply: () => void
  onClose: () => void
}

const presetClass = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
    active ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20'

/**
 * Custom date-range filter.
 *
 * The anchor popover is fine on a laptop, but when the viewport is resized to a
 * phone it either runs off the edge or sits under the page chrome, leaving the
 * date fields unreadable and impossible to edit. Phones therefore get a portal
 * bottom sheet, which is always fully inside the viewport and above the bottom
 * navigation.
 */
export default function DateFilterPopover({
  presets,
  activePreset,
  onPreset,
  start,
  end,
  onChange,
  onApply,
  onClose,
}: Props) {
  const baseId = useId()

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 639px)').matches) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const panel = (suffix: string) => (
    <>
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-light">
        Quick Select
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onPreset(preset.value)}
            className={presetClass(activePreset === preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-light">
        Custom Range
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${baseId}-from-${suffix}`}
            className="mb-1 block text-[11px] font-medium text-slate-600"
          >
            From
          </label>
          <input
            id={`${baseId}-from-${suffix}`}
            type="date"
            value={start}
            onChange={(e) => onChange({ start: e.target.value, end })}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${baseId}-to-${suffix}`}
            className="mb-1 block text-[11px] font-medium text-slate-600"
          >
            To
          </label>
          <input
            id={`${baseId}-to-${suffix}`}
            type="date"
            value={end}
            onChange={(e) => onChange({ start, end: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 flex-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          className="h-10 flex-1 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Apply
        </button>
      </div>
    </>
  )

  const sheet = (
    <div
      className="fixed inset-0 z-[70] sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${baseId}-title`}
      data-testid="date-filter-sheet"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 id={`${baseId}-title`} className="font-semibold text-slate-900">
              Filter by date
            </h3>
            <p className="mt-0.5 text-xs text-neutral-light">Choose the period you want to see.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close date filter"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-light transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {panel('mobile')}
      </div>
    </div>
  )

  return (
    <>
      <div
        className="absolute left-0 top-full z-50 mt-2 hidden w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:block sm:left-auto sm:right-0"
        data-testid="date-filter-popover"
      >
        {panel('desktop')}
      </div>

      {typeof document !== 'undefined' ? createPortal(sheet, document.body) : null}
    </>
  )
}
