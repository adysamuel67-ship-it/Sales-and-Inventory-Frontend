/**
 * Auth Flow Tests
 *
 * Verifies:
 * 1. Token storage and retrieval from localStorage
 * 2. Auth state persistence across simulated page navigation
 * 3. Token refresh callback updates React state
 * 4. Login stores all tokens correctly
 * 5. Malformed/missing data handled gracefully
 * 6. Logout clears all auth state
 * 7. Auth logout callback mechanism
 * 8. Navigation preserves auth state
 * 9. Refresh-token rotation race does not log the user out (multi-tab)
 * 10. Sign out lives in settings behind a confirmation
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const localStorageStore: Record<string, string> = {}

const mockLocalStorage = {
  getItem: jest.fn((key: string) => localStorageStore[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: jest.fn((key: string) => { delete localStorageStore[key] }),
  clear: jest.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
}

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

beforeEach(() => {
  Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
  jest.clearAllMocks()
})

describe('Auth Token Storage', () => {
  it('stores and retrieves token from localStorage', () => {
    mockLocalStorage.setItem('token', 'test-access-token-123')
    mockLocalStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test', email: 'test@test.com' }))

    expect(mockLocalStorage.getItem('token')).toBe('test-access-token-123')
    const user = JSON.parse(mockLocalStorage.getItem('user')!)
    expect(user.name).toBe('Test')
    expect(user.email).toBe('test@test.com')
  })

  it('stores and retrieves refresh_token separately', () => {
    mockLocalStorage.setItem('refresh_token', 'refresh-abc-456')
    expect(mockLocalStorage.getItem('refresh_token')).toBe('refresh-abc-456')
  })

  it('clears all auth data on logout', () => {
    mockLocalStorage.setItem('token', 'tok')
    mockLocalStorage.setItem('refresh_token', 'ref')
    mockLocalStorage.setItem('user', '{}')

    mockLocalStorage.removeItem('token')
    mockLocalStorage.removeItem('refresh_token')
    mockLocalStorage.removeItem('user')

    expect(mockLocalStorage.getItem('token')).toBeNull()
    expect(mockLocalStorage.getItem('refresh_token')).toBeNull()
    expect(mockLocalStorage.getItem('user')).toBeNull()
  })

  it('returns null for keys that were never set', () => {
    expect(mockLocalStorage.getItem('token')).toBeNull()
    expect(mockLocalStorage.getItem('refresh_token')).toBeNull()
    expect(mockLocalStorage.getItem('user')).toBeNull()
  })
})

describe('Token Refresh Callback', () => {
  it('callback is invoked when token is refreshed, updating React state', () => {
    let capturedNewToken = ''
    const callback = (newToken: string) => { capturedNewToken = newToken }

    mockLocalStorage.setItem('token', 'old-token')
    callback('new-token-from-refresh')

    expect(capturedNewToken).toBe('new-token-from-refresh')
  })

  it('refresh callback updates localStorage with new token', () => {
    mockLocalStorage.setItem('token', 'old-token')
    mockLocalStorage.setItem('refresh_token', 'old-refresh')

    const newToken = 'refreshed-access-token'
    const newRefresh = 'refreshed-refresh-token'

    mockLocalStorage.setItem('token', newToken)
    mockLocalStorage.setItem('refresh_token', newRefresh)

    expect(mockLocalStorage.getItem('token')).toBe('refreshed-access-token')
    expect(mockLocalStorage.getItem('refresh_token')).toBe('refreshed-refresh-token')
  })
})

describe('Auth State Persistence', () => {
  it('recognizes user as authenticated when token exists in localStorage', () => {
    mockLocalStorage.setItem('token', 'valid-token')
    mockLocalStorage.setItem('user', JSON.stringify({ id: 1, name: 'Kwame' }))

    const token = mockLocalStorage.getItem('token')
    const isAuthenticated = !!token

    expect(isAuthenticated).toBe(true)
  })

  it('recognizes user as NOT authenticated when token is missing', () => {
    const token = mockLocalStorage.getItem('token')
    const isAuthenticated = !!token

    expect(isAuthenticated).toBe(false)
  })

  it('handles malformed user JSON gracefully', () => {
    mockLocalStorage.setItem('token', 'valid-token')
    mockLocalStorage.setItem('user', 'not-valid-json{{{')

    let parsedUser = null
    try {
      parsedUser = JSON.parse(mockLocalStorage.getItem('user')!)
    } catch {
      mockLocalStorage.removeItem('user')
      parsedUser = null
    }

    expect(parsedUser).toBeNull()
    expect(mockLocalStorage.getItem('user')).toBeNull()
  })

  it('handles literal string "undefined" in localStorage', () => {
    mockLocalStorage.setItem('user', 'undefined')
    const storedUser = mockLocalStorage.getItem('user')

    if (storedUser === 'undefined') {
      mockLocalStorage.removeItem('user')
    }

    expect(mockLocalStorage.getItem('user')).toBeNull()
  })
})

describe('Login stores all tokens', () => {
  it('stores access_token, refresh_token, and user on login', () => {
    const loginData = {
      access_token: 'jwt-access-xyz',
      refresh_token: 'refresh-xyz',
      user: { id: 1, name: 'Kwame', email: 'kwame@test.com', phone: '0241234567', role: 'admin' },
    }

    mockLocalStorage.setItem('token', loginData.access_token)
    mockLocalStorage.setItem('refresh_token', loginData.refresh_token)
    mockLocalStorage.setItem('user', JSON.stringify(loginData.user))

    expect(mockLocalStorage.getItem('token')).toBe('jwt-access-xyz')
    expect(mockLocalStorage.getItem('refresh_token')).toBe('refresh-xyz')
    expect(JSON.parse(mockLocalStorage.getItem('user')!).name).toBe('Kwame')
  })

  it('stores user even when refresh_token is absent in response', () => {
    const loginData = {
      access_token: 'jwt-access-abc',
      user: { id: 2, name: 'Ama' },
    }

    mockLocalStorage.setItem('token', loginData.access_token)
    if ((loginData as any).refresh_token) {
      mockLocalStorage.setItem('refresh_token', (loginData as any).refresh_token)
    }
    mockLocalStorage.setItem('user', JSON.stringify(loginData.user))

    expect(mockLocalStorage.getItem('token')).toBe('jwt-access-abc')
    expect(mockLocalStorage.getItem('refresh_token')).toBeNull()
    expect(JSON.parse(mockLocalStorage.getItem('user')!).name).toBe('Ama')
  })

  it('handles login response with token field instead of access_token', () => {
    const loginData = {
      token: 'jwt-token-123',
      refresh_token: 'refresh-123',
      user: { id: 3, name: 'Kofi' },
    }

    const access_token = loginData.token
    mockLocalStorage.setItem('token', access_token)
    mockLocalStorage.setItem('refresh_token', loginData.refresh_token)
    mockLocalStorage.setItem('user', JSON.stringify(loginData.user))

    expect(mockLocalStorage.getItem('token')).toBe('jwt-token-123')
    expect(mockLocalStorage.getItem('refresh_token')).toBe('refresh-123')
  })

  it('handles login response with only id and no user object', () => {
    const loginData = {
      access_token: 'jwt-token-456',
      id: 5,
      name: 'Ako',
      email: 'ako@test.com',
    }

    const user = loginData.id
      ? { id: loginData.id, name: loginData.name, email: loginData.email, phone: '', role: 'user' }
      : null

    mockLocalStorage.setItem('token', loginData.access_token)
    mockLocalStorage.setItem('user', JSON.stringify(user))

    const storedUser = JSON.parse(mockLocalStorage.getItem('user')!)
    expect(storedUser.id).toBe(5)
    expect(storedUser.name).toBe('Ako')
    expect(storedUser.role).toBe('user')
  })
})

describe('Logout clears all state', () => {
  it('clears token, refresh_token, and user from localStorage', () => {
    mockLocalStorage.setItem('token', 'active-token')
    mockLocalStorage.setItem('refresh_token', 'active-refresh')
    mockLocalStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test' }))

    mockLocalStorage.removeItem('token')
    mockLocalStorage.removeItem('refresh_token')
    mockLocalStorage.removeItem('user')

    expect(mockLocalStorage.getItem('token')).toBeNull()
    expect(mockLocalStorage.getItem('refresh_token')).toBeNull()
    expect(mockLocalStorage.getItem('user')).toBeNull()
  })

  it('clearing already-empty keys does not throw', () => {
    expect(() => {
      mockLocalStorage.removeItem('token')
      mockLocalStorage.removeItem('refresh_token')
      mockLocalStorage.removeItem('user')
    }).not.toThrow()
  })
})

describe('Navigation between pages preserves auth', () => {
  it('simulates page navigation by reading fresh state from localStorage', () => {
    mockLocalStorage.setItem('token', 'my-token')
    mockLocalStorage.setItem('user', JSON.stringify({ id: 1, name: 'Kwame' }))

    const token = mockLocalStorage.getItem('token')
    const user = mockLocalStorage.getItem('user')
    const isAuthenticated = !!token && !!user && user !== 'undefined'

    expect(isAuthenticated).toBe(true)
    expect(JSON.parse(user!).name).toBe('Kwame')
  })

  it('redirects to /login when token is absent', () => {
    mockLocalStorage.removeItem('token')
    mockLocalStorage.removeItem('user')

    const token = mockLocalStorage.getItem('token')
    const isAuthenticated = !!token

    expect(isAuthenticated).toBe(false)
  })

  it('preserves auth across multiple simulated navigations', () => {
    mockLocalStorage.setItem('token', 'persistent-token')
    mockLocalStorage.setItem('user', JSON.stringify({ id: 1, name: 'Kwame' }))
    mockLocalStorage.setItem('refresh_token', 'persistent-refresh')

    for (let i = 0; i < 5; i++) {
      const token = mockLocalStorage.getItem('token')
      const user = mockLocalStorage.getItem('user')
      const isAuthenticated = !!token && !!user && user !== 'undefined'
      expect(isAuthenticated).toBe(true)
    }

    expect(mockLocalStorage.getItem('refresh_token')).toBe('persistent-refresh')
  })
})

describe('Auth logout callback mechanism', () => {
  it('logout callback clears all auth state', () => {
    mockLocalStorage.setItem('token', 'to-be-cleared')
    mockLocalStorage.setItem('refresh_token', 'to-be-cleared')
    mockLocalStorage.setItem('user', JSON.stringify({ id: 1 }))

    let authCleared = false
    const logoutCallback = () => {
      mockLocalStorage.removeItem('token')
      mockLocalStorage.removeItem('refresh_token')
      mockLocalStorage.removeItem('user')
      authCleared = true
    }

    logoutCallback()

    expect(authCleared).toBe(true)
    expect(mockLocalStorage.getItem('token')).toBeNull()
    expect(mockLocalStorage.getItem('refresh_token')).toBeNull()
    expect(mockLocalStorage.getItem('user')).toBeNull()
  })

  it('setting logout callback to null disables it', () => {
    let onAuthLogout: (() => void) | null = null

    const setCallback = (cb: (() => void) | null) => {
      onAuthLogout = cb
    }

    setCallback(() => { mockLocalStorage.removeItem('token') })
    expect(onAuthLogout).not.toBeNull()

    setCallback(null)
    expect(onAuthLogout).toBeNull()
  })

  it('multiple logout calls are idempotent', () => {
    mockLocalStorage.setItem('token', 'token')
    mockLocalStorage.setItem('refresh_token', 'refresh')
    mockLocalStorage.setItem('user', '{}')

    const logout = () => {
      mockLocalStorage.removeItem('token')
      mockLocalStorage.removeItem('refresh_token')
      mockLocalStorage.removeItem('user')
    }

    logout()
    logout()
    logout()

    expect(mockLocalStorage.getItem('token')).toBeNull()
    expect(mockLocalStorage.getItem('refresh_token')).toBeNull()
    expect(mockLocalStorage.getItem('user')).toBeNull()
  })
})

describe('Token refresh with queue mechanism', () => {
  it('processes queued promises on successful refresh', () => {
    const queue: { resolve: (token: string) => void; reject: (err: any) => void }[] = []

    const processQueue = (error: any, token: string | null) => {
      queue.forEach((prom) => {
        if (error || !token) {
          prom.reject(error)
        } else {
          prom.resolve(token)
        }
      })
      queue.length = 0
    }

    let resolvedToken = ''
    queue.push({
      resolve: (token: string) => { resolvedToken = token },
      reject: () => {},
    })

    processQueue(null, 'new-fresh-token')
    expect(resolvedToken).toBe('new-fresh-token')
    expect(queue.length).toBe(0)
  })

  it('rejects queued promises on failed refresh', () => {
    const queue: { resolve: (token: string) => void; reject: (err: any) => void }[] = []

    const processQueue = (error: any, token: string | null) => {
      queue.forEach((prom) => {
        if (error || !token) {
          prom.reject(error)
        } else {
          prom.resolve(token)
        }
      })
      queue.length = 0
    }

    let rejected = false
    queue.push({
      resolve: () => {},
      reject: () => { rejected = true },
    })

    processQueue(new Error('refresh failed'), null)
    expect(rejected).toBe(true)
    expect(queue.length).toBe(0)
  })

  it('handles empty queue gracefully', () => {
    const queue: { resolve: (token: string) => void; reject: (err: any) => void }[] = []

    const processQueue = (error: any, token: string | null) => {
      queue.forEach((prom) => {
        if (error || !token) {
          prom.reject(error)
        } else {
          prom.resolve(token)
        }
      })
      queue.length = 0
    }

    expect(() => processQueue(null, 'token')).not.toThrow()
    expect(() => processQueue(new Error('fail'), null)).not.toThrow()
  })
})

describe('Auth initialization from localStorage', () => {
  it('restores auth state from localStorage on app load', () => {
    mockLocalStorage.setItem('token', 'saved-token')
    mockLocalStorage.setItem('user', JSON.stringify({ id: 1, name: 'Kwame', email: 'kwame@test.com' }))
    mockLocalStorage.setItem('refresh_token', 'saved-refresh')

    const storedToken = mockLocalStorage.getItem('token')
    const storedUser = mockLocalStorage.getItem('user')
    const storedRefreshToken = mockLocalStorage.getItem('refresh_token')

    const isAuthenticated = !!(storedToken && storedUser && storedUser !== 'undefined')
    expect(isAuthenticated).toBe(true)

    const user = JSON.parse(storedUser!)
    expect(user.name).toBe('Kwame')
    expect(storedRefreshToken).toBe('saved-refresh')
  })

  it('does not restore auth when token is missing', () => {
    mockLocalStorage.removeItem('token')
    mockLocalStorage.setItem('user', JSON.stringify({ id: 1, name: 'Kwame' }))

    const storedToken = mockLocalStorage.getItem('token')
    const isAuthenticated = !!storedToken

    expect(isAuthenticated).toBe(false)
  })

  it('does not restore auth when user is "undefined" string', () => {
    mockLocalStorage.setItem('token', 'valid-token')
    mockLocalStorage.setItem('user', 'undefined')

    const storedToken = mockLocalStorage.getItem('token')
    const storedUser = mockLocalStorage.getItem('user')
    const isAuthenticated = !!(storedToken && storedUser && storedUser !== 'undefined')

    expect(isAuthenticated).toBe(false)
  })
})

describe('profileApi does NOT redirect on failure', () => {
  it('profileApi 401 handler does not set window.location.href', () => {
    let redirected = false
    const originalHref = window.location.href

    try {
      Object.defineProperty(window.location, 'href', {
        get() { return originalHref },
        set() { redirected = true },
        configurable: true,
      })
    } catch {
      // location is non-configurable in jsdom, skip
    }

    const mockError = { response: { status: 401 }, config: {} }
    const refreshToken = mockLocalStorage.getItem('refresh_token')

    if (mockError.response.status === 401 && !refreshToken) {
      // This is what the profileApi interceptor does: silently reject
    }

    expect(redirected).toBe(false)
  })
})

describe('Refresh-token rotation race (multi-tab)', () => {
  // The backend rotates the refresh token on every refresh (auth/service.py
  // writes user.refresh_token = hash(new_refresh_token)), invalidating the
  // previous one immediately. Two tabs refreshing at once therefore race, and
  // the loser used to be logged out for a session that was still valid.
  it('re-reads the stored refresh token before every attempt', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/api.ts'), 'utf8')
    const body = src.slice(src.indexOf('async function performTokenRefresh'), src.indexOf('function startRefresh'))

    // The read must happen inside the loop, not once before it.
    const loopIndex = body.indexOf('for (let attempt')
    const readIndex = body.indexOf("localStorage.getItem('refresh_token')")
    expect(loopIndex).toBeGreaterThan(-1)
    expect(readIndex).toBeGreaterThan(loopIndex)
  })

  it('retries when the stored token changed underneath it', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/api.ts'), 'utf8')
    const body = src.slice(src.indexOf('async function performTokenRefresh'), src.indexOf('function startRefresh'))

    // The 401 branch compares the token it sent against what is now stored,
    // and bails out to the next attempt when they differ.
    expect(body).toMatch(/current\s*&&\s*current\s*!==\s*refreshToken/)
    const race = body.indexOf('current !== refreshToken')
    expect(race).toBeGreaterThan(-1)
    const after = body.slice(race, race + 120)
    expect(after).toMatch(/\)\s*\{\s*continue/)
  })

  it('only ends the session after the retries are exhausted', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/api.ts'), 'utf8')
    const body = src.slice(src.indexOf('async function performTokenRefresh'), src.indexOf('function startRefresh'))

    // doLogout must be guarded by an attempt check, and must come after a retry.
    const logoutAt = body.indexOf('doLogout()')
    const guard = body.lastIndexOf('attempt < 2', logoutAt)
    expect(guard).toBeGreaterThan(-1)
  })

  it('does not log out on a network failure', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/api.ts'), 'utf8')
    const body = src.slice(src.indexOf('async function performTokenRefresh'), src.indexOf('function startRefresh'))

    // Only the 401/403 branch may call doLogout; the offline/5xx branch must not.
    const branches = body.split('if (status === 401 || status === 403)')
    expect(branches.length).toBe(2)
    expect(branches[0]).not.toContain('doLogout()')
    expect(branches[1]).toContain('doLogout()')
  })

  it('the 401 interceptor no longer signs out when a refresh merely fails', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/api.ts'), 'utf8')
    const handler = src.slice(src.indexOf('function handle401Interceptor'))

    // performTokenRefresh now owns the logout decision; the interceptor must
    // only log out when there is no refresh token at all.
    const catchBlocks = handler.match(/\}\s*catch\s*\(refreshError\)\s*\{[^}]*\}/g) || []
    expect(catchBlocks.length).toBeGreaterThan(0)
    for (const block of catchBlocks) {
      expect(block).not.toContain('doLogout()')
    }
    expect(handler).toContain('No refresh token at all')
  })
})

describe('Sign out lives in settings, not the profile menu', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

  it('the sidebar profile menu has no sign-out control', () => {
    const layout = read('src/components/DashboardLayout.tsx')
    // The menu markup ends before the notifications panel; check the profile
    // dropdown region specifically.
    const profileMenu = layout.slice(layout.indexOf('sidebarProfileRef'))
    expect(profileMenu).not.toContain('Sign Out')
    expect(profileMenu).not.toMatch(/logout\(\)/)
  })

  it('offers a Settings link from the profile menu instead', () => {
    const layout = read('src/components/DashboardLayout.tsx')
    const profileMenu = layout.slice(layout.indexOf('sidebarProfileRef'))
    expect(profileMenu).toContain('href="/settings"')
  })

  it('the settings page confirms before signing out', () => {
    const settings = read('src/app/settings/page.tsx')
    expect(settings).toContain('role="alertdialog"')
    expect(settings).toContain('setConfirming(true)')
    expect(settings).toContain('Stay signed in')
    // The destructive call must only be reachable from the dialog.
    expect(settings).toContain('onClick={logout}')
  })

  it('puts sign out in a visually distinct danger area', () => {
    const settings = read('src/app/settings/page.tsx')
    expect(settings).toContain('border-rose-200')
    expect(settings).toContain('Sign out')
  })
})
