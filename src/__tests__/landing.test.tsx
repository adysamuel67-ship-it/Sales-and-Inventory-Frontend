import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import LandingAuthActions from '@/components/LandingAuthActions'

const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}))

let mockAuthState: any = {}

jest.mock('@/lib/auth', () => ({
  useAuth: () => mockAuthState,
}))

const baseAuth = {
  isAuthenticated: true,
  isLoading: false,
  profileLoaded: true,
  isVerified: true,
  user: { id: 1, name: 'Ama', is_verified: true },
  currentBusiness: { business_id: 7, name: 'Ama Stores' },
  businessesLoading: false,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuthState = { ...baseAuth }
})

describe('Landing page for signed-in users', () => {
  it('redirects straight to the current business dashboard', async () => {
    render(<LandingAuthActions />)

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/business/7/dashboard')
    )
    expect(screen.getByText(/taking you to your workspace/i)).toBeInTheDocument()
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
  })

  it('sends unverified users to verification', async () => {
    mockAuthState = {
      ...baseAuth,
      isVerified: false,
      user: { id: 1, name: 'Ama', is_verified: false },
    }

    render(<LandingAuthActions />)

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/verify'))
  })

  it('sends verified users without a business to the business picker', async () => {
    mockAuthState = { ...baseAuth, currentBusiness: null }

    render(<LandingAuthActions />)

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/businesses'))
  })

  it('waits for businesses to load before choosing a destination', async () => {
    mockAuthState = { ...baseAuth, currentBusiness: null, businessesLoading: true }

    render(<LandingAuthActions />)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('shows the sign-in actions when nobody is signed in', async () => {
    mockAuthState = {
      ...baseAuth,
      isAuthenticated: false,
      user: null,
      currentBusiness: null,
      isVerified: false,
    }

    render(<LandingAuthActions />)

    expect(await screen.findByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Get Started Free')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
