'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'install_prompt_dismissed_at'
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000

function runningStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function dismissedRecently() {
  try {
    const value = Number(window.localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(value) && Date.now() - value < DISMISS_MS
  } catch {
    return false
  }
}

function isDesktop() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(min-width: 768px)').matches ?? window.innerWidth >= 768
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Desktop only: phone browsers already surface their own install affordance,
    // and this card's copy is written for a desktop-window install.
    if (typeof window === 'undefined' || runningStandalone() || !isDesktop()) return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      if (!dismissedRecently()) setVisible(true)
    }

    const onInstalled = () => {
      setVisible(false)
      setDeferredPrompt(null)
      try {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
      } catch {}
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
  }

  const install = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setVisible(false)
      } else {
        dismiss()
      }
    } catch {
      dismiss()
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[95] hidden sm:inset-x-auto sm:bottom-5 sm:right-5 sm:block sm:w-[360px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
        <div className="flex items-start gap-3">
          <Image src="/icon-192.png" alt="" width={40} height={40} className="shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Install Business Bot</p>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-light">
              Open it like a desktop app, with its own window and icon.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-light transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={install}
            disabled={installing}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {installing ? 'Opening installer...' : 'Install app'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={installing}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
