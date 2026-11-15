import {
  DISMISS_COOLDOWN_MS,
  FAILED_INSTALL_COOLDOWN_MS,
  INSTALL_STORAGE_KEYS,
  PROMPT_SHOWN_COOLDOWN_MS,
  isAppInstalled,
  isInstallPromptSuppressed,
  isIosDevice,
  isStandaloneDisplay,
  markAppInstalled,
  markInstallCancelled,
  markInstallDismissed,
  markInstallPromptShown,
} from '@/lib/pwaInstall'

const DAY_MS = 24 * 60 * 60 * 1000

function mockMatchMedia(matches: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia
}

const ORIGINAL_USER_AGENT = window.navigator.userAgent

beforeEach(() => {
  localStorage.clear()
  mockMatchMedia(false)
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: ORIGINAL_USER_AGENT,
  })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('installation detection helpers', () => {
  it('detects standalone display mode through matchMedia', () => {
    expect(isStandaloneDisplay()).toBe(false)
    mockMatchMedia(true)
    expect(isStandaloneDisplay()).toBe(true)
  })

  it('detects iOS Safari and ordinary desktop browsers', () => {
    expect(isIosDevice()).toBe(false)

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    })
    expect(isIosDevice()).toBe(true)
  })

  it('treats a stored install marker as installed even outside standalone mode', () => {
    expect(isAppInstalled()).toBe(false)
    markAppInstalled()
    expect(isAppInstalled()).toBe(true)
    expect(localStorage.getItem(INSTALL_STORAGE_KEYS.installed)).toBeTruthy()
  })
})

describe('install prompt suppression windows', () => {
  it('suppresses the prompt for 30 days after a dismissal', () => {
    const now = Date.now()
    markInstallDismissed(now)

    expect(isInstallPromptSuppressed(now + DAY_MS)).toBe(true)
    expect(isInstallPromptSuppressed(now + DISMISS_COOLDOWN_MS - 1)).toBe(true)
    expect(isInstallPromptSuppressed(now + DISMISS_COOLDOWN_MS + 1)).toBe(false)
  })

  it('applies a shorter cooldown after a cancelled install', () => {
    const now = Date.now()
    markInstallCancelled(now)

    expect(isInstallPromptSuppressed(now + DAY_MS)).toBe(true)
    expect(isInstallPromptSuppressed(now + FAILED_INSTALL_COOLDOWN_MS + 1)).toBe(false)
    expect(FAILED_INSTALL_COOLDOWN_MS).toBeLessThan(DISMISS_COOLDOWN_MS)
  })

  it('stays suppressed permanently once the app has been installed', () => {
    const now = Date.now()
    markAppInstalled(now)

    expect(isInstallPromptSuppressed(now + 365 * DAY_MS)).toBe(true)
  })

  it('quietly throttles an ignored prompt for a week', () => {
    const now = Date.now()
    markInstallPromptShown(now)

    expect(isInstallPromptSuppressed(now + DAY_MS)).toBe(true)
    expect(isInstallPromptSuppressed(now + PROMPT_SHOWN_COOLDOWN_MS + 1)).toBe(false)
  })
})
