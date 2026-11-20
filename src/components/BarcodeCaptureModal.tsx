'use client'

import { useRef, useState } from 'react'
import { normalizeBarcode } from '@/lib/barcode'
import { useBarcodeScanner } from '@/lib/useBarcodeScanner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import CameraPermission from '@/components/permissions/CameraPermission'
import { ScanIcon, XIcon } from '@/components/ui/Icons'

interface Props {
  initialValue?: string
  onClose: () => void
  onCapture: (barcode: string) => void
}

export default function BarcodeCaptureModal({ initialValue = '', onClose, onCapture }: Props) {
  const [barcode, setBarcode] = useState(initialValue)
  const [captured, setCaptured] = useState('')
  const captureRef = useRef<(raw: string) => void>(() => {})

  const {
    supported,
    cameraActive,
    cameraError,
    permissionStatus,
    videoRef,
    startCamera,
    stopCamera,
  } = useBarcodeScanner({
    onDetected: (raw) => captureRef.current(raw),
    stopOnDetect: true,
    autoStart: true,
  })

  const capture = (raw: string) => {
    const code = normalizeBarcode(raw)
    if (!code) return
    stopCamera()
    setBarcode(code)
    setCaptured(code)
  }

  captureRef.current = capture

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const code = normalizeBarcode(barcode)
    if (!code) return
    stopCamera()
    onCapture(code)
    onClose()
  }

  const useBarcode = () => {
    onCapture(normalizeBarcode(captured || barcode))
    onClose()
  }

  return (
    <Modal
      onClose={onClose}
      panelClassName="w-full max-w-md max-h-[90vh] overflow-y-auto"
      aria-labelledby="barcode-capture-title"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h3 id="barcode-capture-title" className="flex items-center gap-2 font-semibold text-slate-900">
            <ScanIcon className="h-5 w-5 text-primary" />
            Scan barcode
          </h3>
          <p className="mt-0.5 text-xs text-neutral-light">
            Point the camera at the barcode, or type the number printed below it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close barcode scanner"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
        >
          <XIcon className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className={cameraActive ? 'space-y-2' : 'hidden'}>
          <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-900">
            <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline autoPlay />
            <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/80" />
            <span className="absolute inset-x-0 bottom-2 text-center text-xs font-medium text-white/90">
              Align the barcode inside the frame
            </span>
          </div>
          <Button variant="secondary" size="sm" fullWidth onClick={stopCamera}>
            Stop camera
          </Button>
        </div>

        {supported && !cameraActive && !cameraError && permissionStatus !== 'granting' && (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            leftIcon={<ScanIcon className="h-4 w-4" />}
            onClick={startCamera}
          >
            {permissionStatus === 'denied' ? 'Try camera again' : 'Enable camera'}
          </Button>
        )}

        <CameraPermission
          supported={supported}
          status={permissionStatus}
          error={cameraError}
          onRetry={startCamera}
        />

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="barcode-capture-input" className="mb-1 block text-xs font-medium text-slate-700">
              Barcode
            </label>
            <input
              id="barcode-capture-input"
              value={barcode}
              onChange={(event) => {
                setBarcode(event.target.value)
                setCaptured('')
              }}
              placeholder="e.g. 5901234123457"
              autoFocus={!cameraActive}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" fullWidth disabled={!normalizeBarcode(barcode)}>
            {captured ? 'Use this barcode' : 'Use barcode'}
          </Button>
        </form>

        {captured && (
          <Button fullWidth leftIcon={<ScanIcon className="h-4 w-4" />} onClick={useBarcode}>
            Use scanned barcode
          </Button>
        )}
      </div>
    </Modal>
  )
}
