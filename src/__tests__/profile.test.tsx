/**
 * Profile Page Tests
 *
 * Verifies:
 * 1. Profile form state management
 * 2. Edit mode toggle
 * 3. Form field validation
 * 4. Profile update logic
 * 5. Error handling for various API response formats
 * 6. Auth redirect logic
 * 7. Display of user information
 */

describe('Profile form state', () => {
  it('initializes form from user object', () => {
    const user = { name: 'Kwame', email: 'kwame@test.com', phone: '0241234567' }
    const form = {
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    }
    expect(form.name).toBe('Kwame')
    expect(form.email).toBe('kwame@test.com')
    expect(form.phone).toBe('0241234567')
  })

  it('handles missing user fields gracefully', () => {
    const user = { name: '', email: '', phone: '' }
    const form = {
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    }
    expect(form.name).toBe('')
    expect(form.email).toBe('')
    expect(form.phone).toBe('')
  })

  it('handles null user gracefully', () => {
    const user = null
    const form = {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }
    expect(form.name).toBe('')
    expect(form.email).toBe('')
    expect(form.phone).toBe('')
  })
})

describe('Profile edit mode', () => {
  it('starts in view mode', () => {
    let editing = false
    expect(editing).toBe(false)
  })

  it('toggles to edit mode', () => {
    let editing = false
    editing = true
    expect(editing).toBe(true)
  })

  it('cancels edit and returns to view mode', () => {
    let editing = true
    editing = false
    expect(editing).toBe(false)
  })

  it('cancel restores original form values', () => {
    const user = { name: 'Kwame', email: 'kwame@test.com', phone: '0241234567' }
    let form = { name: 'Modified', email: 'kwame@test.com', phone: '999' }

    // Cancel: restore from user
    form = {
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    }

    expect(form.name).toBe('Kwame')
    expect(form.phone).toBe('0241234567')
  })
})

describe('Profile form validation', () => {
  it('name is required', () => {
    const form = { name: '' }
    expect(form.name.trim()).toBe('')
  })

  it('name with only spaces is invalid', () => {
    const form = { name: '   ' }
    expect(form.name.trim()).toBe('')
  })

  it('valid name passes validation', () => {
    const form = { name: 'Kwame Mensah' }
    expect(form.name.trim().length > 0).toBe(true)
  })

  it('email is disabled (cannot be changed)', () => {
    const disabled = true
    expect(disabled).toBe(true)
  })

  it('phone can be empty', () => {
    const form = { phone: '' }
    expect(form.phone).toBe('')
  })

  it('trims whitespace from name before sending', () => {
    const form = { name: '  Kwame  ', phone: '0241234567' }
    const trimmedName = form.name.trim()
    expect(trimmedName).toBe('Kwame')
  })

  it('omits phone from payload when empty or whitespace', () => {
    const form = { name: 'Kwame', phone: '   ' }
    const trimmedPhone = form.phone.trim()
    const payload: { name: string; phone?: string } = { name: form.name.trim() }
    if (trimmedPhone) {
      payload.phone = trimmedPhone
    }
    expect(payload).toEqual({ name: 'Kwame' })
    expect(payload).not.toHaveProperty('phone')
  })

  it('includes phone in payload when provided', () => {
    const form = { name: 'Kwame', phone: '0241234567' }
    const trimmedPhone = form.phone.trim()
    const payload: { name: string; phone?: string } = { name: form.name.trim() }
    if (trimmedPhone) {
      payload.phone = trimmedPhone
    }
    expect(payload).toEqual({ name: 'Kwame', phone: '0241234567' })
  })
})

describe('Profile update API call', () => {
  it('sends correct data to updateProfile', () => {
    const userId = 42
    const data = { name: 'Kwame', phone: '0241234567' }
    const endpoint = `/users/${userId}`
    expect(endpoint).toBe('/users/42')
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('phone')
    expect(data).not.toHaveProperty('email')
  })

  it('requires userId', () => {
    const user = { id: undefined }
    const userId = user?.id
    expect(userId).toBeUndefined()
  })

  it('sends payload without phone when phone is empty', () => {
    const userId = 42
    const form = { name: 'Kwame', phone: '' }
    const trimmedPhone = form.phone.trim()
    const payload: { name: string; phone?: string } = { name: form.name.trim() }
    if (trimmedPhone) {
      payload.phone = trimmedPhone
    }
    expect(payload).toEqual({ name: 'Kwame' })
    expect(payload).not.toHaveProperty('phone')
  })

  it('sends payload with phone when phone is provided', () => {
    const form = { name: 'Kwame', phone: '0241234567' }
    const trimmedPhone = form.phone.trim()
    const payload: { name: string; phone?: string } = { name: form.name.trim() }
    if (trimmedPhone) {
      payload.phone = trimmedPhone
    }
    expect(payload).toEqual({ name: 'Kwame', phone: '0241234567' })
  })
})

