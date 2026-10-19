'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** Positioning and sizing for the white panel, e.g. "w-full max-w-sm p-6". */
  panelClassName?: string
  /** Set false while a submit is in flight so a stray backdrop click cannot discard work. */
  closeOnOverlay?: boolean
  /** Use "alertdialog" for destructive confirmations that interrupt the user. */
  role?: 'dialog' | 'alertdialog'
  'aria-labelledby'?: string
}

/**
 * Shared modal shell: closes on Escape and backdrop click, traps focus while
 * open, restores it on close, and locks background scroll. Inner panels must
 * not need their own stopPropagation — clicks inside are absorbed here.
 */
export default function Modal({
  onClose,
  children,
  panelClassName = '',
  closeOnOverlay = true,
  role = 'dialog',
  'aria-labelledby': ariaLabelledBy,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={`relative bg-white rounded-2xl shadow-xl outline-none ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
