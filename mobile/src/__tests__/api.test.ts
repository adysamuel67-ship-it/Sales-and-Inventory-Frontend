import { decodeJwt, isTokenExpired } from '../lib/api'

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

jest.mock('axios', () => {
  const instance = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    defaults: { headers: { common: {} } },
  }
  return {
    __esModule: true,
    default: Object.assign(
      jest.fn(() => Promise.resolve({ data: {} })),
      {
        create: jest.fn(() => instance),
        post: jest.fn(() => Promise.resolve({ data: {} })),
        get: jest.fn(() => Promise.resolve({ data: {} })),
      }
    ),
    __mockAxiosInstance: instance,
  }
})

function makeToken(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: 1, exp })).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('decodeJwt', () => {
  it('decodes a valid token', () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 3600)
    const decoded = decodeJwt(token)
    expect(decoded).toBeTruthy()
    expect(decoded.sub).toBe(1)
    expect(decoded.exp).toBeGreaterThan(0)
  })
  it('returns null for invalid token', () => {
    expect(decodeJwt('invalid')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(decodeJwt('')).toBeNull()
  })
})

describe('isTokenExpired', () => {
  it('returns true for expired token', () => {
    const token = makeToken(Math.floor(Date.now() / 1000) - 3600)
    expect(isTokenExpired(token)).toBe(true)
  })
  it('returns false for valid token', () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 3600)
    expect(isTokenExpired(token)).toBe(false)
  })
  it('returns true for token about to expire within buffer', () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 30)
    expect(isTokenExpired(token, 60)).toBe(true)
  })
  it('returns true for invalid token', () => {
    expect(isTokenExpired('bad')).toBe(true)
  })
})

