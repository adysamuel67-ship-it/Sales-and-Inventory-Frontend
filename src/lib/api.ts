import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://smart-sales-and-inventory-ai-tracking.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

const profileApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

export function decodeJwt(token: string): any {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function getUserIdFromToken(): number | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('token')
  if (!token) return null
  const payload = decodeJwt(token)
  if (!payload) return null
  const sub = payload.user?.sub ?? payload.sub ?? payload.user?.id ?? payload.user_id ?? payload.id
  return sub != null ? Number(sub) : null
}

let onTokenRefreshed: ((newToken: string) => void) | null = null
let onAuthLogout: (() => void) | null = null

export function setTokenRefreshCallback(cb: ((newToken: string) => void) | null) {
  onTokenRefreshed = cb
}

export function setAuthLogoutCallback(cb: (() => void) | null) {
  onAuthLogout = cb
}

export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJwt(token)
  if (!payload || !payload.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now + bufferSeconds
}

let isRefreshing = false
let refreshPromise: Promise<string> | null = null
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = []

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error || new Error('Token refresh failed'))
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

function extractAccessToken(data: any): string | null {
  if (!data || typeof data !== 'object') return null
  return data.access_token || data.token || null
}

async function performTokenRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  const accessToken = localStorage.getItem('token')
  if (!refreshToken) throw new Error('No refresh token')

  let lastError: any = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
        timeout: 60000,
      })

      const newToken = extractAccessToken(data)
      if (!newToken) throw new Error('No access token in refresh response')

      const newRefresh = data.refresh_token || refreshToken
      localStorage.setItem('token', newToken)
      localStorage.setItem('refresh_token', newRefresh)
      loggedOut = false
      return newToken
    } catch (err: any) {
      lastError = err
      if (err.response?.status === 403) throw err
      if (attempt === 0) await new Promise((r) => setTimeout(r, 2000))
    }
  }
  throw lastError
}

function startRefresh(): Promise<string> {
  if (!refreshPromise) {
    isRefreshing = true
    refreshPromise = performTokenRefresh()
      .then((newToken) => {
        if (onTokenRefreshed) onTokenRefreshed(newToken)
        processQueue(null, newToken)
        return newToken
      })
      .catch((error) => {
        processQueue(error, null)
        throw error
      })
      .finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
  }
  return refreshPromise
}

export { startRefresh }

async function attachToken(config: any) {
  if (typeof window !== 'undefined') {
    const url = config?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') ||
      url.includes('/users/sign_up') || url.includes('/auth/otp/get_code') ||
      url.includes('/auth/otp/verification') || url.includes('/auth/verify_user')
    if (!isAuthEndpoint) {
      let token = localStorage.getItem('token')
      if (token && isTokenExpired(token, 120)) {
        try {
          token = await startRefresh()
        } catch {
          return Promise.reject(new Error('Token refresh failed'))
        }
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  }
  return config
}

api.interceptors.request.use(attachToken)
profileApi.interceptors.request.use(attachToken)

function handle401Interceptor(instance: any) {
  return async (error: any) => {
    const originalRequest = error.config
    const url = originalRequest?.url || ''

    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') ||
      url.includes('/users/sign_up') || url.includes('/auth/otp/get_code') ||
      url.includes('/auth/otp/verification') || url.includes('/auth/verify_user')

    if (error.response?.status === 401 && typeof window !== 'undefined' && !isAuthEndpoint) {
      if (originalRequest._retry === 'done') {
        doLogout()
        return Promise.reject(error)
      }

      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return instance(originalRequest)
          }).catch(() => {
            doLogout()
            return Promise.reject(error)
          })
        }

        originalRequest._retry = 'done'

        try {
          const newToken = await startRefresh()
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return instance(originalRequest)
        } catch {
          doLogout()
          return Promise.reject(error)
        }
      }

      doLogout()
    }
    return Promise.reject(error)
  }
}

let loggedOut = false

function doLogout() {
  if (loggedOut) return
  loggedOut = true
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  localStorage.removeItem('current_business_id')
  if (onAuthLogout) onAuthLogout()
}

export function resetLogoutGuard() {
  loggedOut = false
}

api.interceptors.response.use((response) => response, handle401Interceptor(api))

profileApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && typeof window !== 'undefined' && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        originalRequest._retry = true
        try {
          const newToken = await startRefresh()
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return profileApi(originalRequest)
        } catch {
          // Profile failure should not force logout — the main api interceptor handles that
        }
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  signUp: (data: { name: string; email: string; password: string; phone: string }) =>
    api.post('/users/sign_up', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login',
      new URLSearchParams({ username: data.email, password: data.password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),
  logout: () =>
    api.post('/auth/logout').catch(() => {}),
  sendVerification: (email: string) =>
    api.post('/auth/otp/get_code', { email }),
  verifyEmail: (data: { email: string; code: string }) =>
    api.post('/auth/otp/verification', { email: data.email, otp: data.code }),
}

export const profileAPI = {
  getProfile: (userId?: number) => {
    const id = userId ?? getUserIdFromToken()
    if (!id) return Promise.reject(new Error('No user ID available'))
    return profileApi.get(`/users/${id}`)
  },
  getMyProfile: () => profileApi.get('/users/me/profile'),
  updateProfile: (userId: number, data: { name?: string; phone?: string }) =>
    api.put(`/users/${userId}`, data),
  deleteProfile: (userId: number) =>
    api.delete(`/users/${userId}`),
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
  getMemberByUser: (userId: number) => api.get(`/users/members/${userId}`),
  updateUser: (id: number, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
  activateUser: (id: number) => api.put(`/users/${id}/activate`),
  verifyUser: (email: string) => api.post('/auth/verify_user', { email }),
}

export const productAPI = {
  list: (businessId: number) => api.get(`/products/${businessId}`),
  get: (businessId: number, productId: number) =>
    api.get(`/products/${businessId}/${productId}`),
  create: (businessId: number, data: any) =>
    api.post(`/products/${businessId}`, data),
  update: (businessId: number, productId: number, data: any) =>
    api.put(`/products/${businessId}/${productId}`, data),
  delete: (businessId: number, productId: number) =>
    api.delete(`/products/${businessId}/${productId}`),
  restock: (businessId: number, productId: number, quantity: number) =>
    api.post(`/products/${businessId}/${productId}/restock`, { quantity }),
  deactivate: (businessId: number, productId: number) =>
    api.patch(`/products/${businessId}/${productId}/deactivate`),
  lowStock: (businessId: number) =>
    api.get(`/products/${businessId}/low_stock`),
}

export const saleAPI = {
  record: (businessId: number, data: any) =>
    api.post(`/sales/${businessId}`, data),
  list: (businessId: number, params?: any) =>
    api.get(`/sales/${businessId}`, { params }),
  get: (businessId: number, saleId: number) =>
    api.get(`/sales/${businessId}/${saleId}`),
  update: (businessId: number, saleId: number, data: any) =>
    api.put(`/sale/${businessId}/${saleId}`, data),
  delete: (businessId: number, saleId: number) =>
    api.delete(`/sales/${businessId}/${saleId}`),
}

export const customerAPI = {
  list: (businessId: number, params?: any) =>
    api.get(`/business/customers/${businessId}`, { params }),
  get: (businessId: number, customerId: number) =>
    api.get(`/business/customers/${businessId}/${customerId}`),
  create: (businessId: number, data: any) =>
    api.post(`/business/customers/${businessId}`, data),
  update: (businessId: number, customerId: number, data: any) =>
    api.put(`/business/customers/${businessId}/${customerId}`, data),
  delete: (businessId: number, customerId: number) =>
    api.delete(`/business/customers/${businessId}/${customerId}`),
  deactivate: (businessId: number, customerId: number) =>
    api.put(`/business/customers/${businessId}/deactivate/${customerId}`),
  listWithDebt: (businessId: number, params?: any) =>
    api.get(`/debts/customers/${businessId}`, { params }),
  getCustomerDebt: (businessId: number, customerId: number) =>
    api.get(`/debts/customers/${businessId}/${customerId}`),
}

export const debtAPI = {
  getCustomerDebt: (businessId: number, customerId: number) =>
    api.get(`/debts/customers/${businessId}/${customerId}`),
  listCustomersWithDebt: (businessId: number, params?: any) =>
    api.get(`/debts/customers/${businessId}`, { params }),
  getTotalDebt: (businessId: number) =>
    api.get(`/debts/${businessId}`),
  addDebt: (businessId: number, customerId: number, data: any) =>
    api.post(`/debts/add_debt/${businessId}/${customerId}`, data),
  updateDebt: (businessId: number, customerId: number, data: any) =>
    api.put(`/debts/update_customer_debt/${businessId}/${customerId}`, data),
  getCustomerTransactions: (businessId: number, customerId: number) =>
    api.get(`/debts/customer_transactions/${businessId}/${customerId}`),
}

export const reportAPI = {
  profit: (businessId: number, date: string, endDate: string) =>
    api.get(`/reports/profit/${businessId}`, { params: { date, end_date: endDate } }),
  summary: (businessId: number, date: string, endDate: string) =>
    api.get(`/reports/analytics/dashboard/${businessId}`, { params: { date, end_date: endDate } }),
  dashboard: (businessId: number) =>
    api.get(`/reports/analytics/dashboard/${businessId}`),
}

export async function tryProactiveRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('token')
  const refreshToken = localStorage.getItem('refresh_token')
  if (!token || !refreshToken) return null
  if (!isTokenExpired(token, 120)) return token
  try {
    return await startRefresh()
  } catch {
    return null
  }
}

let refreshIntervalId: ReturnType<typeof setInterval> | null = null

export function startAutoRefresh(intervalMs = 5 * 60 * 1000) {
  stopAutoRefresh()
  refreshIntervalId = setInterval(() => {
    tryProactiveRefresh()
  }, intervalMs)
}

export function stopAutoRefresh() {
  if (refreshIntervalId !== null) {
    clearInterval(refreshIntervalId)
    refreshIntervalId = null
  }
}

export default api
