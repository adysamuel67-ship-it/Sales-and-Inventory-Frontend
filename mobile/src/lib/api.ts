import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from './constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

export function decodeJwt(token: string): any {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJwt(token)
  if (!payload || !payload.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now + bufferSeconds
}

let isRefreshing = false
let refreshPromise: Promise<string> | null = null
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token!)
  })
  failedQueue = []
}

function extractAccessToken(data: any): string | null {
  if (!data || typeof data !== 'object') return null
  return data.access_token || data.token || null
}

async function performTokenRefresh(retries = 2): Promise<string> {
  const refreshToken = await AsyncStorage.getItem('refresh_token')
  const accessToken = await AsyncStorage.getItem('token')
  if (!refreshToken) throw new Error('No refresh token')

  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
      }, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshToken}` },
        timeout: 60000,
      })

      const newToken = extractAccessToken(data)
      if (!newToken) throw new Error('No access token in refresh response')

      const newRefresh = data.refresh_token || refreshToken
      await AsyncStorage.setItem('token', newToken)
      await AsyncStorage.setItem('refresh_token', newRefresh)
      return newToken
    } catch (err: any) {
      lastErr = err
      if (err.response?.status === 401 || err.response?.status === 403) throw err
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  throw lastErr
}

function startRefresh(): Promise<string> {
  if (!refreshPromise) {
    isRefreshing = true
    refreshPromise = performTokenRefresh()
      .finally(() => { isRefreshing = false; refreshPromise = null })
  }
  return refreshPromise
}

async function attachToken(config: any) {
  const url = config?.url || ''
  const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') ||
    url.includes('/auth/logout') || url.includes('/users/sign_up') || url.includes('/auth/otp/get_code') ||
    url.includes('/auth/otp/verification') || url.includes('/auth/verify_user')
  if (!isAuthEndpoint) {
    let token = await AsyncStorage.getItem('token')
    if (!token) return Promise.reject(new Error('No auth token'))
    if (isTokenExpired(token, 120)) {
      try { token = await startRefresh() } catch { return Promise.reject(new Error('Token refresh failed')) }
    }
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

api.interceptors.request.use(attachToken)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const url = originalRequest?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') ||
      url.includes('/auth/logout') || url.includes('/users/sign_up') || url.includes('/auth/otp/get_code') ||
      url.includes('/auth/otp/verification') || url.includes('/auth/verify_user')

    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (originalRequest._retry) {
        await doLogout()
        return Promise.reject(error)
      }
      const refreshToken = await AsyncStorage.getItem('refresh_token')
      if (refreshToken) {
        originalRequest._retry = true
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
        }
        isRefreshing = true
        try {
          const newToken = await startRefresh()
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch (err) {
          processQueue(err, null)
          await doLogout()
        } finally {
          isRefreshing = false
        }
      } else {
        await doLogout()
      }
    }
    return Promise.reject(error)
  }
)

async function doLogout() {
  try {
    const token = await AsyncStorage.getItem('token')
    if (!token) return
    await AsyncStorage.multiRemove(['token', 'refresh_token', 'user', 'current_business_id'])
    if (onAuthLogout) onAuthLogout()
  } catch {}
}

let onAuthLogout: (() => void) | null = null

export function setAuthLogoutCallback(cb: (() => void) | null) {
  onAuthLogout = cb
}

export { doLogout }

export const authAPI = {
  signUp: (data: { name: string; email: string; password: string; phone: string }) =>
    api.post('/users/sign_up', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login',
      new URLSearchParams({ username: data.email, password: data.password }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),
  logout: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token')
      const accessToken = await AsyncStorage.getItem('token')
      if (refreshToken && accessToken) {
        await api.post('/auth/logout', { access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer' }, { timeout: 10000 })
      }
    } catch {}
  },
  sendVerification: (email: string) => api.post('/auth/otp/get_code', { email }),
  verifyEmail: (data: { email: string; code: string }) =>
    api.post('/auth/otp/verification', { email: data.email, otp: data.code }),
}

export const profileAPI = {
  getMyProfile: () => api.get('/users/me/profile'),
  updateProfile: (userId: number, data: { name?: string; phone?: string }) =>
    api.put(`/users/${userId}`, data),
  deleteProfile: (userId: number) => api.delete(`/users/${userId}`),
}

export const businessAPI = {
  create: (name: string) => api.post('/businesses/create', { name }),
  get: (id: number) => api.get(`/businesses/${id}`),
  update: (id: number, data: any) => api.put(`/businesses/${id}`, data),
  delete: (id: number) => api.delete(`/businesses/${id}`),
  leave: (id: number) => api.post(`/leave_business/${id}`),
  myBusinesses: () => api.get('/businesses/my_businesses'),
  listAll: () => api.get('/businesses/'),
  getBusinessKey: (businessId: number) => api.get(`/businesses/business_key/${businessId}`),
  sendApproval: (data: { business_key: string; reason: string; role: string }) =>
    api.post('/businesses/approvals/send_approval', data),
  getApprovals: (businessId: number, status?: string) =>
    api.get(`/businesses/approvals/get_approvals/${businessId}`, { params: status ? { status } : {} }),
  confirmApproval: (businessId: number, data: { approval_id: number; dir: 0 | 1; role?: string }) =>
    api.post(`/businesses/approvals/confirm_approvals/${businessId}`, data),
  updateMember: (businessId: number, memberId: number, data: { role?: string; is_active?: boolean }) =>
    api.put(`/businesses/${businessId}/members/${memberId}`, data),
  removeMember: (businessId: number, memberId: number) =>
    api.delete(`/businesses/leave_business/${businessId}/${memberId}`),
}

export const adminAPI = {
  listUsers: () => api.get('/users/'),
  listAllUsers: () => api.get('/users/all_users'),
  listMembers: () => api.get('/users/members'),
  getUser: (id: number) => api.get(`/users/${id}`),
  updateUser: (id: number, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
  activateUser: (id: number) => api.put(`/users/${id}/activate`),
  verifyUser: (email: string) => api.post('/auth/verify_user', { email }),
  triggerJob: (jobKey: string) => api.post(`/admin/crons/${jobKey}`),
}

export const cronAPI = {
  triggerJob: (jobKey: string) => api.post(`/admin/crons/${jobKey}`),
  listJobs: () => api.get('/admin/crons/jobs'),
}

export const productAPI = {
  list: (businessId: number, params?: any) => api.get(`/products/${businessId}`, { params }),
  get: (businessId: number, productId: number) => api.get(`/products/${businessId}/${productId}`),
  create: (businessId: number, data: any) => api.post(`/products/${businessId}`, data),
  update: (businessId: number, productId: number, data: any) => api.put(`/products/${businessId}/${productId}`, data),
  delete: (businessId: number, productId: number) => api.delete(`/products/${businessId}/${productId}`),
  lowStock: (businessId: number) => api.get(`/products/${businessId}/low_stock`),
}

export const saleAPI = {
  record: (businessId: number, data: any) => api.post(`/sales/${businessId}`, data),
  list: (businessId: number, params?: any) => api.get(`/sales/${businessId}`, { params }),
  get: (businessId: number, saleId: number) => api.get(`/sales/${businessId}/${saleId}`),
  delete: (businessId: number, saleId: number) => api.delete(`/sales/${businessId}/${saleId}`),
}

export const customerAPI = {
  list: (businessId: number, params?: any) => api.get(`/business/customers/${businessId}`, { params }),
  get: (businessId: number, customerId: number) => api.get(`/business/customers/${businessId}/${customerId}`),
  create: (businessId: number, data: any) => api.post(`/business/customers/${businessId}`, data),
  update: (businessId: number, customerId: number, data: any) => api.put(`/business/customers/${businessId}/${customerId}`, data),
  delete: (businessId: number, customerId: number) => api.delete(`/business/customers/${businessId}/${customerId}`),
  listWithDebt: (businessId: number, params?: any) => api.get(`/debts/customers/${businessId}`, { params }),
  getCustomerDebt: (businessId: number, customerId: number) => api.get(`/debts/customers/${businessId}/${customerId}`),
}

export const debtAPI = {
  getCustomerDebt: (businessId: number, customerId: number) => api.get(`/debts/customers/${businessId}/${customerId}`),
  listCustomersWithDebt: (businessId: number, params?: any) => api.get(`/debts/customers/${businessId}`, { params }),
  getTotalDebt: (businessId: number) => api.get(`/debts/${businessId}`),
  addDebt: (businessId: number, customerId: number, data: any) => api.post(`/debts/add_debt/${businessId}/${customerId}`, data),
  updateDebt: (businessId: number, customerId: number, data: any) => api.put(`/debts/update_customer_debt/${businessId}/${customerId}`, data),
  getCustomerTransactions: (businessId: number, customerId: number) => api.get(`/debts/customer_transactions/${businessId}/${customerId}`),
}

export const reportAPI = {
  profit: (businessId: number, date: string, endDate: string) =>
    api.get(`/reports/profit/${businessId}`, { params: { date, end_date: endDate } }),
  summary: (businessId: number, date: string, endDate: string) =>
    api.get(`/reports/analytics/dashboard/${businessId}`, { params: { date, end_date: endDate } }),
  dashboard: (businessId: number) => api.get(`/reports/analytics/dashboard/${businessId}`),
}

export default api
