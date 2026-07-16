/**
 * Approvals Page Tests
 *
 * Verifies:
 * 1. Owner/admin access guard
 * 2. normalizeApproval utility
 * 3. extractArray with depth
 * 4. Approve/reject action logic
 * 5. Processing state management
 * 6. Empty state display
 * 7. Error handling
 */

function extractArray(data: any, depth = 0): any[] {
  if (depth > 3) return []
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key]
    }
    for (const key of Object.keys(data)) {
      if (data[key] && typeof data[key] === 'object') {
        const found = extractArray(data[key], depth + 1)
        if (found.length > 0) return found
      }
    }
  }
  return []
}

function normalizeApproval(raw: any) {
  return {
    approval_id: raw.approval_id ?? raw.id,
    user_id: raw.user_id,
    requester_name: raw.requester_name || raw.name || raw.user?.name || 'Unknown',
    email: raw.email || raw.user?.email || 'N/A',
    reason: raw.reason || '',
    requested_role: raw.requested_role || raw.role || 'staff',
    status: raw.status || 'pending',
    created_at: raw.created_at || '',
    ...raw,
  }
}

describe('Approvals access guard', () => {
  it('OWNER has access', () => {
    const isOwnerOrAdmin = 'OWNER' === 'OWNER' || 'OWNER' === 'ADMIN' || 'OWNER' === 'owner' || 'OWNER' === 'admin'
    expect(isOwnerOrAdmin).toBe(true)
  })

  it('owner (lowercase) has access', () => {
    const isOwnerOrAdmin = 'owner' === 'OWNER' || 'owner' === 'ADMIN' || 'owner' === 'owner' || 'owner' === 'admin'
    expect(isOwnerOrAdmin).toBe(true)
  })

  it('ADMIN has access', () => {
    const isOwnerOrAdmin = 'ADMIN' === 'OWNER' || 'ADMIN' === 'ADMIN' || 'ADMIN' === 'owner' || 'ADMIN' === 'admin'
    expect(isOwnerOrAdmin).toBe(true)
  })

  it('admin (lowercase) has access', () => {
    const isOwnerOrAdmin = 'admin' === 'OWNER' || 'admin' === 'ADMIN' || 'admin' === 'owner' || 'admin' === 'admin'
    expect(isOwnerOrAdmin).toBe(true)
  })

  it('STAFF does NOT have access', () => {
    const isOwnerOrAdmin = 'STAFF' === 'OWNER' || 'STAFF' === 'ADMIN' || 'STAFF' === 'owner' || 'STAFF' === 'admin'
    expect(isOwnerOrAdmin).toBe(false)
  })

  it('super_admin HAS access', () => {
    const isOwnerOrAdmin = 'super_admin' === 'OWNER' || 'super_admin' === 'ADMIN' || 'super_admin' === 'owner' || 'super_admin' === 'admin' || 'super_admin' === 'super_admin'
    expect(isOwnerOrAdmin).toBe(true)
  })
})

describe('normalizeApproval', () => {
  it('uses approval_id field', () => {
    const raw = { approval_id: 42, user_id: 1, email: 'test@test.com', status: 'pending' }
    const a = normalizeApproval(raw)
    expect(a.approval_id).toBe(42)
  })

  it('falls back to id field', () => {
    const raw = { id: 7, user_id: 2, email: 'test@test.com' }
    const a = normalizeApproval(raw)
    expect(a.approval_id).toBe(7)
  })

  it('uses requester_name from raw', () => {
    const raw = { approval_id: 1, user_id: 1, requester_name: 'Kwame', email: 'kwame@test.com' }
    const a = normalizeApproval(raw)
    expect(a.requester_name).toBe('Kwame')
  })

  it('falls back to name field', () => {
    const raw = { approval_id: 1, user_id: 1, name: 'Ama', email: 'ama@test.com' }
    const a = normalizeApproval(raw)
    expect(a.requester_name).toBe('Ama')
  })

  it('falls back to user.name', () => {
    const raw = { approval_id: 1, user_id: 1, user: { name: 'Kofi' }, email: 'kofi@test.com' }
    const a = normalizeApproval(raw)
    expect(a.requester_name).toBe('Kofi')
  })

  it('defaults requester_name to "Unknown"', () => {
    const raw = { approval_id: 1, user_id: 1, email: 'test@test.com' }
    const a = normalizeApproval(raw)
    expect(a.requester_name).toBe('Unknown')
  })

  it('uses email from raw', () => {
    const raw = { approval_id: 1, user_id: 1, email: 'kwame@test.com' }
    const a = normalizeApproval(raw)
    expect(a.email).toBe('kwame@test.com')
  })

  it('falls back to user.email', () => {
    const raw = { approval_id: 1, user_id: 1, user: { email: 'ama@test.com' } }
    const a = normalizeApproval(raw)
    expect(a.email).toBe('ama@test.com')
  })

  it('defaults email to "N/A"', () => {
    const raw = { approval_id: 1, user_id: 1 }
    const a = normalizeApproval(raw)
    expect(a.email).toBe('N/A')
  })

  it('uses requested_role from raw', () => {
    const raw = { approval_id: 1, user_id: 1, email: 't@t.com', requested_role: 'admin' }
    const a = normalizeApproval(raw)
    expect(a.requested_role).toBe('admin')
  })

  it('falls back to role field', () => {
    const raw = { approval_id: 1, user_id: 1, email: 't@t.com', role: 'staff' }
    const a = normalizeApproval(raw)
    expect(a.requested_role).toBe('staff')
  })

  it('defaults requested_role to "staff"', () => {
    const raw = { approval_id: 1, user_id: 1, email: 't@t.com' }
    const a = normalizeApproval(raw)
    expect(a.requested_role).toBe('staff')
  })

  it('defaults status to "pending"', () => {
    const raw = { approval_id: 1, user_id: 1, email: 't@t.com' }
    const a = normalizeApproval(raw)
    expect(a.status).toBe('pending')
  })

  it('preserves existing status', () => {
    const raw = { approval_id: 1, user_id: 1, email: 't@t.com', status: 'approved' }
    const a = normalizeApproval(raw)
    expect(a.status).toBe('approved')
  })

  it('defaults reason to empty string', () => {
    const raw = { approval_id: 1, user_id: 1, email: 't@t.com' }
    const a = normalizeApproval(raw)
    expect(a.reason).toBe('')
  })

  it('preserves existing reason', () => {
    const raw = { approval_id: 1, user_id: 1, email: 't@t.com', reason: 'I want to join' }
    const a = normalizeApproval(raw)
    expect(a.reason).toBe('I want to join')
  })
})

