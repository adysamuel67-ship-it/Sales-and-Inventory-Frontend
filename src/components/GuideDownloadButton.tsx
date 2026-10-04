'use client'

import { useState } from 'react'
import { buildPdf, downloadBlob } from '@/lib/pdf'
import { GUIDE_SECTIONS, GUIDE_FILENAME } from '@/lib/guideContent'
import { SITE_NAME } from '@/lib/site'

/**
 * Download button for the printable how-it-works guide.
 *
 * The PDF is assembled in the browser on click, so nothing is uploaded and no
 * server route is involved.
 */
export default function GuideDownloadButton({
  className = '',
  label = 'Download the guide (PDF)',
  compact = false,
}: {
  className?: string
  label?: string
  compact?: boolean
}) {
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState('')

  const handleDownload = () => {
    setBuilding(true)
    setError('')
    try {
      // Deferred a tick so the pressed state paints before the synchronous
      // layout work blocks the main thread.
      setTimeout(() => {
        try {
          const blob = buildPdf({
            title: 'How Business Bot GH works',
            subtitle:
              'A practical guide to sales, stock, debts and reminders. Written for shop owners.',
            sections: GUIDE_SECTIONS,
          })
          downloadBlob(blob, GUIDE_FILENAME)
        } catch {
          setError('Could not build the PDF. Please try again.')
        } finally {
          setBuilding(false)
        }
      }, 0)
    } catch {
      setBuilding(false)
      setError('Could not build the PDF. Please try again.')
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={building}
        className={`inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          compact
            ? 'border border-slate-200 bg-surface text-slate-700 hover:bg-surfaceAlt min-h-[44px] px-4'
            : 'bg-primary text-white hover:bg-primary-dark min-h-[44px] px-5'
        }`}
      >
        {building ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
        )}
        {building ? 'Preparing...' : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      {!compact && (
        <p className="mt-2 text-xs text-neutral-light">
          A {GUIDE_SECTIONS.length}-section PDF about {SITE_NAME}, generated on your device.
        </p>
      )}
    </div>
  )
}