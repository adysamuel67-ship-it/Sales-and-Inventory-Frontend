'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraPermissionStatus =
  | 'prompt'
  | 'granting'
  | 'granted'
  | 'denied'
  | 'error'
  | 'unsupported'

export interface CameraRequestResult {
  stream: MediaStream | null
  error: string
}

export function cameraPermissionSupported(): boolean {
  if (typeof navigator === 'undefined') return false
  return typeof navigator.mediaDevices?.getUserMedia === 'function'
}

export function cameraPermissionErrorMessage(err: any): string {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow camera access in your browser’s site controls, or enter the barcode manually.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device. Enter the barcode manually instead.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is already in use by another app. Close it and try again, or enter the barcode manually.'
    default:
      return 'Camera could not be started. Enter the barcode manually or use a USB/Bluetooth scanner.'
  }
}

/**
 * Wraps the browser camera permission lifecycle.
 *
 * The browser owns the native permission dialog: calling `request` runs
 * getUserMedia, which prompts on a first visit and silently succeeds once the
 * site has been allowed. A previous denial can only be reversed in browser
 * settings, so the status is exposed for callers to explain that to users.
 */
export function useCameraPermission() {
  const [status, setStatus] = useState<CameraPermissionStatus>('prompt')
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    mountedRef.current = true
    setSupported(cameraPermissionSupported())
    return () => {
      mountedRef.current = false
      release()
    }
  }, [release])

  useEffect(() => {
    if (!supported) {
      setStatus('unsupported')
      return
    }

    let cancelled = false
    let permissionStatus: PermissionStatus | null = null

    const sync = () => {
      if (cancelled || !permissionStatus) return
      setStatus(
        permissionStatus.state === 'granted'
          ? 'granted'
          : permissionStatus.state === 'denied'
            ? 'denied'
            : 'prompt'
      )
    }

    try {
      navigator.permissions
        ?.query({ name: 'camera' as PermissionName })
        .then((result) => {
          if (cancelled) return
          permissionStatus = result
          sync()
          result.onchange = sync
        })
        .catch(() => {
          if (!cancelled) setStatus('prompt')
        })
    } catch {
      setStatus('prompt')
    }

    return () => {
      cancelled = true
      if (permissionStatus) permissionStatus.onchange = null
    }
  }, [supported])

  const request = useCallback(async (): Promise<CameraRequestResult> => {
    setError('')

    if (!cameraPermissionSupported()) {
      const message =
        'Camera scanning is not available in this browser. Enter the barcode manually or use a USB/Bluetooth scanner.'
      setSupported(false)
      setStatus('unsupported')
      setError(message)
      return { stream: null, error: message }
    }

    setStatus('granting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return { stream: null, error: '' }
      }

      release()
      streamRef.current = stream
      setStatus('granted')
      return { stream, error: '' }
    } catch (err: any) {
      if (!mountedRef.current) return { stream: null, error: '' }

      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
      const message = cameraPermissionErrorMessage(err)
      setStatus(denied ? 'denied' : 'error')
      setError(message)
      return { stream: null, error: message }
    }
  }, [release])

  return { status, error, supported, request, release }
}