describe('API modules', () => {
  const getMockInstance = () => (require('axios') as any).__mockAxiosInstance

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('authAPI has correct methods', async () => {
    const { authAPI } = require('../lib/api')
    expect(typeof authAPI.login).toBe('function')
    expect(typeof authAPI.signUp).toBe('function')
    expect(typeof authAPI.logout).toBe('function')
    expect(typeof authAPI.sendVerification).toBe('function')
    expect(typeof authAPI.verifyEmail).toBe('function')
  })

  it('authAPI.login calls the correct endpoint', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: { access_token: 'tok' } })
    const { authAPI } = require('../lib/api')
    await authAPI.login({ email: 'test@test.com', password: 'pass123' })
    expect(getMockInstance().post).toHaveBeenCalledWith(
      '/auth/login',
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' }) })
    )
  })

  it('authAPI.signUp calls the correct endpoint', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: { message: 'ok' } })
    const { authAPI } = require('../lib/api')
    await authAPI.signUp({ name: 'Test', email: 'test@test.com', password: 'pass', phone: '123' })
    expect(getMockInstance().post).toHaveBeenCalledWith('/users/sign_up', expect.any(Object))
  })

  it('authAPI.sendVerification sends email', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: { message: 'sent' } })
    const { authAPI } = require('../lib/api')
    await authAPI.sendVerification('test@test.com')
    expect(getMockInstance().post).toHaveBeenCalledWith('/auth/otp/get_code', { email: 'test@test.com' })
  })

  it('authAPI.verifyEmail sends correct data', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: { message: 'verified' } })
    const { authAPI } = require('../lib/api')
    await authAPI.verifyEmail({ email: 'test@test.com', code: '123456' })
    expect(getMockInstance().post).toHaveBeenCalledWith('/auth/otp/verification', { email: 'test@test.com', otp: '123456' })
  })

  it('profileAPI.getMyProfile calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: { name: 'Test' } })
    const { profileAPI } = require('../lib/api')
    const res = await profileAPI.getMyProfile()
    expect(getMockInstance().get).toHaveBeenCalledWith('/users/me/profile')
    expect(res.data.name).toBe('Test')
  })

  it('businessAPI.create sends name', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: {} })
    const { businessAPI } = require('../lib/api')
    await businessAPI.create('My Biz')
    expect(getMockInstance().post).toHaveBeenCalledWith('/businesses/create', { name: 'My Biz' })
  })

  it('businessAPI.get calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: {} })
    const { businessAPI } = require('../lib/api')
    await businessAPI.get(1)
    expect(getMockInstance().get).toHaveBeenCalledWith('/businesses/1')
  })

  it('businessAPI.myBusinesses calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: [] })
    const { businessAPI } = require('../lib/api')
    await businessAPI.myBusinesses()
    expect(getMockInstance().get).toHaveBeenCalledWith('/businesses/my_businesses')
  })

  it('businessAPI.getBusinessKey calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: {} })
    const { businessAPI } = require('../lib/api')
    await businessAPI.getBusinessKey(5)
    expect(getMockInstance().get).toHaveBeenCalledWith('/businesses/business_key/5')
  })

  it('businessAPI.leave calls correct endpoint', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: {} })
    const { businessAPI } = require('../lib/api')
    await businessAPI.leave(1)
    expect(getMockInstance().post).toHaveBeenCalledWith('/leave_business/1')
  })

  it('adminAPI.listUsers calls /users/', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: [] })
    const { adminAPI } = require('../lib/api')
    await adminAPI.listUsers()
    expect(getMockInstance().get).toHaveBeenCalledWith('/users/')
  })

  it('adminAPI.listAllUsers calls /users/all_users', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: [] })
    const { adminAPI } = require('../lib/api')
    await adminAPI.listAllUsers()
    expect(getMockInstance().get).toHaveBeenCalledWith('/users/all_users')
  })

  it('adminAPI.updateUser calls PUT', async () => {
    getMockInstance().put.mockResolvedValueOnce({ data: {} })
    const { adminAPI } = require('../lib/api')
    await adminAPI.updateUser(1, { name: 'New' })
    expect(getMockInstance().put).toHaveBeenCalledWith('/users/1', { name: 'New' })
  })

  it('adminAPI.deleteUser calls DELETE', async () => {
    getMockInstance().delete.mockResolvedValueOnce({ data: {} })
    const { adminAPI } = require('../lib/api')
    await adminAPI.deleteUser(1)
    expect(getMockInstance().delete).toHaveBeenCalledWith('/users/1')
  })

  it('adminAPI.activateUser calls PUT', async () => {
    getMockInstance().put.mockResolvedValueOnce({ data: {} })
    const { adminAPI } = require('../lib/api')
    await adminAPI.activateUser(1)
    expect(getMockInstance().put).toHaveBeenCalledWith('/users/1/activate')
  })

  it('adminAPI.verifyUser calls POST', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: {} })
    const { adminAPI } = require('../lib/api')
    await adminAPI.verifyUser('test@test.com')
    expect(getMockInstance().post).toHaveBeenCalledWith('/auth/verify_user', { email: 'test@test.com' })
  })

  it('adminAPI.triggerJob calls POST', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: {} })
    const { adminAPI } = require('../lib/api')
    await adminAPI.triggerJob('daily')
    expect(getMockInstance().post).toHaveBeenCalledWith('/admin/crons/daily')
  })

  it('productAPI.list calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: [] })
    const { productAPI } = require('../lib/api')
    await productAPI.list(1)
    expect(getMockInstance().get).toHaveBeenCalledWith('/products/1')
  })

  it('productAPI.create sends data', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: {} })
    const { productAPI } = require('../lib/api')
    await productAPI.create(1, { name: 'Widget', price: 10 })
    expect(getMockInstance().post).toHaveBeenCalledWith('/products/1', { name: 'Widget', price: 10 })
  })

  it('productAPI.lowStock calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: [] })
    const { productAPI } = require('../lib/api')
    await productAPI.lowStock(1)
    expect(getMockInstance().get).toHaveBeenCalledWith('/products/1/low_stock')
  })

  it('saleAPI.record sends data', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: {} })
    const { saleAPI } = require('../lib/api')
    await saleAPI.record(1, { items: [] })
    expect(getMockInstance().post).toHaveBeenCalledWith('/sales/1', { items: [] })
  })

  it('saleAPI.list calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: [] })
    const { saleAPI } = require('../lib/api')
    await saleAPI.list(1, { date: '2024-01-01' })
    expect(getMockInstance().get).toHaveBeenCalledWith('/sales/1', { params: { date: '2024-01-01' } })
  })

  it('customerAPI.list calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: [] })
    const { customerAPI } = require('../lib/api')
    await customerAPI.list(1)
    expect(getMockInstance().get).toHaveBeenCalledWith('/business/customers/1', { params: undefined })
  })

  it('customerAPI.create sends data', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: {} })
    const { customerAPI } = require('../lib/api')
    await customerAPI.create(1, { name: 'Bob' })
    expect(getMockInstance().post).toHaveBeenCalledWith('/business/customers/1', { name: 'Bob' })
  })

  it('debtAPI.getTotalDebt calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: {} })
    const { debtAPI } = require('../lib/api')
    await debtAPI.getTotalDebt(1)
    expect(getMockInstance().get).toHaveBeenCalledWith('/debts/1')
  })

  it('debtAPI.addDebt sends data', async () => {
    getMockInstance().post.mockResolvedValueOnce({ data: {} })
    const { debtAPI } = require('../lib/api')
    await debtAPI.addDebt(1, 2, { amount: 100 })
    expect(getMockInstance().post).toHaveBeenCalledWith('/debts/add_debt/1/2', { amount: 100 })
  })

  it('reportAPI.profit calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: {} })
    const { reportAPI } = require('../lib/api')
    await reportAPI.profit(1, '2024-01-01', '2024-01-31')
    expect(getMockInstance().get).toHaveBeenCalledWith('/reports/profit/1', { params: { date: '2024-01-01', end_date: '2024-01-31' } })
  })

  it('reportAPI.dashboard calls correct endpoint', async () => {
    getMockInstance().get.mockResolvedValueOnce({ data: {} })
    const { reportAPI } = require('../lib/api')
    await reportAPI.dashboard(1)
    expect(getMockInstance().get).toHaveBeenCalledWith('/reports/analytics/dashboard/1')
  })
})
