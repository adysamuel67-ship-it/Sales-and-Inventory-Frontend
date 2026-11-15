'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type BeforeInstallPromptEvent,
  PROMPT_REVEAL_DELAY_MS,
  isAppInstalled,
  isInstallPromptSuppressed,
  isIosDevice,
  isStandaloneDisplay,
  markAppInstalled,
  markInstallCancelled,
  markInstallDismissed,
  markInstallPromptShown,
} from '@/lib/pwaInstall'

export type PwaInstallMode = 'native' | 'ios'

export interface PwaInstallState {
  /** The prompt is currently on screen. */
  visible: boolean
  /** Native Chromium installer, or the iOS Add to Home Screen walkthrough. */
  mode: PwaInstallMode
  /** The native installer dialog is open / its result is pending. */
  installing: boolean
  /** iOS instructions have been expanded. */
  instructionsOpen: boolean
  /** A deferred Chromium install event exists, so Install App can work. */
  canInstall: boolean
  install: () => Promise<void>
  dismiss: () => void
  showInstructions: () => void
}

/**
 * Owns the PWA installation lifecycle for one mounted prompt.
 *
 * Chromium fires `beforeinstallprompt`; the event is captured and the browser's
 * own banner is prevented. The event is only consumed on an explicit Install
 * App click. iOS has no such event, so the hook falls back to a manual
 * Add to Home Screen walkthrough.
 *
 * Dismissals and failed installs are persisted outside this hook so a page
 * reload cannot reset them, and a successful install permanently opts this
 * browser out of suggestions.
 */
export function usePwaInstall(): PwaInstallState {
  const [visible, setVisible] = useState(false)
  const [mode, setMode] = useState<PwaInstallMode>('native')
  const [installing, setInstalling] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)

  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealScheduled = useRef(false)
  const mounted = useRef(true)

  const clearRevealTimer = useCallback(() => {
    if (revealTimer.current != null) {
      clearTimeout(revealTimer.current)
      revealTimer.current = null
    }
  }, [])

  const hide = useCallback(() => {
    clearRevealTimer()
    if (!mounted.current) return
    setVisible(false)
    setInstructionsOpen(false)
  }, [clearRevealTimer])

  const scheduleReveal = useCallback(
    (nextMode: PwaInstallMode) => {
      if (revealScheduled.current) return
      if (isAppInstalled() || isInstallPromptSuppressed()) return

      revealScheduled.current = true
      setMode(nextMode)

      // Never cover the first paint: give the user time to settle on the page.
      revealTimer.current = setTimeout(() => {
        revealTimer.current = null
        if (!mounted.current) return
        if (isAppInstalled() || isInstallPromptSuppressed()) return
        if (nextMode === 'native' && !deferredPrompt.current) return
        markInstallPromptShown()
        setVisible(true)
      }, PROMPT_REVEAL_DELAY_MS)
    },
    []
  )

  useEffect(() => {
    mounted.current = true

    const syncInstallState = () => {
      if (!mounted.current) return
      // Only installation itself should remove a prompt that is already on
      // screen. Dismissal/cooldown checks here would immediately hide the
      // prompt after its own "shown" marker is recorded.
      if (isAppInstalled()) {
        // Opening the installed app is proof enough; remember it so a later
        // visit in a normal browser tab stays opted out too.
        if (isStandaloneDisplay()) markAppInstalled()
        deferredPrompt.current = null
        hide()
      }
    }

    const onBeforeInstall = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent
      // The custom prompt is the only entry point; the browser's own banner
      // must never appear unprompted.
      installEvent.preventDefault()
      deferredPrompt.current = installEvent

      if (isAppInstalled() || isInstallPromptSuppressed()) return
      scheduleReveal('native')
    }

    const onAppInstalled = () => {
      deferredPrompt.current = null
      markAppInstalled()
      hide()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncInstallState()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    window.addEventListener('focus', syncInstallState)
    document.addEventListener('visibilitychange', onVisibilityChange)

    let displayModeQuery: MediaQueryList | null = null
    if (typeof window.matchMedia === 'function') {
      try {
        displayModeQuery = window.matchMedia('(display-mode: standalone)')
        displayModeQuery.addEventListener?.('change', syncInstallState)
      } catch {
        displayModeQuery = null
      }
    }

    // Chrome/Edge/Android use the event above. iOS never fires it, so offer the
    // Share → Add to Home Screen route instead when running in a browser tab.
    if (isIosDevice() && !isAppInstalled()) {
      scheduleReveal('ios')
    }

    syncInstallState()

    return () => {
      mounted.current = false
      clearRevealTimer()
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
      window.removeEventListener('focus', syncInstallState)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      displayModeQuery?.removeEventListener?.('change', syncInstallState)
    }
  }, [clearRevealTimer, hide, scheduleReveal])

  const install = useCallback(async () => {
    const event = deferredPrompt.current
    if (!event) return

    setInstalling(true)
    try {
      await event.prompt()
      const choice = await event.userChoice

      if (choice.outcome === 'accepted') {
        markAppInstalled()
        hide()
        return
      }

      // Cancelled: back off for a week instead of asking again immediately.
      markInstallCancelled()
      hide()
    } catch {
      markInstallCancelled()
      hide()
    } finally {
      deferredPrompt.current = null
      if (mounted.current) setInstalling(false)
    }
  }, [hide])

  const dismiss = useCallback(() => {
    markInstallDismissed()
    hide()
  }, [hide])

  const showInstructions = useCallback(() => {
    setInstructionsOpen(true)
  }, [])

  return {
    visible,
    mode,
    installing,
    instructionsOpen,
    canInstall: mode === 'native',
    install,
    dismiss,
    showInstructions,
  }
}
