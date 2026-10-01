/**
 * Sign out behaviour.
 *
 * Verifies:
 * 1. Signing out clears every auth key from storage
 * 2. Signing out calls the logout endpoint and stops token auto-refresh
 * 3. Signing out returns the user to the sign-in page   <- the regression
 * 4. A forced sign-out (dead refresh token) behaves the same way
 * 5. /auth/logout is exempt from the 401 cascade and carries the access token
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
  authAPI: { logout: jest.fn(() => Promise.resolve()) },
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
import { authAPI, setAuthLogoutCallback, stopAutoRefresh } from '@/lib/api'

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

  it('calls the logout endpoint and stops token auto-refresh', async () => {
    seedSession()
    await renderProvider()
    await signOut()

    expect(authAPI.logout).toHaveBeenCalled()
    expect(stopAutoRefresh).toHaveBeenCalled()
  })

  it('does not try to sign the user out before they confirm', async () => {
    seedSession()
    await renderProvider()

    expect(authAPI.logout).not.toHaveBeenCalled()
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

describe('the logout request itself', () => {
  const src = readFileSync(join(process.cwd(), 'src/lib/api.ts'), 'utf8')

  it('exempts /auth/logout from the 401 cascade', () => {
    const handler = src.slice(src.indexOf('function handle401Interceptor'))

    // The exemption has to be both computed and used. Asserting only that the
    // identifier appears somewhere in the file would pass even if the guard
    // were computed and then dropped from the condition.
    const declaration = handler
      .split('\n')
      .find(line => line.includes('const isLogoutEndpoint'))
    const condition = handler
      .split('\n')
      .find(line => line.includes("error.response?.status === 401"))

    expect(declaration).toContain("url.includes('/auth/logout')")
    expect(condition).toContain('!isLogoutEndpoint')
  })

  it('still attaches the access token to the logout request', () => {
    const attachToken = src.slice(src.indexOf('async function attachToken'), src.indexOf('api.interceptors.request.use'))
    // Excluding /auth/logout from the request interceptor would strip the
    // credential the server needs to revoke the session.
    expect(attachToken).not.toContain('/auth/logout')

    const logoutCall = src.slice(src.indexOf('logout: () =>'), src.indexOf('sendVerification'))
    expect(logoutCall).toContain("localStorage.getItem('token')")
    expect(logoutCall).toContain('Authorization')
  })

  it('matches the mobile client, which already excluded /auth/logout', () => {
    const mobile = readFileSync(join(process.cwd(), 'mobile/src/lib/api.ts'), 'utf8')
    expect(mobile).toContain("url.includes('/auth/logout')")
  })
})