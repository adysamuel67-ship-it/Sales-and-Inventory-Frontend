'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { profileAPI, businessAPI, setTokenRefreshCallback, setAuthLogoutCallback, getUserIdFromToken, tryProactiveRefresh, startAutoRefresh, stopAutoRefresh, isTokenExpired, setLoginGrace, decodeJwt } from '@/lib/api'

interface User {
  id: number
  name: string
  email: string
  phone: string
  role: string
  business_id?: number
  is_verified?: boolean
  created_at?: string
}

interface Business {
  business_id: number
  name: string
  is_active?: boolean
  members?: number
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
        if (mapped.length > 0) {
          localStorage.setItem('current_business_id', String(mapped[0].business_id))
          return mapped[0]
        }
        return null
      })
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
      const userId = getUserIdFromToken()
      if (!userId) { setProfileLoaded(true); return null }
      const res = await profileAPI.getProfile(userId)
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
        is_verified: data.is_verified ?? parsed?.is_verified ?? false,
        created_at: data.created_at || data.date_joined || data.joined_at || parsed?.created_at || iatDate,
      }
      setUser(profileUser)
      localStorage.setItem('user', JSON.stringify(profileUser))
      setProfileLoaded(true)
      if (!profileUser.is_verified) {
        setPendingVerificationEmail(profileUser.email)
      }
      return profileUser
    } catch (err: any) {
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED'
      if (!isNetworkError) {
        setProfileLoaded(true)
      }
      return null
    }
  }, [])

  const logout = useCallback(() => {
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

    if (storedToken && storedUser && storedUser !== 'undefined') {
      setToken(storedToken)
      if (storedRefreshToken) setRefreshTokenValue(storedRefreshToken)
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('user')
        setUser(null)
      }

      const init = () => {
        setLoginGrace(60000)
        setIsLoading(false)
        startAutoRefresh(5 * 60 * 1000)
        fetchProfile()
        fetchBusinesses()
        if (isTokenExpired(storedToken, 60) && storedRefreshToken) {
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
      stopAutoRefresh()
    }
  }, [])

  const login = useCallback((newToken: string, newUser: User | null, newRefreshToken?: string) => {
    localStorage.setItem('token', newToken)
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken)
      setRefreshTokenValue(newRefreshToken)
    }
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser))
    }
    setToken(newToken)
    setUser(newUser)
    setLoginGrace(60000)
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
