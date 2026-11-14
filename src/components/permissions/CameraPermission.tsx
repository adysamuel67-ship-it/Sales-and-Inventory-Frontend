'use client'

import type { ReactNode } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import type { CameraPermissionStatus } from '@/lib/useCameraPermission'

interface Props {
  supported: boolean
  status: CameraPermissionStatus
  error?: string
  onRetry?: () => void
  /** Shown when the browser cannot do camera scanning at all. */
  fallback?: ReactNode
}

/**
 * Shared camera permission feedback.
 *
 * Native permission dialogs are owned by the browser, so this component only
 * explains the current state and offers a retry. It never renders a custom
 * "allow camera" dialog that could be mistaken for the native prompt.
 */
export default function CameraPermission({
  supported,
  status,
  error,
  onRetry,
  fallback,
}: Props) {
  if (!supported) {
    return fallback ? <Alert kind="info">{fallback}</Alert> : null
  }

  if (error) {
    return (
      <Alert kind="warning">
        <div className="flex flex-col items-start gap-2">
          <span>{error}</span>
          {onRetry && status !== 'granting' && (
            <Button size="xs" variant="secondary" onClick={onRetry}>
              Try camera again
            </Button>
          )}
        </div>
      </Alert>
    )
  }

  if (status === 'denied') {
    return (
      <Alert kind="warning">
        <div className="flex flex-col items-start gap-2">
          <span>
            Camera access is blocked for this site. Allow it in your browser’s site controls, then try again.
          </span>
          {onRetry && (
            <Button size="xs" variant="secondary" onClick={onRetry}>
              Try camera again
            </Button>
          )}
        </div>
      </Alert>
    )
  }

  return null
}
