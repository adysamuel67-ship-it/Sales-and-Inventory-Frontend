'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { productAPI } from '@/lib/api'
import type { Product } from '@/lib/types'
import { formatCedi, normalizeProduct, parseApiError } from '@/lib/utils'
import { BARCODE_FORMATS, cameraScanningSupported, normalizeBarcode } from '@/lib/barcode'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import { ScanIcon, SearchIcon, XIcon } from '@/components/ui/Icons'

type LookupState = 'idle' | 'looking' | 'local' | 'external' | 'not_found' | 'error'

interface Props {
  businessId: number
  canCreate?: boolean
  productActionLabel?: string
  onClose: () => void
  onProduct: (product: Product) => void
  onSuggestion?: (barcode: string, suggestedName: string) => void
  onCreate?: (barcode: string) => void
}

/**
 * Barcode lookup for one business.
 *
 * The backend checks local inventory first and only falls back to Open Food
 * Facts when nothing matches, so a local hit always wins. Camera scanning uses
 * the native BarcodeDetector API where available; manual entry stays available
 * everywhere and is the only path in browsers without it.
 */
export default function BarcodeScanModal({
  businessId,
  canCreate = false,
  productActionLabel = 'View product',
  onClose,
  onProduct,
  onSuggestion,
  onCreate,
}: Props) {
  const [barcode, setBarcode] = useState('')
  const [state, setState] = useState<LookupState>('idle')
  const [product, setProduct] = useState<Product | null>(null)
  const [suggestedName, setSuggestedName] = useState('')
  const [feedback, setFeedback] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const frameRef = useRef<number | null>(null)
  const lookupRef = useRef<(code: string) => void>(() => {})
  const supported = cameraScanningSupported()

  const releaseCamera = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    detectorRef.current = null
  }, [])

  const stopCamera = useCallback(() => {
    releaseCamera()
    setCameraActive(false)
  }, [releaseCamera])

  useEffect(() => () => releaseCamera(), [releaseCamera])

  const reset = () => {
    stopCamera()
    setBarcode('')
    setState('idle')
    setProduct(null)
    setSuggestedName('')
    setFeedback('')
    setCameraError('')
  }

  const lookup = useCallback(
    async (raw: string) => {
      const code = normalizeBarcode(raw)
      if (!code) {
        setFeedback('Enter or scan a barcode first.')
        return
      }

      stopCamera()
      setBarcode(code)
      setState('looking')
      setFeedback('')
      setProduct(null)
      setSuggestedName('')

      try {
        const res = await productAPI.scan(businessId, code)
        const data = res.data?.data ?? res.data

        if (data?.found_locally && data.product) {
          const found = normalizeProduct({ ...data.product, barcode: data.product.barcode ?? code })
          setProduct(found)
          setState('local')
          return
        }

        if (data?.suggested_name) {
          setSuggestedName(data.suggested_name)
          setState('external')
          return
        }

        setState('not_found')
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setState('not_found')
          return
        }
        setState('error')
        setFeedback(parseApiError(err) || 'Barcode lookup failed. Please try again.')
      }
    },
    [businessId, stopCamera]
  )

  lookupRef.current = lookup

  const scanFrame = useCallback(async () => {
    const video = videoRef.current
    const detector = detectorRef.current
    if (video && detector && video.readyState >= 2) {
      try {
        const codes = await detector.detect(video)
        const raw = codes?.[0]?.rawValue
        if (raw) {
          lookupRef.current(String(raw))
          return
        }
      } catch {
        // A dropped frame should not end the scan loop.
      }
    }
    frameRef.current = requestAnimationFrame(() => void scanFrame())
  }, [])

  const startCamera = async () => {
    setCameraError('')
    setFeedback('')

    try {
      const Detector = (window as any).BarcodeDetector
      let formats = BARCODE_FORMATS
      if (typeof Detector.getSupportedFormats === 'function') {
        const supportedFormats: string[] = await Detector.getSupportedFormats()
        const filtered = BARCODE_FORMATS.filter((format) => supportedFormats.includes(format))
        if (filtered.length > 0) formats = filtered
      }

      detectorRef.current = new Detector({ formats })
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error('Video element unavailable')
      video.srcObject = stream
      await video.play().catch(() => {})

      setCameraActive(true)
      void scanFrame()
    } catch (err: any) {
      releaseCamera()
      setCameraActive(false)
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow it in your browser settings or type the barcode below.'
          : 'Camera could not be started. Type the barcode below instead.'
      )
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'looking') return
    void lookup(barcode)
  }

  return (
    <Modal
      onClose={onClose}
      panelClassName="w-full max-w-md max-h-[90vh] overflow-y-auto"
      aria-labelledby="barcode-scan-title"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h3 id="barcode-scan-title" className="flex items-center gap-2 font-semibold text-slate-900">
            <ScanIcon className="h-5 w-5 text-primary" />
            Scan barcode
          </h3>
          <p className="mt-0.5 text-xs text-neutral-light">
            Look up an item in this business by its barcode.
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
        {cameraActive ? (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-900">
              <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/80" />
              <span className="absolute inset-x-0 bottom-2 text-center text-xs font-medium text-white/90">
                Align the barcode inside the frame
              </span>
            </div>
            <Button variant="secondary" size="sm" fullWidth onClick={stopCamera}>
              Stop camera
            </Button>
          </div>
        ) : (
          <video ref={videoRef} className="hidden" muted playsInline />
        )}

        {supported && !cameraActive && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void startCamera()}
            leftIcon={<ScanIcon className="h-4 w-4" />}
          >
            Use camera
          </Button>
        )}

        {cameraError && <Alert kind="warning">{cameraError}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="barcode-input" className="mb-1 block text-xs font-medium text-slate-700">
              Barcode
            </label>
            <input
              id="barcode-input"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 5901234123457"
              autoFocus={!cameraActive}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-light">
              Works with the scanner or by typing the number printed under the barcode.
            </p>
          </div>
          <Button
            type="submit"
            fullWidth
            loading={state === 'looking'}
            leftIcon={<SearchIcon className="h-4 w-4" />}
          >
            Look up
          </Button>
        </form>

        {feedback && <Alert kind="error">{feedback}</Alert>}

        {state === 'local' && product && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">In your inventory</p>
            <p className="mt-1 font-semibold text-slate-900">{product.name}</p>
            <p className="mt-0.5 text-xs text-slate-600">
              <span className="font-mono">{product.barcode || barcode}</span> · {formatCedi(product.price)}
              {product.quantity != null ? ` · ${product.quantity} ${product.unit || 'units'} on hand` : ''}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" fullWidth onClick={() => onProduct(product)}>
                {productActionLabel}
              </Button>
              <Button size="sm" variant="secondary" onClick={reset}>
                Scan another
              </Button>
            </div>
          </div>
        )}

        {state === 'external' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Found in Open Food Facts</p>
            <p className="mt-1 font-semibold text-slate-900">{suggestedName}</p>
            <p className="mt-0.5 text-xs text-slate-600">
              <span className="font-mono">{barcode}</span> is not in your inventory yet.
            </p>
            {canCreate && onSuggestion ? (
              <Button
                size="sm"
                fullWidth
                className="mt-3"
                onClick={() => onSuggestion(barcode, suggestedName)}
              >
                Add this product
              </Button>
            ) : (
              <p className="mt-2 text-xs text-slate-600">
                Ask an owner or admin to add it to your inventory.
              </p>
            )}
          </div>
        )}

        {state === 'not_found' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">No product found</p>
            <p className="mt-0.5 text-xs text-slate-600">
              <span className="font-mono">{barcode}</span> is not in your inventory or the external catalogue.
            </p>
            {canCreate && onCreate ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" fullWidth onClick={() => onCreate(barcode)}>
                  Add product
                </Button>
                <Button size="sm" variant="secondary" onClick={reset}>
                  Try another
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" className="mt-3" onClick={reset}>
                Try another
              </Button>
            )}
          </div>
        )}

        {state === 'error' && (
          <Button size="sm" variant="secondary" fullWidth onClick={reset}>
            Try again
          </Button>
        )}
      </div>
    </Modal>
  )
}
