'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BARCODE_FORMATS, cameraScanningSupported } from '@/lib/barcode'
import { cameraPermissionErrorMessage, useCameraPermission } from '@/lib/useCameraPermission'

interface Options {
  onDetected: (barcode: string) => void
  /** Runs after every camera frame, including frames with no barcode. */
  onFrame?: () => void
  /** Stop the camera as soon as one barcode is detected. */
  stopOnDetect?: boolean
  /** Start the camera when the component mounts and the browser supports it. */
  autoStart?: boolean
  autoStartDelay?: number
  /** Set false to prevent an automatic start, e.g. while a sale is submitting. */
  enabled?: boolean
}

/**
 * Camera preview plus a native BarcodeDetector scan loop.
 *
 * Permission handling lives in useCameraPermission; this hook owns the video
 * element, detector lifecycle and per-frame loop. Callers decide what to do
 * with each barcode, including whether to stop the camera after a hit.
 */
export function useBarcodeScanner({
  onDetected,
  onFrame,
  stopOnDetect = false,
  autoStart = false,
  autoStartDelay = 150,
  enabled = true,
}: Options) {
  const [supported, setSupported] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const detectorRef = useRef<any>(null)
  const frameRef = useRef<number | null>(null)
  const onDetectedRef = useRef(onDetected)
  const onFrameRef = useRef(onFrame)
  const stopOnDetectRef = useRef(stopOnDetect)
  const autoStartedRef = useRef(false)
  const activeRef = useRef(false)
  const mountedRef = useRef(true)

  const { status: permissionStatus, request, release } = useCameraPermission()

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    stopOnDetectRef.current = stopOnDetect
  }, [stopOnDetect])

  useEffect(() => {
    setSupported(cameraScanningSupported())
  }, [])

  const releaseFrame = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    detectorRef.current = null
  }, [])

  const stopCamera = useCallback(() => {
    activeRef.current = false
    releaseFrame()
    release()
    setCameraActive(false)
  }, [release, releaseFrame])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      activeRef.current = false
      releaseFrame()
      release()
    }
  }, [release, releaseFrame])

  const scanFrame = useCallback(async () => {
    const video = videoRef.current
    const detector = detectorRef.current

    if (video && detector && video.readyState >= 2) {
      try {
        const codes = await detector.detect(video)
        const raw = codes?.[0]?.rawValue
        if (!activeRef.current || !mountedRef.current) return
        if (raw) {
          onDetectedRef.current(String(raw))
          if (stopOnDetectRef.current) {
            stopCamera()
            return
          }
        }
      } catch {
        // A dropped frame should not end the scan loop.
      }
    }

    if (!activeRef.current || !mountedRef.current) return

    onFrameRef.current?.()
    frameRef.current = requestAnimationFrame(() => void scanFrame())
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    setCameraError('')

    if (!cameraScanningSupported()) {
      setCameraError(
        'Camera scanning is not available in this browser. Enter the barcode manually or use a USB/Bluetooth scanner.'
      )
      return
    }

    try {
      const Detector = (window as any).BarcodeDetector
      let formats = BARCODE_FORMATS
      if (typeof Detector.getSupportedFormats === 'function') {
        const supportedFormats: string[] = await Detector.getSupportedFormats()
        const filtered = BARCODE_FORMATS.filter((format) => supportedFormats.includes(format))
        if (filtered.length > 0) formats = filtered
      }

      detectorRef.current = new Detector({ formats })

      const result = await request()
      if (!result.stream) {
        setCameraActive(false)
        setCameraError(result.error)
        return
      }

      const video = videoRef.current
      if (!video) throw new Error('Video element unavailable')

      video.srcObject = result.stream
      await video.play().catch(() => {})

      if (!mountedRef.current) {
        result.stream.getTracks().forEach((track) => track.stop())
        return
      }

      activeRef.current = true
      setCameraActive(true)
      void scanFrame()
    } catch (err: any) {
      stopCamera()
      setCameraError(cameraPermissionErrorMessage(err))
    }
  }, [request, scanFrame, stopCamera])

  useEffect(() => {
    if (!autoStart || !enabled || !supported || autoStartedRef.current) return
    autoStartedRef.current = true
    const timer = setTimeout(() => void startCamera(), autoStartDelay)
    return () => clearTimeout(timer)
  }, [autoStart, enabled, supported, autoStartDelay, startCamera])

  return {
    supported,
    cameraActive,
    cameraError,
    permissionStatus,
    videoRef,
    startCamera,
    stopCamera,
  }
}