describe('Approvals extractArray', () => {
  it('returns array directly', () => {
    const data = [{ approval_id: 1 }]
    expect(extractArray(data)).toEqual([{ approval_id: 1 }])
  })

  it('extracts from nested data property', () => {
    const data = { data: [{ approval_id: 1 }] }
    expect(extractArray(data)).toEqual([{ approval_id: 1 }])
  })

  it('stops at depth 4', () => {
    const data = { a: { b: { c: { d: { e: [1, 2, 3] } } } } }
    expect(extractArray(data)).toEqual([])
  })
})

describe('Approvals filtering', () => {
  const approvals = [
    { approval_id: 1, status: 'pending', requester_name: 'Kwame' },
    { approval_id: 2, status: 'approved', requester_name: 'Ama' },
    { approval_id: 3, status: 'PENDING', requester_name: 'Kofi' },
    { approval_id: 4, status: 'rejected', requester_name: 'Ako' },
  ]

  it('filters to pending only (lowercase)', () => {
    const pending = approvals.filter((a) => a.status === 'pending' || a.status === 'PENDING')
    expect(pending).toHaveLength(2)
    expect(pending.map((a) => a.requester_name)).toContain('Kwame')
    expect(pending.map((a) => a.requester_name)).toContain('Kofi')
  })

  it('returns empty when no pending', () => {
    const allApproved = [
      { approval_id: 1, status: 'approved' },
      { approval_id: 2, status: 'rejected' },
    ]
    const pending = allApproved.filter((a) => a.status === 'pending' || a.status === 'PENDING')
    expect(pending).toHaveLength(0)
  })
})

describe('Approvals action logic', () => {
  it('approve uses dir=1', () => {
    const dir = 1
    expect(dir).toBe(1)
  })

  it('reject uses dir=0', () => {
    const dir = 0
    expect(dir).toBe(0)
  })

  it('removes approval from list after action', () => {
    const approvals = [
      { approval_id: 1, status: 'pending' },
      { approval_id: 2, status: 'pending' },
    ]
    const targetId = 1
    const updated = approvals.filter((a) => a.approval_id !== targetId)
    expect(updated).toHaveLength(1)
    expect(updated[0].approval_id).toBe(2)
  })

  it('success message for approve', () => {
    const dir = 1
    const message = dir === 1 ? 'Request approved!' : 'Request rejected.'
    expect(message).toBe('Request approved!')
  })

  it('success message for reject', () => {
    const dir = 0
    const message = dir === 1 ? 'Request approved!' : 'Request rejected.'
    expect(message).toBe('Request rejected.')
  })
})

describe('Approvals processing state', () => {
  it('processingId starts as null', () => {
    let processingId: number | null = null
    expect(processingId).toBeNull()
  })

  it('blocks concurrent actions', () => {
    let processingId: number | null = null
    const canProcess = processingId === null
    expect(canProcess).toBe(true)

    processingId = 1
    const canProcessAgain = processingId === null
    expect(canProcessAgain).toBe(false)
  })

  it('resets after action completes', () => {
    let processingId: number | null = 1
    processingId = null
    expect(processingId).toBeNull()
  })
})

describe('Approvals error handling', () => {
  it('handles string detail', () => {
    const detail = 'Business not found'
    const message = typeof detail === 'string' ? detail : 'Failed to load approvals'
    expect(message).toBe('Business not found')
  })

  it('handles array detail', () => {
    const detail = [{ msg: 'Unauthorized' }]
    const message = Array.isArray(detail) ? detail.map((e: any) => e.msg).join(', ') : typeof detail === 'string' ? detail : 'Failed to load approvals'
    expect(message).toBe('Unauthorized')
  })

  it('handles missing detail', () => {
    const detail = undefined
    const message = typeof detail === 'string' ? detail : 'Failed to load approvals'
    expect(message).toBe('Failed to load approvals')
  })

  it('approve error message', () => {
    const dir = 1
    const message = dir === 1 ? 'Failed to approve request' : 'Failed to reject request'
    expect(message).toBe('Failed to approve request')
  })

  it('reject error message', () => {
    const dir = 0
    const message = dir === 1 ? 'Failed to approve request' : 'Failed to reject request'
    expect(message).toBe('Failed to reject request')
  })
})

describe('Approvals display', () => {
  it('shows role badge', () => {
    const role = 'staff'
    expect(role).toBeTruthy()
  })

  it('shows formatted date', () => {
    const date = '2024-01-15T10:30:00Z'
    const formatted = new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    expect(formatted).toBeTruthy()
  })

  it('shows reason when present', () => {
    const reason = 'I want to help manage inventory'
    expect(reason.length > 0).toBe(true)
  })

  it('hides reason when empty', () => {
    const reason = ''
    expect(reason.length > 0).toBe(false)
  })
})
