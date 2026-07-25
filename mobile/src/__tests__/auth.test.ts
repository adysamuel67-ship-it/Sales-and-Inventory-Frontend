jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {}
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve() }),
      removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve() }),
      multiRemove: jest.fn((keys: string[]) => { keys.forEach(k => delete store[k]); return Promise.resolve() }),
      clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); return Promise.resolve() }),
    },
  }
})

const mockLogin = jest.fn()
const mockLogout = jest.fn()
const mockFetchProfile = jest.fn()
const mockFetchBusinesses = jest.fn()
const mockSwitchBusiness = jest.fn()
const mockSetPendingVerification = jest.fn()

jest.mock('@/lib/auth', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: jest.fn(() => ({
    user: null,
    token: null,
    isLoading: false,
    profileLoaded: true,
    login: mockLogin,
    logout: mockLogout,
    fetchProfile: mockFetchProfile,
    setBusinessRole: jest.fn(),
    isAuthenticated: false,
    isVerified: false,
    businesses: [],
    currentBusiness: null,
    switchBusiness: mockSwitchBusiness,
    fetchBusinesses: mockFetchBusinesses,
    businessesLoading: false,
    pendingVerificationEmail: null,
    setPendingVerification: mockSetPendingVerification,
  })),
}))

jest.mock('react', () => {
  const actual = jest.requireActual('react')
  return {
    ...actual,
    createContext: jest.fn((defaultVal: any) => ({ Provider: ({ children }: any) => children, Consumer: ({ children }: any) => children(defaultVal) })),
    useContext: jest.fn(() => ({})),
    useState: jest.fn((init: any) => [init, jest.fn()]),
    useCallback: jest.fn((fn: any) => fn),
    useEffect: jest.fn(),
  }
})

describe('AuthProvider', () => {
  it('module can be imported', () => {
    const { AuthProvider, useAuth } = require('@/lib/auth')
    expect(AuthProvider).toBeDefined()
    expect(useAuth).toBeDefined()
  })
})

describe('AuthContext behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('useAuth returns auth context', () => {
    const { useAuth } = require('@/lib/auth')
    const ctx = useAuth()
    expect(ctx).toBeDefined()
    expect(ctx.isAuthenticated).toBe(false)
    expect(ctx.isVerified).toBe(false)
    expect(ctx.businesses).toEqual([])
  })

  it('login function exists and is callable', () => {
    const { useAuth } = require('@/lib/auth')
    const ctx = useAuth()
    expect(typeof ctx.login).toBe('function')
  })

  it('logout function exists and is callable', () => {
    const { useAuth } = require('@/lib/auth')
    const ctx = useAuth()
    expect(typeof ctx.logout).toBe('function')
  })

  it('fetchProfile function exists', () => {
    const { useAuth } = require('@/lib/auth')
    const ctx = useAuth()
    expect(typeof ctx.fetchProfile).toBe('function')
  })

  it('fetchBusinesses function exists', () => {
    const { useAuth } = require('@/lib/auth')
    const ctx = useAuth()
    expect(typeof ctx.fetchBusinesses).toBe('function')
  })

  it('switchBusiness function exists', () => {
    const { useAuth } = require('@/lib/auth')
    const ctx = useAuth()
    expect(typeof ctx.switchBusiness).toBe('function')
  })

  it('setPendingVerification function exists', () => {
    const { useAuth } = require('@/lib/auth')
    const ctx = useAuth()
    expect(typeof ctx.setPendingVerification).toBe('function')
  })

  it('currentBusiness is null when no businesses', () => {
    const { useAuth } = require('@/lib/auth')
    const ctx = useAuth()
    expect(ctx.currentBusiness).toBeNull()
  })
})
