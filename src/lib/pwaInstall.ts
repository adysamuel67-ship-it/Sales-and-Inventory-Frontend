'use client'

/**
 * Shared PWA installation primitives.
 *
 * The browser owns the actual installation flow. This module only answers two
 * questions for the UI: "is the app already installed?" and "is it appropriate
 * to ask the user about installing right now?".
 */

/** Chromium's install event, which is not part of the standard TS DOM lib. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const INSTALL_STORAGE_KEYS = {
  /** When the user last dismissed the custom prompt. */
  dismissedAt: 'bbgh_install_prompt_dismissed_at',
  /** When an unsuccessful install attempt's cooldown ends. */
  cooldownUntil: 'bbgh_install_prompt_cooldown_until',
  /** When the prompt was last shown, even if the user ignored it. */
  shownAt: 'bbgh_install_prompt_shown_at',
  /** Set once this browser installation has installed the app. */
  installed: 'bbgh_install_prompt_installed',
} as const

/** A dismissal hides the prompt for a full month. */
export const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000

/** A cancelled native dialog hides the prompt for a week. */
export const FAILED_INSTALL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/** Even an ignored prompt stays quiet for a week before being shown again. */
export const PROMPT_SHOWN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/** Wait before revealing the prompt so it never pops the instant a page loads. */
export const PROMPT_REVEAL_DELAY_MS = 4000

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readNumber(key: string): number | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function writeValue(key: string, value: string) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(key, value)
  } catch {
    // Private browsing and storage quotas can reject writes. The prompt still
    // closes for this visit; it just cannot remember the decision.
  }
}

/**
 * True when the page is running inside an installed app window rather than a
 * normal browser tab. Covers desktop/Android display modes and iOS's
 * non-standard navigator.standalone flag.
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false

  const displayModes = [
    '(display-mode: standalone)',
    '(display-mode: fullscreen)',
    '(display-mode: minimal-ui)',
  ]

  if (typeof window.matchMedia === 'function') {
    for (const query of displayModes) {
      try {
        if (window.matchMedia(query).matches) return true
      } catch {
        // Some embedded webviews expose matchMedia but reject these queries.
      }
    }
  }

  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iOS/iPadOS, including iPadOS devices that report a Mac desktop user agent. */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iphone|ipad|ipod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * Installed means either the tab is already standalone or this browser has
 * previously reported a successful install. The stored marker matters when a
 * user opens the installed app's URL in a regular browser tab.
 */
export function isAppInstalled(): boolean {
  if (isStandaloneDisplay()) return true
  const storage = getStorage()
  if (!storage) return false
  try {
    return storage.getItem(INSTALL_STORAGE_KEYS.installed) != null
  } catch {
    return false
  }
}

export function getDismissedAt(): number | null {
  return readNumber(INSTALL_STORAGE_KEYS.dismissedAt)
}

export function getInstallCooldownUntil(): number | null {
  return readNumber(INSTALL_STORAGE_KEYS.cooldownUntil)
}

/** Records that the prompt was displayed, even if the user takes no action. */
export function markInstallPromptShown(now = Date.now()): void {
  writeValue(INSTALL_STORAGE_KEYS.shownAt, String(now))
}

/** Records a dismissal and suppresses the prompt for 30 days. */
export function markInstallDismissed(now = Date.now()): void {
  writeValue(INSTALL_STORAGE_KEYS.dismissedAt, String(now))
}

/** Applies a cooldown after the user cancels the native install dialog. */
export function markInstallCancelled(
  now = Date.now(),
  durationMs = FAILED_INSTALL_COOLDOWN_MS
): void {
  writeValue(INSTALL_STORAGE_KEYS.cooldownUntil, String(now + durationMs))
}

/** Permanently suppresses installation suggestions for this browser install. */
export function markAppInstalled(now = Date.now()): void {
  writeValue(INSTALL_STORAGE_KEYS.installed, String(now))
}

/** True while a dismissal or failed-install cooldown is still active. */
export function isInstallPromptSuppressed(now = Date.now()): boolean {
  if (isAppInstalled()) return true

  const dismissedAt = getDismissedAt()
  if (dismissedAt != null && now - dismissedAt < DISMISS_COOLDOWN_MS) return true

  const cooldownUntil = getInstallCooldownUntil()
  if (cooldownUntil != null && now < cooldownUntil) return true

  const shownAt = readNumber(INSTALL_STORAGE_KEYS.shownAt)
  if (shownAt != null && now - shownAt < PROMPT_SHOWN_COOLDOWN_MS) return true

  return false
}
