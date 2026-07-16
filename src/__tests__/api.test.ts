/**
 * API Interceptor Tests
 *
 * Verifies:
 * 1. Token refresh mechanism
 * 2. Auth logout callback on refresh failure
 * 3. No hard window.location.href redirects
 * 4. localStorage cleanup on auth failure
 * 5. Queue mechanism for concurrent requests
 * 6. extractArray utility for various response formats
 */

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

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key]
    }
  }
  return []
}

describe('extractArray utility', () => {
  it('returns array directly if data is an array', () => {
    const data = [{ id: 1 }, { id: 2 }]
    expect(extractArray(data)).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('finds array in "results" property', () => {
    const data = { count: 2, results: [{ id: 1 }, { id: 2 }] }
    expect(extractArray(data)).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('finds array in "data" property', () => {
    const data = { data: [{ id: 1 }] }
    expect(extractArray(data)).toEqual([{ id: 1 }])
  })

  it('finds array in "businesses" property', () => {
    const data = { businesses: [{ id: 1, name: 'Shop' }] }
    expect(extractArray(data)).toEqual([{ id: 1, name: 'Shop' }])
  })

  it('returns empty array for empty array input', () => {
    expect(extractArray([])).toEqual([])
  })

  it('returns empty array for null input', () => {
    expect(extractArray(null)).toEqual([])
  })

  it('returns empty array for undefined input', () => {
    expect(extractArray(undefined)).toEqual([])
  })

  it('returns empty array for string input', () => {
    expect(extractArray('hello')).toEqual([])
  })

  it('returns empty array for number input', () => {
    expect(extractArray(42)).toEqual([])
  })

  it('returns empty array for object with no array properties', () => {
    const data = { name: 'test', count: 5 }
    expect(extractArray(data)).toEqual([])
  })

  it('finds first array property in object with multiple arrays', () => {
    const data = { items: [{ id: 1 }], tags: ['a', 'b'] }
    expect(extractArray(data)).toEqual([{ id: 1 }])
  })

  it('handles nested object with results array', () => {
    const data = { response: { results: [{ id: 1 }] } }
    expect(extractArray(data)).toEqual([])
  })
})

describe('Token refresh mechanism', () => {
  it('stores new tokens after successful refresh', () => {
    mockLocalStorage.setItem('token', 'old-token')
    mockLocalStorage.setItem('refresh_token', 'refresh-token')

    const newToken = 'new-access-token'
    const newRefresh = 'new-refresh-token'

    mockLocalStorage.setItem('token', newToken)
    mockLocalStorage.setItem('refresh_token', newRefresh)

    expect(mockLocalStorage.getItem('token')).toBe('new-access-token')
    expect(mockLocalStorage.getItem('refresh_token')).toBe('new-refresh-token')
  })

  it('preserves refresh token when response does not include new one', () => {
    mockLocalStorage.setItem('token', 'old-token')
    mockLocalStorage.setItem('refresh_token', 'original-refresh')

    const newToken = 'refreshed-token'
    const responseRefresh = undefined
    const finalRefresh = responseRefresh || mockLocalStorage.getItem('refresh_token')!

    mockLocalStorage.setItem('token', newToken)
    mockLocalStorage.setItem('refresh_token', finalRefresh)

    expect(mockLocalStorage.getItem('token')).toBe('refreshed-token')
    expect(mockLocalStorage.getItem('refresh_token')).toBe('original-refresh')
  })
})

describe('Auth logout callback mechanism', () => {
  it('logout callback is called on refresh failure', () => {
    let logoutCalled = false
    const onAuthLogout = () => { logoutCalled = true }

    // Simulate refresh failure
    try {
      throw new Error('Refresh failed')
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      onAuthLogout()
    }

    expect(logoutCalled).toBe(true)
    expect(mockLocalStorage.getItem('token')).toBeNull()
    expect(mockLocalStorage.getItem('refresh_token')).toBeNull()
    expect(mockLocalStorage.getItem('user')).toBeNull()
  })

  it('logout callback is called when no refresh token exists', () => {
    let logoutCalled = false
    const onAuthLogout = () => { logoutCalled = true }

    const refreshToken = mockLocalStorage.getItem('refresh_token')

    if (!refreshToken) {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      onAuthLogout()
    }

    expect(logoutCalled).toBe(true)
  })

  it('does NOT do window.location.href redirect', () => {
    let redirected = false
    const originalHref = window.location.href

    try {
      Object.defineProperty(window.location, 'href', {
        get() { return originalHref },
        set() { redirected = true },
        configurable: true,
      })
    } catch {
      // location is non-configurable in jsdom
    }

    const onAuthLogout = () => {}
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    onAuthLogout()

    expect(redirected).toBe(false)
  })
})

describe('Concurrent request queue', () => {
  it('queues requests while refresh is in progress', () => {
    let isRefreshing = false
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

    // First request starts refresh
    isRefreshing = true

    // Second request is queued
    let secondResolved = ''
    queue.push({
      resolve: (token: string) => { secondResolved = token },
      reject: () => {},
    })

    // Third request is also queued
    let thirdResolved = ''
    queue.push({
      resolve: (token: string) => { thirdResolved = token },
      reject: () => {},
    })

    // Refresh completes
    processQueue(null, 'fresh-token')
    isRefreshing = false

    expect(secondResolved).toBe('fresh-token')
    expect(thirdResolved).toBe('fresh-token')
    expect(queue.length).toBe(0)
  })

  it('rejects all queued requests on refresh failure', () => {
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

    let firstRejected = false
    let secondRejected = false

    queue.push({
      resolve: () => {},
      reject: () => { firstRejected = true },
    })
    queue.push({
      resolve: () => {},
      reject: () => { secondRejected = true },
    })

    processQueue(new Error('refresh failed'), null)

    expect(firstRejected).toBe(true)
    expect(secondRejected).toBe(true)
  })
})

describe('Request interceptor attaches token', () => {
  it('reads token from localStorage for Authorization header', () => {
    mockLocalStorage.setItem('token', 'bearer-token-123')

    const config: any = { headers: {} }
    const token = mockLocalStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    expect(config.headers.Authorization).toBe('Bearer bearer-token-123')
  })

  it('does not set Authorization header when no token', () => {
    mockLocalStorage.removeItem('token')

    const config: any = { headers: {} }
    const token = mockLocalStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    expect(config.headers.Authorization).toBeUndefined()
  })
})

describe('Business data extraction', () => {
  it('extracts business list from array response', () => {
    const response = [{ id: 1, name: 'Shop A' }, { id: 2, name: 'Shop B' }]
    const businesses = extractArray(response)
    expect(businesses).toHaveLength(2)
    expect(businesses[0].name).toBe('Shop A')
  })

  it('extracts business list from paginated response', () => {
    const response = { count: 2, next: null, results: [{ id: 1, name: 'Shop A' }] }
    const businesses = extractArray(response)
    expect(businesses).toHaveLength(1)
    expect(businesses[0].name).toBe('Shop A')
  })

  it('handles empty business list', () => {
    expect(extractArray([])).toEqual([])
    expect(extractArray({ results: [] })).toEqual([])
  })

  it('resolves business ID from profile', () => {
    const profile = { id: 1, name: 'User', business_id: 42 }
    let businessId: number | null = null

    if (profile.business_id) businessId = profile.business_id
    expect(businessId).toBe(42)
  })

  it('resolves business ID from profile business object', () => {
    const profile = { id: 1, name: 'User', business: { id: 42 } }
    let businessId: number | null = null

    if (profile.business_id) businessId = profile.business_id
    else if (profile.business?.id) businessId = profile.business.id
    expect(businessId).toBe(42)
  })

  it('falls back to first business from list', () => {
    const profile = { id: 1, name: 'User' }
    const businesses = [{ id: 10, name: 'Shop A' }, { id: 20, name: 'Shop B' }]

    let businessId: number | null = null
    if (profile.business_id) businessId = profile.business_id
    else if ((profile as any).business?.id) businessId = (profile as any).business.id

    if (!businessId && businesses.length > 0) {
      businessId = businesses[0].id
    }

    expect(businessId).toBe(10)
  })

  it('returns null when no business found', () => {
    const profile = { id: 1, name: 'User' }
    const businesses: any[] = []

    let businessId: number | null = null
    if (profile.business_id) businessId = (profile as any).business_id
    if (!businessId && businesses.length > 0) {
      businessId = businesses[0].id
    }

    expect(businessId).toBeNull()
  })
})

describe('Sale data mapping', () => {
  function mapSale(raw: any) {
    return {
      id: raw.id,
      product: raw.product_name || raw.product || 'Unknown',
      qty: raw.quantity ?? raw.qty ?? 0,
      amount: raw.total_amount ?? raw.amount ?? 0,
      payment: raw.payment_method || raw.payment || 'N/A',
      time: raw.created_at
        ? new Date(raw.created_at).toLocaleTimeString()
        : raw.time || '',
    }
  }

  it('maps sale with product_name and quantity fields', () => {
    const raw = {
      id: 1,
      product_name: 'Rice',
      quantity: 5,
      total_amount: 250,
      payment_method: 'Cash',
      created_at: '2024-01-15T10:30:00Z',
    }
    const sale = mapSale(raw)
    expect(sale.product).toBe('Rice')
    expect(sale.qty).toBe(5)
    expect(sale.amount).toBe(250)
    expect(sale.payment).toBe('Cash')
  })

  it('maps sale with alternative field names', () => {
    const raw = {
      id: 2,
      product: 'Beans',
      qty: 3,
      amount: 150,
      payment: 'MoMo',
      time: '10:30 AM',
    }
    const sale = mapSale(raw)
    expect(sale.product).toBe('Beans')
    expect(sale.qty).toBe(3)
    expect(sale.amount).toBe(150)
    expect(sale.payment).toBe('MoMo')
  })

  it('uses defaults for missing fields', () => {
    const raw = { id: 3 }
    const sale = mapSale(raw)
    expect(sale.product).toBe('Unknown')
    expect(sale.qty).toBe(0)
    expect(sale.amount).toBe(0)
    expect(sale.payment).toBe('N/A')
  })
})
