import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { profileAPI, businessAPI, authAPI, decodeJwt, isTokenExpired, setAuthLogoutCallback } from './api'
import { SUPER_ADMIN_EMAIL } from './utils'

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

      const storedBizId = await AsyncStorage.getItem('current_business_id')
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
      if (mapped.length > 0) {
        await AsyncStorage.setItem('current_business_id', String(mapped[0].business_id))
      }
    } catch {
    } finally {
      setBusinessesLoading(false)
    }
  }, [])

  const switchBusiness = useCallback(async (business: Business) => {
    setCurrentBusiness(business)
    await AsyncStorage.setItem('current_business_id', String(business.business_id))
  }, [])

  const fetchProfile = useCallback(async (): Promise<User | null> => {
    try {
      const res = await profileAPI.getMyProfile()
      const data = res.data

      const storedUser = await AsyncStorage.getItem('user')
      let parsed: any = null
      try { parsed = storedUser ? JSON.parse(storedUser) : null } catch {}

      const storedToken = await AsyncStorage.getItem('token')
      const jwtPayload = storedToken ? decodeJwt(storedToken) : null
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
      await AsyncStorage.setItem('user', JSON.stringify(profileUser))
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

  const setBusinessRole = useCallback(async (role: string) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, business_role: role }
      AsyncStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch {}
    await AsyncStorage.multiRemove(['token', 'refresh_token', 'user', 'current_business_id'])
    setToken(null)
    setUser(null)
    setBusinesses([])
    setCurrentBusiness(null)
    setProfileLoaded(false)
  }, [])

  useEffect(() => {
    const handleApiLogout = () => {
      setToken(null)
      setUser(null)
      setBusinesses([])
      setCurrentBusiness(null)
      setProfileLoaded(false)
    }
    setAuthLogoutCallback(handleApiLogout)
    return () => setAuthLogoutCallback(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token')
        const storedUser = await AsyncStorage.getItem('user')

        if (storedToken && storedUser && storedUser !== 'undefined') {
          setToken(storedToken)
          try { setUser(JSON.parse(storedUser)) } catch { await AsyncStorage.removeItem('user') }

          setIsLoading(false)
          await fetchProfile()
          await fetchBusinesses()
        } else {
          if (storedUser === 'undefined') await AsyncStorage.removeItem('user')
          setIsLoading(false)
        }
      } catch {
        setIsLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (newToken: string, newUser: User | null, newRefreshToken?: string) => {
    await AsyncStorage.setItem('token', newToken)
    await AsyncStorage.removeItem('current_business_id')
    if (newRefreshToken) {
      await AsyncStorage.setItem('refresh_token', newRefreshToken)
    }
    if (newUser) {
      await AsyncStorage.setItem('user', JSON.stringify(newUser))
    }
    setToken(newToken)
    setUser(newUser)
    if (newUser && !newUser.is_verified) {
      setPendingVerificationEmail(newUser.email)
    } else {
      setPendingVerificationEmail(null)
    }
    await fetchBusinesses()
  }, [fetchBusinesses])

  return (
    <AuthContext.Provider
      value={{
        user, token, isLoading, profileLoaded, login, logout, fetchProfile,
        setBusinessRole, isAuthenticated: !!token, isVerified: !!user?.is_verified,
        businesses, currentBusiness, switchBusiness, fetchBusinesses,
        businessesLoading, pendingVerificationEmail, setPendingVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
