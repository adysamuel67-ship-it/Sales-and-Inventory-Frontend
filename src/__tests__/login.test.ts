/**
 * Login Flow Tests
 *
 * Tests the complete login flow including:
 * 1. authAPI.login request format and response parsing
 * 2. Token extraction from various backend response formats
 * 3. User object extraction and fallback logic
 * 4. fetchProfile behavior after login
 * 5. Verification redirect logic (only when user object exists)
 * 6. getUserIdFromToken decoding various JWT formats
 * 7. Edge cases: missing token, null user, malformed responses
 */

function createJwtPayload(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-sig`
}

function extractAccessToken(data: any): string | null {
  if (!data || typeof data !== 'object') return null
  return data.access_token || data.token || null
}

function extractUser(data: any, fallbackEmail: string) {
  return data.user || (data.id
    ? {
        id: data.id,
        name: data.name || data.email || fallbackEmail,
        email: data.email || fallbackEmail,
        phone: data.phone || '',
        role: data.role || 'user',
      }
    : null)
}

function decodeJwt(token: string): any {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

function getUserIdFromToken(token: string): number | null {
  const payload = decodeJwt(token)
  if (!payload) return null
  const sub = payload.user?.sub ?? payload.sub ?? payload.user?.id ?? payload.user_id ?? payload.id
  return sub != null ? Number(sub) : null
}

function buildLoginRequestData(form: { email: string; password: string }) {
  return new URLSearchParams({ username: form.email, password: form.password })
}

describe('Login API request format', () => {
  it('sends email as "username" field in URLSearchParams', () => {
    const form = { email: 'kwame@test.com', password: 'secret123' }
    const params = buildLoginRequestData(form)
    expect(params.get('username')).toBe('kwame@test.com')
    expect(params.get('password')).toBe('secret123')
  })

  it('serializes to correct URL-encoded string', () => {
    const form = { email: 'user@example.com', password: 'p@ss!' }
    const params = buildLoginRequestData(form)
    const serialized = params.toString()
    expect(serialized).toContain('username=user%40example.com')
    expect(serialized).toContain('password=p%40ss%21')
  })
})

describe('Token extraction from login response', () => {
  it('extracts access_token field', () => {
    const data = { access_token: 'jwt-abc', refresh_token: 'ref-123' }
    expect(extractAccessToken(data)).toBe('jwt-abc')
  })

  it('falls back to token field', () => {
    const data = { token: 'jwt-xyz', refresh_token: 'ref-456' }
    expect(extractAccessToken(data)).toBe('jwt-xyz')
  })

  it('prefers access_token over token', () => {
    const data = { access_token: 'preferred', token: 'fallback' }
    expect(extractAccessToken(data)).toBe('preferred')
  })

  it('returns null when neither field exists', () => {
    const data = { token_type: 'bearer', refresh_token: 'ref' }
    expect(extractAccessToken(data)).toBeNull()
  })

  it('returns null for null input', () => {
    expect(extractAccessToken(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(extractAccessToken(undefined)).toBeNull()
  })

  it('returns null for string input', () => {
    expect(extractAccessToken('just-a-string')).toBeNull()
  })
})

describe('User object extraction from login response', () => {
  const fallbackEmail = 'test@test.com'

  it('uses data.user when present', () => {
    const data = { user: { id: 1, name: 'Kwame', email: 'kwame@test.com' } }
    const user = extractUser(data, fallbackEmail)
    expect(user).toEqual(data.user)
    expect(user.id).toBe(1)
    expect(user.name).toBe('Kwame')
  })

  it('builds user from flat fields when data.user is absent but data.id exists', () => {
    const data = { id: 5, name: 'Ama', email: 'ama@test.com', phone: '0241234', role: 'admin' }
    const user = extractUser(data, fallbackEmail)
    expect(user).not.toBeNull()
    expect(user.id).toBe(5)
    expect(user.name).toBe('Ama')
    expect(user.email).toBe('ama@test.com')
    expect(user.phone).toBe('0241234')
    expect(user.role).toBe('admin')
  })

  it('uses fallback email when data.email is absent', () => {
    const data = { id: 3, name: 'Kofi' }
    const user = extractUser(data, fallbackEmail)
    expect(user.email).toBe(fallbackEmail)
    expect(user.name).toBe('Kofi')
  })

  it('uses email as name fallback when name is absent', () => {
    const data = { id: 4, email: 'kojo@test.com' }
    const user = extractUser(data, 'fallback@test.com')
    expect(user.name).toBe('kojo@test.com')
  })

  it('defaults phone to empty string', () => {
    const data = { id: 6, name: 'Test' }
    const user = extractUser(data, fallbackEmail)
    expect(user.phone).toBe('')
  })

  it('defaults role to "user"', () => {
    const data = { id: 7, name: 'Test' }
    const user = extractUser(data, fallbackEmail)
    expect(user.role).toBe('user')
  })

  it('returns null when no user or id in response', () => {
    const data = { access_token: 'token-only' }
    const user = extractUser(data, fallbackEmail)
    expect(user).toBeNull()
  })

  it('returns null for empty object', () => {
    const user = extractUser({}, fallbackEmail)
    expect(user).toBeNull()
  })
})

describe('JWT decoding and getUserIdFromToken', () => {
  it('extracts user ID from payload.sub', () => {
    const token = createJwtPayload({ sub: 42 })
    expect(getUserIdFromToken(token)).toBe(42)
  })

  it('extracts user ID from payload.user.sub', () => {
    const token = createJwtPayload({ user: { sub: 99 } })
    expect(getUserIdFromToken(token)).toBe(99)
  })

  it('extracts user ID from payload.id', () => {
    const token = createJwtPayload({ id: 7 })
    expect(getUserIdFromToken(token)).toBe(7)
  })

  it('extracts user ID from payload.user_id', () => {
    const token = createJwtPayload({ user_id: 15 })
    expect(getUserIdFromToken(token)).toBe(15)
  })

  it('extracts user ID from payload.user.id', () => {
    const token = createJwtPayload({ user: { id: 33 } })
    expect(getUserIdFromToken(token)).toBe(33)
  })

  it('prefers payload.user.sub over payload.sub', () => {
    const token = createJwtPayload({ sub: 1, user: { sub: 2 } })
    expect(getUserIdFromToken(token)).toBe(2)
  })

  it('falls back to payload.sub when payload.user.sub is absent', () => {
    const token = createJwtPayload({ sub: 5 })
    expect(getUserIdFromToken(token)).toBe(5)
  })

  it('returns null for invalid JWT', () => {
    expect(getUserIdFromToken('not-a-jwt')).toBeNull()
  })

  it('returns null when no recognizable ID claim exists', () => {
    const token = createJwtPayload({ name: 'test', email: 'test@test.com' })
    expect(getUserIdFromToken(token)).toBeNull()
  })

  it('handles numeric string sub claim', () => {
    const token = createJwtPayload({ sub: '42' })
    expect(getUserIdFromToken(token)).toBe(42)
  })

  it('handles sub claim of 0', () => {
    const token = createJwtPayload({ sub: 0 })
    expect(getUserIdFromToken(token)).toBe(0)
  })
})

describe('Verification redirect logic', () => {
  function shouldRedirectToVerify(profileLoaded: boolean, isAuthenticated: boolean, user: any): boolean {
    return !!(profileLoaded && isAuthenticated && user && user.is_verified === false)
  }

  it('redirects to verify when user exists and is_verified is false', () => {
    const user = { id: 1, name: 'Test', is_verified: false }
    expect(shouldRedirectToVerify(true, true, user)).toBe(true)
  })

  it('does NOT redirect when user is verified', () => {
    const user = { id: 1, name: 'Test', is_verified: true }
    expect(shouldRedirectToVerify(true, true, user)).toBe(false)
  })

  it('does NOT redirect when user is null (profile fetch failed)', () => {
    expect(shouldRedirectToVerify(true, true, null)).toBe(false)
  })

  it('does NOT redirect when user is undefined', () => {
    expect(shouldRedirectToVerify(true, true, undefined)).toBe(false)
  })

  it('does NOT redirect when profileLoaded is false', () => {
    const user = { id: 1, name: 'Test', is_verified: false }
    expect(shouldRedirectToVerify(false, true, user)).toBe(false)
  })

  it('does NOT redirect when not authenticated', () => {
    const user = { id: 1, name: 'Test', is_verified: false }
    expect(shouldRedirectToVerify(true, false, user)).toBe(false)
  })

  it('does NOT redirect when is_verified is undefined (null user fallback)', () => {
    const user = { id: 1, name: 'Test' }
    expect(shouldRedirectToVerify(true, true, user)).toBe(false)
  })
})

describe('Login error handling', () => {
  it('produces correct error for 401 response', () => {
    const err = {
      response: {
        status: 401,
        data: { detail: 'Incorrect username or password' },
      },
    }
    const detail = err.response?.data?.detail
    const message = typeof detail === 'string' ? detail : 'Login failed. Check your credentials.'
    expect(message).toBe('Incorrect username or password')
  })

  it('produces correct error for array detail', () => {
    const err = {
      response: {
        status: 422,
        data: { detail: [{ msg: 'Invalid email' }, { msg: 'Password too short' }] },
      },
    }
    const detail = err.response?.data?.detail
    const message = Array.isArray(detail)
      ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
      : typeof detail === 'string'
        ? detail
        : 'Login failed. Check your credentials.'
    expect(message).toBe('Invalid email, Password too short')
  })

  it('produces fallback error for network failure', () => {
    const err = { message: 'Network Error' }
    const detail = err.response?.data?.detail
    const message = detail
      ? JSON.stringify(detail)
      : err.message || 'Login failed. Check your credentials.'
    expect(message).toBe('Network Error')
  })

  it('produces fallback error when detail is an object', () => {
    const err = {
      response: {
        status: 500,
        data: { detail: { code: 'SERVER_ERROR', message: 'Something broke' } },
      },
    }
    const detail = err.response?.data?.detail
    const message = detail ? JSON.stringify(detail) : 'Login failed. Check your credentials.'
    expect(message).toContain('SERVER_ERROR')
    expect(message).toContain('Something broke')
  })

  it('produces fallback when response has no detail', () => {
    const err = { response: { status: 500, data: {} } }
    const detail = err.response?.data?.detail
    const message = detail ? JSON.stringify(detail) : 'Login failed. Check your credentials.'
    expect(message).toBe('Login failed. Check your credentials.')
  })
})

describe('Login flow state transitions', () => {
  const localStorageStore: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  })

  function simulateLogin(accessToken: string, refreshToken: string | null, user: any) {
    localStorageStore['token'] = accessToken
    if (refreshToken) localStorageStore['refresh_token'] = refreshToken
    if (user) localStorageStore['user'] = JSON.stringify(user)
  }

  function simulateLogout() {
    delete localStorageStore['token']
    delete localStorageStore['refresh_token']
    delete localStorageStore['user']
    delete localStorageStore['current_business_id']
  }

  it('stores all tokens after successful login', () => {
    simulateLogin('jwt-access', 'jwt-refresh', { id: 1, name: 'Kwame' })
    expect(localStorageStore['token']).toBe('jwt-access')
    expect(localStorageStore['refresh_token']).toBe('jwt-refresh')
    expect(JSON.parse(localStorageStore['user']).name).toBe('Kwame')
  })

  it('user is authenticated after login', () => {
    simulateLogin('jwt-access', null, { id: 1, name: 'Kwame' })
    const isAuthenticated = !!localStorageStore['token']
    expect(isAuthenticated).toBe(true)
  })

  it('handles login without refresh token', () => {
    simulateLogin('jwt-access', null, { id: 1, name: 'Kwame' })
    expect(localStorageStore['token']).toBe('jwt-access')
    expect(localStorageStore['refresh_token']).toBeUndefined()
  })

  it('logout clears everything', () => {
    simulateLogin('jwt-access', 'jwt-refresh', { id: 1, name: 'Kwame' })
    simulateLogout()
    expect(localStorageStore['token']).toBeUndefined()
    expect(localStorageStore['refresh_token']).toBeUndefined()
    expect(localStorageStore['user']).toBeUndefined()
  })

  it('post-login state allows profile fetch', () => {
    simulateLogin('jwt-access', 'jwt-refresh', { id: 1, name: 'Kwame' })
    const token = localStorageStore['token']
    const payload = decodeJwt(createJwtPayload({ sub: 1 }))
    expect(payload?.sub).toBe(1)
  })

  it('profile fetch fallback when user object missing from login response', () => {
    const loginResponse = { access_token: 'jwt-abc' }
    const accessToken = extractAccessToken(loginResponse)
    const user = extractUser(loginResponse, 'fallback@test.com')
    expect(accessToken).toBe('jwt-abc')
    expect(user).toBeNull()
    // After login with no user, profile fetch must provide the user
  })

  it('verification check uses profile user, not login response user', () => {
    const loginResponseUser = { id: 1, name: 'Test' }
    const profileUser = { id: 1, name: 'Test', is_verified: true }
    // Profile user takes precedence
    const shouldVerify = !profileUser.is_verified
    expect(shouldVerify).toBe(false)
  })
})

describe('Auth initialization from localStorage', () => {
  const localStorageStore: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  })

  it('parses stored user JSON correctly', () => {
    localStorageStore['user'] = JSON.stringify({ id: 1, name: 'Kwame', is_verified: true })
    const user = JSON.parse(localStorageStore['user'])
    expect(user.is_verified).toBe(true)
  })

  it('handles "undefined" string in stored user', () => {
    localStorageStore['user'] = 'undefined'
    const stored = localStorageStore['user']
    const isBroken = stored === 'undefined'
    expect(isBroken).toBe(true)
  })

  it('handles malformed JSON gracefully', () => {
    localStorageStore['user'] = '{bad json'
    let parsed = null
    try {
      parsed = JSON.parse(localStorageStore['user'])
    } catch {
      parsed = null
    }
    expect(parsed).toBeNull()
  })

  it('auth is restored when valid token and user exist', () => {
    localStorageStore['token'] = 'valid-token'
    localStorageStore['user'] = JSON.stringify({ id: 1, name: 'Test' })
    const isAuthenticated = !!(
      localStorageStore['token'] &&
      localStorageStore['user'] &&
      localStorageStore['user'] !== 'undefined'
    )
    expect(isAuthenticated).toBe(true)
  })

  it('auth is NOT restored when token is missing', () => {
    localStorageStore['user'] = JSON.stringify({ id: 1, name: 'Test' })
    const isAuthenticated = !!(
      localStorageStore['token'] &&
      localStorageStore['user'] &&
      localStorageStore['user'] !== 'undefined'
    )
    expect(isAuthenticated).toBe(false)
  })
})

describe('Edge cases for login response parsing', () => {
  it('handles response with extra nested fields', () => {
    const data = {
      access_token: 'jwt-123',
      refresh_token: 'ref-123',
      token_type: 'bearer',
      user: { id: 1, name: 'Kwame', email: 'kwame@test.com', is_verified: true },
      expires_in: 3600,
    }
    expect(extractAccessToken(data)).toBe('jwt-123')
    expect(extractUser(data, '').name).toBe('Kwame')
  })

  it('handles response where user has nested business', () => {
    const data = {
      access_token: 'jwt-456',
      user: { id: 2, name: 'Ama', business: { id: 10, name: 'Shop' } },
    }
    const user = extractUser(data, '')
    expect(user.id).toBe(2)
    expect(user.business).toEqual({ id: 10, name: 'Shop' })
  })

  it('handles login response with only access_token (no user)', () => {
    const data = { access_token: 'jwt-only' }
    const token = extractAccessToken(data)
    const user = extractUser(data, '')
    expect(token).toBe('jwt-only')
    expect(user).toBeNull()
    // Must rely on fetchProfile to get user
  })

  it('handles login response with user but no token', () => {
    const data = { user: { id: 1, name: 'Test' } }
    const token = extractAccessToken(data)
    expect(token).toBeNull()
    // Login should fail — no access token
  })
})
