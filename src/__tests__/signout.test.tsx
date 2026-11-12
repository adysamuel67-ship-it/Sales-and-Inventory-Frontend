/**
 * Sign out behaviour.
 *
 * Verifies:
 * 1. Signing out clears every auth key from storage
 * 2. Signing out is purely client-side and stops token auto-refresh
 * 3. Signing out returns the user to the sign-in page   <- the regression
 * 4. A forced sign-out (dead refresh token) behaves the same way
 * 5. No client ever calls /auth/logout, which is a server no-op now
 * 6. A sign-out in another tab signs this tab out via the storage event
 */

import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/settings'),
  useParams: jest.fn(() => ({})),
}))

jest.mock('@/lib/api', () => ({
  profileAPI: { getMyProfile: jest.fn(() => Promise.resolve({ data: null })) },
  businessAPI: { myBusinesses: jest.fn(() => Promise.resolve({ data: null })) },
  setTokenRefreshCallback: jest.fn(),
  setAuthLogoutCallback: jest.fn(),
  getUserIdFromToken: jest.fn(() => null),
  tryProactiveRefresh: jest.fn(() => Promise.resolve(null)),
  startAutoRefresh: jest.fn(),
  stopAutoRefresh: jest.fn(),
  isTokenExpired: jest.fn(() => false),
  decodeJwt: jest.fn(() => null),
  resetLogoutGuard: jest.fn(),
}))

import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth'
import { setAuthLogoutCallback, stopAutoRefresh } from '@/lib/api'

const replace = jest.fn()
const push = jest.fn()

let auth: ReturnType<typeof useAuth> | null = null

function Harness() {
  auth = useAuth()
  return (
    <button onClick={() => auth!.logout()}>Sign out</button>
  )
}

const seedSession = () => {
  localStorage.setItem('token', 'access-123')
  localStorage.setItem('refresh_token', 'refresh-456')
  localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Kwame', email: 'k@test.com' }))
  localStorage.setItem('current_business_id', '1')
}

// The provider kicks off a profile/businesses fetch on mount when a session is
// already in storage. Rendering inside async act() lets that settle before the
// assertions run, so the suite does not drown in act() warnings.
const renderProvider = async () => {
  await act(async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    )
  })
}

const signOut = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Sign out'))
  })
}

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ replace, push })
  auth = null
})

afterEach(() => {
  localStorage.clear()
})

describe('signing out', () => {
  it('clears every auth key from storage', async () => {
    seedSession()
    await renderProvider()
    await signOut()

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('current_business_id')).toBeNull()
  })

  it('returns the user to the sign-in page', async () => {
    seedSession()
    await renderProvider()
    await signOut()

    // The sign-out button lives on /settings, which has no auth guard, so
    // without this the user was stranded on a signed-out page.
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('signs out purely client-side and stops token auto-refresh', async () => {
    seedSession()
    await renderProvider()
    await signOut()

    expect(stopAutoRefresh).toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('does not try to sign the user out before they confirm', async () => {
    seedSession()
    await renderProvider()

    expect(localStorage.getItem('token')).toBe('access-123')
    expect(replace).not.toHaveBeenCalled()
  })

  it('survives repeated sign-outs', async () => {
    seedSession()
    await renderProvider()

    await act(async () => {
      auth!.logout()
      auth!.logout()
    })

    expect(localStorage.getItem('token')).toBeNull()
    expect(replace).toHaveBeenCalledWith('/login')
  })
})

describe('forced sign-out from an expired session', () => {
  it('clears storage and returns to sign-in when the api layer gives up', async () => {
    seedSession()
    await renderProvider()

    // api.ts registers this callback and calls it from doLogout() when a
    // refresh token is genuinely dead.
    const registered = (setAuthLogoutCallback as jest.Mock).mock.calls
      .map(c => c[0])
      .filter(Boolean)
    expect(registered.length).toBeGreaterThan(0)

    await act(async () => {
      registered[registered.length - 1]()
    })

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(replace).toHaveBeenCalledWith('/login')
  })
})

describe('a sign-out in another tab', () => {
  // Server-side sessions are never revoked anymore, so the only thing that
  // propagates a sign-out between tabs is the storage event fired when
  // another tab removes the tokens.
  it('signs this tab out when the other tab removes the access token', async () => {
    seedSession()
    await renderProvider()

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: null }))
    })

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('also reacts to the refresh token being removed', async () => {
    seedSession()
    await renderProvider()

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'refresh_token', newValue: null }))
    })

    expect(localStorage.getItem('token')).toBeNull()
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('ignores storage events that are not a sign-out', async () => {
    seedSession()
    await renderProvider()

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: 'rotated-by-other-tab' }))
      window.dispatchEvent(new StorageEvent('storage', { key: 'current_business_id', newValue: null }))
    })

    expect(localStorage.getItem('token')).toBe('access-123')
    expect(replace).not.toHaveBeenCalled()
  })
})

describe('logout stays client-side', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

  it('the web api client never posts to /auth/logout', () => {
    expect(read('src/lib/api.ts')).not.toContain("'/auth/logout'")
  })

  it('the mobile api client never posts to /auth/logout', () => {
    expect(read('mobile/src/lib/api.ts')).not.toContain("'/auth/logout'")
  })

  it('AuthProvider signs out by deleting both tokens from storage', () => {
    const src = read('src/lib/auth.tsx')
    expect(src).toContain("localStorage.removeItem('token')")
    expect(src).toContain("localStorage.removeItem('refresh_token')")
    expect(src).not.toMatch(/authAPI\.logout/)
  })

  it('AuthProvider listens for storage events across tabs', () => {
    expect(read('src/lib/auth.tsx')).toContain("window.addEventListener('storage'")
  })
})