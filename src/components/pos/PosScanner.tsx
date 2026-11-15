'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeBarcode } from '@/lib/barcode'
import { ScanGuard } from '@/lib/pos'
import { useBarcodeScanner } from '@/lib/useBarcodeScanner'
import Button from '@/components/ui/Button'
import CameraPermission from '@/components/permissions/CameraPermission'

interface Props {
  onScan: (barcode: string) => void
  /** Stops accepting scans while a sale is being submitted. */
  paused?: boolean
}

/**
 * Continuous POS scanner.
 *
 * Two input paths share one ScanGuard:
 *  - the native BarcodeDetector camera loop, which fires on every frame;
 *  - a keyboard-wedge/USB scanner, which types the barcode and presses Enter.
 *
 * The guard ensures one physical presentation produces exactly one accepted
 * scan, however many times the camera sees the barcode.
 */
export default function PosScanner({ onScan, paused = false }: Props) {
  const [manual, setManual] = useState('')
  const [hint, setHint] = useState('')

  const guardRef = useRef(new ScanGuard())
  const pausedRef = useRef(paused)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const emit = useCallback((raw: string): boolean => {
    if (pausedRef.current) return false
    const code = normalizeBarcode(raw)
    if (!code) return false

    if (!guardRef.current.accept(code)) {
      setHint('Already scanned. Move the barcode away before scanning it again.')
      return false
    }

    setHint('')
    onScanRef.current(code)
    return true
  }, [])

  const {
    supported,
    cameraActive,
    cameraError,
    permissionStatus,
    videoRef,
    startCamera,
    stopCamera,
  } = useBarcodeScanner({
    onDetected: emit,
    onFrame: () => guardRef.current.prune(),
    autoStart: true,
    enabled: !paused,
  })

  // Keyboard-wedge scanners type into whatever has focus. A global listener
  // catches scans when focus is not in a form field; the manual input below
  // handles scans when it is.
  useEffect(() => {
    let buffer = ''
    let lastKeyAt = 0

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return

      if (event.key === 'Enter') {
        if (buffer.length >= 4) {
          event.preventDefault()
          emit(buffer)
        }
        buffer = ''
        return
      }

      if (event.key.length !== 1) return
      const now = Date.now()
      if (now - lastKeyAt > 120) buffer = ''
      buffer += event.key
      lastKeyAt = now
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [emit])

  const submitManual = (event: React.FormEvent) => {
    event.preventDefault()
    if (paused) return
    emit(manual)
    setManual('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${cameraActive ? 'animate-pulse bg-success' : 'bg-slate-300'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {cameraActive ? 'Scanner active' : supported ? 'Scanner ready' : 'External scanner ready'}
          </span>
        </div>
        {supported && (
          <Button
            size="sm"
            variant={cameraActive ? 'secondary' : 'outline'}
            onClick={
              cameraActive
                ? stopCamera
                : () => {
                    setHint('')
                    void startCamera()
                  }
            }
          >
            {cameraActive ? 'Stop camera' : permissionStatus === 'granted' ? 'Start camera' : 'Enable camera'}
          </Button>
        )}
      </div>

      <div className={cameraActive ? 'relative overflow-hidden rounded-xl border border-slate-300 bg-slate-900' : 'hidden'}>
        <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline autoPlay />
        <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/80" />
        <span className="absolute inset-x-0 bottom-3 text-center text-xs font-medium text-white/90">
          Keep the barcode inside the frame
        </span>
      </div>

      <CameraPermission
        supported={supported}
        status={permissionStatus}
        error={cameraError}
        onRetry={startCamera}
        fallback="Camera scanning is not available in this browser. A USB/Bluetooth scanner works anywhere, or type the barcode below."
      />

      <form onSubmit={submitManual} className="space-y-2">
        <label htmlFor="pos-barcode" className="block text-xs font-medium text-slate-700">
          Scan or type a barcode
        </label>
        <div className="flex gap-2">
          <input
            id="pos-barcode"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="Barcode"
            autoComplete="off"
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <Button type="submit" disabled={paused || !manual.trim()}>
            Add
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-neutral-light">
          Keep the scanner pointed at products. Each accepted scan adds one unit to the current sale.
        </p>
      </form>

      {hint && <p className="text-xs font-medium text-warning">{hint}</p>}
    </div>
  )
}
