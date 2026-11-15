'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { SITE_NAME } from '@/lib/site'
import { usePwaInstall } from '@/lib/usePwaInstall'
import Button from '@/components/ui/Button'
import { DownloadIcon, ShareIcon, XIcon } from '@/components/ui/Icons'

const IOS_STEPS = [
  { title: 'Open Safari', detail: `Open ${SITE_NAME} in Safari if you are using another browser.` },
  { title: 'Tap Share', detail: 'Tap the Share button in the Safari toolbar.' },
  { title: 'Add to Home Screen', detail: 'Choose “Add to Home Screen”, then tap Add.' },
]

/**
 * In-app PWA installation prompt, mounted once in the root layout.
 *
 * Chromium can install from a captured beforeinstallprompt event; iOS instead
 * gets the manual Share → Add to Home Screen walkthrough. The hook handles all
 * detection, persistence and cooldowns so this component is presentation only.
 */
export default function InstallAppPrompt() {
  const {
    visible,
    mode,
    installing,
    instructionsOpen,
    canInstall,
    install,
    dismiss,
    showInstructions,
  } = usePwaInstall()

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible, dismiss])

  if (!visible) return null

  const isIos = mode === 'ios'

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px]"
      aria-live="polite"
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="install-app-title"
        aria-describedby="install-app-description"
        className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-4 shadow-popover sm:p-5"
      >
        <div className="flex items-start gap-3">
          <Image
            src="/icon-192.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl shadow-sm ring-1 ring-slate-900/5"
          />
          <div className="min-w-0 flex-1">
            <p id="install-app-title" className="text-sm font-semibold text-slate-900">
              Install {SITE_NAME}
            </p>
            <p
              id="install-app-description"
              className="mt-1 text-xs leading-relaxed text-neutral-light"
            >
              {isIos
                ? `Add ${SITE_NAME} to your home screen for one-tap access to sales, inventory and debts.`
                : `Get faster access to your business, manage sales and inventory conveniently, and use ${SITE_NAME} like a regular mobile application.`}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-light transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {isIos && instructionsOpen ? (
          <>
            <ol className="mt-4 space-y-2 rounded-xl bg-surfaceAlt p-3 text-xs text-slate-600">
              {IOS_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <span>
                    <span className="font-medium text-slate-900">{step.title}.</span> {step.detail}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" fullWidth onClick={dismiss}>
                Got it
              </Button>
              <Button size="sm" variant="secondary" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </>
        ) : isIos ? (
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              fullWidth
              leftIcon={<ShareIcon className="h-4 w-4" />}
              onClick={showInstructions}
            >
              How to Install
            </Button>
            <Button size="sm" variant="secondary" onClick={dismiss}>
              Not now
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              fullWidth
              loading={installing}
              disabled={!canInstall}
              leftIcon={<DownloadIcon className="h-4 w-4" />}
              onClick={install}
            >
              Install App
            </Button>
            <Button size="sm" variant="secondary" onClick={dismiss} disabled={installing}>
              Not now
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