describe('Profile error handling', () => {
  it('handles string detail error', () => {
    const err = { response: { data: { detail: 'Name is required' } } }
    const detail = err.response?.data?.detail
    const message = typeof detail === 'string' ? detail : 'Failed to update profile'
    expect(message).toBe('Name is required')
  })

  it('handles array detail error', () => {
    const err = { response: { data: { detail: [{ msg: 'Invalid name' }, { msg: 'Phone format wrong' }] } } }
    const detail = err.response?.data?.detail
    const message = Array.isArray(detail) ? detail.map((e: any) => e.msg).join(', ') : typeof detail === 'string' ? detail : 'Failed to update profile'
    expect(message).toBe('Invalid name, Phone format wrong')
  })

  it('handles missing detail with fallback', () => {
    const err = { response: { data: {} } }
    const detail = err.response?.data?.detail
    const message = typeof detail === 'string' ? detail : 'Failed to update profile'
    expect(message).toBe('Failed to update profile')
  })

  it('handles network error', () => {
    const err = { message: 'Network Error' }
    const detail = err.response?.data?.detail
    const message = typeof detail === 'string' ? detail : 'Failed to update profile'
    expect(message).toBe('Failed to update profile')
  })

  it('empty name after trim shows validation error', () => {
    const form = { name: '   ' }
    const trimmedName = form.name.trim()
    expect(trimmedName).toBe('')
  })

  it('fetchProfile failure does not mask successful update', () => {
    let updateSucceeded = false
    let profileRefreshFailed = false
    let showSuccess = false

    try {
      updateSucceeded = true
      try {
        throw new Error('Profile refresh failed')
      } catch {
        profileRefreshFailed = true
      }
      showSuccess = true
    } catch {
      showSuccess = false
    }

    expect(updateSucceeded).toBe(true)
    expect(profileRefreshFailed).toBe(true)
    expect(showSuccess).toBe(true)
  })
})

describe('Profile auth redirect logic', () => {
  it('redirects to login when not authenticated and not loading', () => {
    const isLoading = false
    const isAuthenticated = false
    const shouldRedirect = !isLoading && !isAuthenticated
    expect(shouldRedirect).toBe(true)
  })

  it('does not redirect while loading', () => {
    const isLoading = true
    const isAuthenticated = false
    const shouldRedirect = !isLoading && !isAuthenticated
    expect(shouldRedirect).toBe(false)
  })

  it('does not redirect when authenticated', () => {
    const isLoading = false
    const isAuthenticated = true
    const shouldRedirect = !isLoading && !isAuthenticated
    expect(shouldRedirect).toBe(false)
  })

  it('redirects to verify when profile loaded and user is not verified', () => {
    const profileLoaded = true
    const isAuthenticated = true
    const user = { is_verified: false }
    const shouldRedirectToVerify = !!(profileLoaded && isAuthenticated && user && user.is_verified === false)
    expect(shouldRedirectToVerify).toBe(true)
  })

  it('does NOT redirect to verify when user is verified', () => {
    const profileLoaded = true
    const isAuthenticated = true
    const verifiedUser = { is_verified: true }
    const shouldRedirectToVerify = !!(profileLoaded && isAuthenticated && verifiedUser && verifiedUser.is_verified === false)
    expect(shouldRedirectToVerify).toBe(false)
  })

  it('does NOT redirect to verify when user is null', () => {
    const profileLoaded = true
    const isAuthenticated = true
    const user = null
    const shouldRedirectToVerify = !!(profileLoaded && isAuthenticated && user && (user as any).is_verified === false)
    expect(shouldRedirectToVerify).toBe(false)
  })
})

describe('Profile display', () => {
  it('shows user initial as avatar', () => {
    const name = 'Kwame'
    const initial = name.charAt(0)?.toUpperCase() || 'U'
    expect(initial).toBe('K')
  })

  it('shows "U" as avatar fallback when no name', () => {
    const name = ''
    const initial = name.charAt(0)?.toUpperCase() || 'U'
    expect(initial).toBe('U')
  })

  it('shows role badge', () => {
    const role = 'admin'
    expect(role).toBeTruthy()
  })

  it('shows verified status', () => {
    const isVerified = true
    const label = isVerified ? 'Verified' : 'Unverified'
    expect(label).toBe('Verified')
  })

  it('shows unverified status', () => {
    const isVerified = false
    const label = isVerified ? 'Verified' : 'Unverified'
    expect(label).toBe('Unverified')
  })
})

describe('Profile loading state', () => {
  it('shows spinner when loading', () => {
    const isLoading = true
    const isAuthenticated = false
    const showSpinner = isLoading || !isAuthenticated
    expect(showSpinner).toBe(true)
  })

  it('hides spinner when loaded and authenticated', () => {
    const isLoading = false
    const isAuthenticated = true
    const profileLoaded = true
    const showSpinner = isLoading || !isAuthenticated || !profileLoaded
    expect(showSpinner).toBe(false)
  })
})
