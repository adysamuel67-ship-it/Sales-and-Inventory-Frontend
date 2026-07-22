'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { profileAPI, businessAPI, setTokenRefreshCallback, setAuthLogoutCallback, getUserIdFromToken, tryProactiveRefresh, startAutoRefresh, stopAutoRefresh, isTokenExpired, decodeJwt, resetLogoutGuard } from '@/lib/api'
import { SUPER_ADMIN_EMAIL } from '@/lib/utils'

interface User {
  id: number
  name: string
  email: string
  phone: string
  role: string
  business_role?: string
  business_id?: number
  is_verified?: boolean
  is_active?: boolean
  created_at?: string
}

interface Business {
  business_id: number
  name: string
  is_active?: boolean
  members?: number
  role?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  profileLoaded: boolean
  login: (token: string, user: User | null, refreshToken?: string) => void
  logout: () => void
  fetchProfile: () => Promise<User | null>
  setBusinessRole: (role: string) => void
  isAuthenticated: boolean
  isVerified: boolean
  businesses: Business[]
  currentBusiness: Business | null
  switchBusiness: (business: Business) => void
  fetchBusinesses: () => Promise<void>
  businessesLoading: boolean
  pendingVerificationEmail: string | null
  setPendingVerification: (email: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  profileLoaded: false,
  login: () => {},
  logout: () => {},
  fetchProfile: async () => null,
  setBusinessRole: () => {},
  isAuthenticated: false,
  isVerified: false,
  businesses: [],
  currentBusiness: null,
  switchBusiness: () => {},
  fetchBusinesses: async () => {},
  businessesLoading: false,
  pendingVerificationEmail: null,
  setPendingVerification: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null)
  const [businessesLoading, setBusinessesLoading] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  const setPendingVerification = useCallback((email: string | null) => {
    setPendingVerificationEmail(email)
  }, [])

  const fetchBusinesses = useCallback(async () => {
    setBusinessesLoading(true)
    try {
      const res = await businessAPI.myBusinesses()
      const data = Array.isArray(res.data) ? res.data : []
      const mapped: Business[] = data.map((item: any) => {
        const biz = item.business || item
        return {
          business_id: biz.business_id ?? biz.id,
          name: biz.name || 'Unnamed',
          is_active: biz.is_active,
          members: item.members,
          role: item.role || biz.role || undefined,
        }
      })
      setBusinesses(mapped)

      const storedBizId = localStorage.getItem('current_business_id')
      if (storedBizId) {
        const found = mapped.find((b) => b.business_id === parseInt(storedBizId))
        if (found) {
          setCurrentBusiness(found)
          setBusinessesLoading(false)
          return
        }
      }
      setCurrentBusiness((prev) => {
        if (prev) return prev
        return mapped.length > 0 ? mapped[0] : null
      })
      if (!storedBizId && mapped.length > 0) {
        localStorage.setItem('current_business_id', String(mapped[0].business_id))
      }
    } catch {
      // Failed to load businesses
    } finally {
      setBusinessesLoading(false)
    }
  }, [])

  const switchBusiness = useCallback((business: Business) => {
    setCurrentBusiness(business)
    localStorage.setItem('current_business_id', String(business.business_id))
  }, [])

  const fetchProfile = useCallback(async (): Promise<User | null> => {
    try {
      const res = await profileAPI.getMyProfile()
      const data = res.data

      const tokenName = localStorage.getItem('user')
      let parsed: any = null
      try { parsed = tokenName ? JSON.parse(tokenName) : null } catch {}

      const token = localStorage.getItem('token')
      const jwtPayload = token ? decodeJwt(token) : null
      const iatDate = jwtPayload?.iat ? new Date(jwtPayload.iat * 1000).toISOString() : undefined

      const profileUser: User = {
        id: data.user_id ?? data.id ?? parsed?.id,
        name: data.name || data.full_name || data.username || parsed?.name || (data.email || parsed?.email || '').split('@')[0] || 'User',
        email: data.email || parsed?.email || '',
        phone: data.phone || parsed?.phone || '',
        role: data.role || parsed?.role || 'user',
        business_id: data.business_id || data.business?.id || parsed?.business_id || undefined,
        is_verified: data.is_verified ?? parsed?.is_verified ?? true,
        is_active: data.is_active ?? parsed?.is_active ?? true,
        created_at: data.created_at || data.date_joined || data.joined_at || parsed?.created_at || iatDate,
      }
      if (profileUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        profileUser.role = 'super_admin'
      }
      setUser(profileUser)
      localStorage.setItem('user', JSON.stringify(profileUser))
      setProfileLoaded(true)
      if (!profileUser.is_verified) {
        setPendingVerificationEmail(profileUser.email)
      }
      return profileUser
    } catch {
      setProfileLoaded(true)
      return null
    }
  }, [])

  const setBusinessRole = useCallback((role: string) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, business_role: role }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }, [])

  const logout = useCallback(() => {
    stopAutoRefresh()
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('current_business_id')
    setToken(null)
    setUser(null)
    setRefreshTokenValue(null)
    setBusinesses([])
    setCurrentBusiness(null)
    setProfileLoaded(false)
  }, [])

  useEffect(() => {
    setTokenRefreshCallback((newToken: string) => {
      setToken(newToken)
    })
    setAuthLogoutCallback(() => {
      logout()
    })
    return () => {
      setTokenRefreshCallback(null)
      setAuthLogoutCallback(null)
    }
  }, [logout])

  useEffect(() => {
    let cancelled = false
    const storedToken = localStorage.getItem('token')
    const storedRefreshToken = localStorage.getItem('refresh_token')
    const storedUser = localStorage.getItem('user')

    const profileTimeout = setTimeout(() => {
      if (!cancelled) setProfileLoaded(true)
    }, 8000)

    if (storedToken && storedUser && storedUser !== 'undefined') {
      setToken(storedToken)
      if (storedRefreshToken) setRefreshTokenValue(storedRefreshToken)
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('user')
        setUser(null)
      }

      const init = async () => {
        setIsLoading(false)
        startAutoRefresh(3 * 60 * 1000)
        await fetchProfile()
        await fetchBusinesses()
        if (isTokenExpired(storedToken, 120) && storedRefreshToken) {
          tryProactiveRefresh().then((refreshed) => {
            if (cancelled) return
            if (refreshed) setToken(refreshed)
          }).catch(() => {})
        }
      }
      init()
    } else {
      if (storedUser === 'undefined') localStorage.removeItem('user')
      setIsLoading(false)
    }
    return () => {
      cancelled = true
      clearTimeout(profileTimeout)
      stopAutoRefresh()
    }
  }, [])

  const login = useCallback((newToken: string, newUser: User | null, newRefreshToken?: string) => {
    resetLogoutGuard()
    localStorage.setItem('token', newToken)
    localStorage.removeItem('current_business_id')
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken)
      setRefreshTokenValue(newRefreshToken)
    }
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser))
    }
    setToken(newToken)
    setUser(newUser)
    startAutoRefresh(3 * 60 * 1000)
    if (newUser && !newUser.is_verified) {
      setPendingVerificationEmail(newUser.email)
    } else {
      setPendingVerificationEmail(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken: refreshTokenValue,
        isLoading,
        profileLoaded,
        login,
        logout,
        fetchProfile,
        setBusinessRole,
        isAuthenticated: !!token,
        isVerified: !!user?.is_verified,
        businesses,
        currentBusiness,
        switchBusiness,
        fetchBusinesses,
        businessesLoading,
        pendingVerificationEmail,
        setPendingVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
