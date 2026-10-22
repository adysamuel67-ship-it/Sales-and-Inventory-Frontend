'use client'

import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  start: string
  end: string
  onChange: (next: { start: string; end: string }) => void
  onApply: () => void
  onClose: () => void
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20'
const labelClass = 'mb-1 block text-[10px] font-medium text-slate-500'

/**
 * Date-range picker with two presentations.
 *
 * On desktop it is a small popover anchored to the "Custom" trigger. On phones
 * that popover could open past the bottom of the viewport, leaving the inputs
 * and Apply button off-screen and impossible to reach. Small screens therefore
 * get a bottom sheet rendered in a portal, so it always sits inside the safe
 * area above the on-screen keyboard/home indicator.
 */
export default function DateRangePicker({ start, end, onChange, onApply, onClose }: Props) {
  const baseId = useId()

  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  const fields = (suffix: string) => (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label htmlFor={`${baseId}-from-${suffix}`} className={labelClass}>
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
        <label htmlFor={`${baseId}-to-${suffix}`} className={labelClass}>
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
  )

  const sheet = (
    <div className="fixed inset-0 z-[60] sm:hidden" role="dialog" aria-modal="true" aria-labelledby={`${baseId}-sheet-title`} data-testid="date-range-sheet">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 id={`${baseId}-sheet-title`} className="font-semibold text-slate-900">
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

        <div className="space-y-3">
          <div>
            <label htmlFor={`${baseId}-from-mobile`} className="mb-1 block text-xs font-medium text-slate-700">
              From
            </label>
            <input
              id={`${baseId}-from-mobile`}
              type="date"
              value={start}
              onChange={(e) => onChange({ start: e.target.value, end })}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor={`${baseId}-to-mobile`} className="mb-1 block text-xs font-medium text-slate-700">
              To
            </label>
            <input
              id={`${baseId}-to-mobile`}
              type="date"
              value={end}
              onChange={(e) => onChange({ start, end: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-11 flex-1 rounded-xl bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="absolute left-0 top-full z-50 mt-2 hidden w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:block" data-testid="date-range-popover">
        {fields('desktop')}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Apply
          </button>
        </div>
      </div>

      {typeof document !== 'undefined' ? createPortal(sheet, document.body) : null}
    </>
  )
}
