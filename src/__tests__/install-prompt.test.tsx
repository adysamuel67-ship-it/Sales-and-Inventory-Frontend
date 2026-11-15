import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import InstallAppPrompt from '@/components/InstallAppPrompt'
import {
  DISMISS_COOLDOWN_MS,
  INSTALL_STORAGE_KEYS,
  PROMPT_REVEAL_DELAY_MS,
} from '@/lib/pwaInstall'

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => <span aria-hidden="true" />,
}))

const TITLE = /install business bot gh/i

function makeInstallEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const prompt = jest.fn().mockResolvedValue(undefined)
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })
  return { event, prompt }
}

function revealNotification() {
  act(() => {
    jest.advanceTimersByTime(PROMPT_REVEAL_DELAY_MS + 1)
  })
}

function mockDisplayMode(initialStandalone: boolean) {
  const listeners = new Set<() => void>()
  let standalone = initialStandalone

  const mediaQuery = {
    get matches() {
      return standalone
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }

  const original = window.matchMedia
  window.matchMedia = jest.fn().mockReturnValue(mediaQuery) as any

  return {
    setStandalone(value: boolean) {
      standalone = value
      listeners.forEach((listener) => listener())
    },
    restore() {
      window.matchMedia = original
    },
  }
}

function mockIos() {
  jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  )
}

beforeEach(() => {
  localStorage.clear()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('InstallAppPrompt', () => {
  it('waits before showing, then opens the native installer on click', async () => {
    render(<InstallAppPrompt />)
    const { event, prompt } = makeInstallEvent('accepted')

    fireEvent(window, event)
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()

    revealNotification()
    expect(screen.getByText(TITLE)).toBeInTheDocument()

    jest.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: /^install app$/i }))

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText(TITLE)).not.toBeInTheDocument())
    expect(localStorage.getItem(INSTALL_STORAGE_KEYS.installed)).toBeTruthy()
  })

  it('never shows on a browser with no install event and no iOS fallback', () => {
    render(<InstallAppPrompt />)
    revealNotification()

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('remembers a dismissal for 30 days and does not reset on reload', () => {
    const first = render(<InstallAppPrompt />)
    fireEvent(window, makeInstallEvent('accepted').event)
    revealNotification()

    fireEvent.click(screen.getByRole('button', { name: /dismiss install prompt/i }))
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    expect(Number(localStorage.getItem(INSTALL_STORAGE_KEYS.dismissedAt))).toBeGreaterThan(0)
    first.unmount()

    render(<InstallAppPrompt />)
    fireEvent(window, makeInstallEvent('accepted').event)
    revealNotification()
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
  })

  it('shows again once the 30-day dismissal has expired', () => {
    localStorage.setItem(
      INSTALL_STORAGE_KEYS.dismissedAt,
      String(Date.now() - DISMISS_COOLDOWN_MS - 1000)
    )

    render(<InstallAppPrompt />)
    fireEvent(window, makeInstallEvent('accepted').event)
    revealNotification()

    expect(screen.getByText(TITLE)).toBeInTheDocument()
  })

  it('applies a cooldown when the user cancels the native installer', async () => {
    const first = render(<InstallAppPrompt />)
    fireEvent(window, makeInstallEvent('dismissed').event)
    revealNotification()

    jest.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: /^install app$/i }))
    await waitFor(() => expect(screen.queryByText(TITLE)).not.toBeInTheDocument())

    expect(Number(localStorage.getItem(INSTALL_STORAGE_KEYS.cooldownUntil))).toBeGreaterThan(
      Date.now()
    )

    first.unmount()
    jest.useFakeTimers()

    render(<InstallAppPrompt />)
    fireEvent(window, makeInstallEvent('accepted').event)
    revealNotification()
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
  })

  it('shows manual Chrome steps when the native installer throws', async () => {
    render(<InstallAppPrompt />)
    const installEvent = makeInstallEvent('accepted')
    installEvent.prompt.mockRejectedValueOnce(new Error('blocked'))

    fireEvent(window, installEvent.event)
    revealNotification()

    jest.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: /^install app$/i }))

    expect(await screen.findByText(/the install dialog did not open/i)).toBeInTheDocument()
    expect(screen.getByText(/open chrome’s menu/i)).toBeInTheDocument()
    expect(screen.getByText(TITLE)).toBeInTheDocument()
  })

  it('offers manual Chrome steps without opening the native dialog', () => {
    render(<InstallAppPrompt />)
    fireEvent(window, makeInstallEvent('accepted').event)
    revealNotification()

    fireEvent.click(screen.getByRole('button', { name: /install manually/i }))

    expect(screen.getByText(/open chrome’s menu/i)).toBeInTheDocument()
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
  })

  it('never shows when already running as an installed app', () => {
    const display = mockDisplayMode(true)
    try {
      render(<InstallAppPrompt />)
      fireEvent(window, makeInstallEvent('accepted').event)
      revealNotification()

      expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    } finally {
      display.restore()
    }
  })

  it('hides the notification when the window enters standalone mode', () => {
    const display = mockDisplayMode(false)
    try {
      render(<InstallAppPrompt />)
      fireEvent(window, makeInstallEvent('accepted').event)
      revealNotification()
      expect(screen.getByText(TITLE)).toBeInTheDocument()

      act(() => {
        display.setStandalone(true)
        fireEvent.focus(window)
      })

      expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    } finally {
      display.restore()
    }
  })

  it('keeps a visible prompt when the window regains focus', () => {
    const display = mockDisplayMode(false)
    try {
      render(<InstallAppPrompt />)
      fireEvent(window, makeInstallEvent('accepted').event)
      revealNotification()
      expect(screen.getByText(TITLE)).toBeInTheDocument()

      act(() => {
        fireEvent.focus(window)
      })

      expect(screen.getByText(TITLE)).toBeInTheDocument()
    } finally {
      display.restore()
    }
  })

  it('permanently suppresses suggestions after appinstalled', () => {
    const first = render(<InstallAppPrompt />)
    fireEvent(window, makeInstallEvent('accepted').event)
    revealNotification()
    expect(screen.getByText(TITLE)).toBeInTheDocument()

    fireEvent(window, new Event('appinstalled'))
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    expect(localStorage.getItem(INSTALL_STORAGE_KEYS.installed)).toBeTruthy()
    first.unmount()

    render(<InstallAppPrompt />)
    fireEvent(window, makeInstallEvent('accepted').event)
    revealNotification()
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
  })

  it('shows iOS users Share → Add to Home Screen instructions', () => {
    mockIos()
    render(<InstallAppPrompt />)

    revealNotification()
    expect(screen.getByText(TITLE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^install app$/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /how to install/i }))

    expect(screen.getAllByText(/add to home screen/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/tap the share button/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /got it/i }))
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    expect(localStorage.getItem(INSTALL_STORAGE_KEYS.dismissedAt)).toBeTruthy()
  })

  it('does not suggest installation to an installed iOS app', () => {
    mockIos()
    const display = mockDisplayMode(true)
    try {
      render(<InstallAppPrompt />)
      revealNotification()
      expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    } finally {
      display.restore()
    }
  })
})
