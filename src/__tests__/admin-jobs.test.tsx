import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

const listMock = jest.fn()
const triggerMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useParams: () => ({}),
  usePathname: () => '/admin/jobs',
}))

jest.mock('@/lib/api', () => ({
  cronAPI: {
    list: (...a: any[]) => listMock(...a),
    trigger: (...a: any[]) => triggerMock(...a),
  },
  businessAPI: { list: jest.fn().mockResolvedValue({ data: [] }), getApprovals: jest.fn().mockResolvedValue({ data: [] }) },
  notificationAPI: { list: jest.fn().mockResolvedValue({ data: [] }) },
  getNotificationsCache: jest.fn().mockReturnValue([]),
  setNotificationsCache: jest.fn(),
  getDismissedNotificationIds: jest.fn().mockReturnValue([]),
  dismissNotification: jest.fn(),
  restoreNotification: jest.fn(),
  normalizeNotifications: jest.fn().mockReturnValue([]),
}))

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Root', role: 'super_admin', business_role: 'admin', is_verified: true },
    isAuthenticated: true,
    isLoading: false,
    profileLoaded: true,
    businesses: [{ business_id: 1, name: 'Shop' }],
    currentBusiness: { business_id: 1, name: 'Shop' },
    switchBusiness: jest.fn(),
  }),
}))

jest.mock('@/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}))

import AdminJobsPage from '@/app/admin/jobs/page'

function job(overrides: Record<string, any> = {}) {
  return {
    id: 'hourly-debt-reminder-job',
    name: 'debt_reminders',
    label: 'Debt Reminders',
    description: 'Sends any reminder SMS that has reached its scheduled day.',
    schedule: 'Every 60 minutes',
    trigger: 'interval',
    timezone: 'Africa/Accra',
    running: true,
    pending: false,
    next_run: new Date(Date.now() + 30 * 60000).toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
})

describe('Admin jobs page', () => {
  it('renders the jobs returned by the API', async () => {
    listMock.mockResolvedValue({ data: [job()] })
    render(<AdminJobsPage />)
    expect((await screen.findAllByText('Debt Reminders')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Every 60 minutes')).length).toBeGreaterThan(0)
  })

  it('warns when the scheduler has queued nothing', async () => {
    listMock.mockResolvedValue({ data: [job({ running: false, next_run: null })] })
    render(<AdminJobsPage />)

    expect(await screen.findByText(/scheduler is not running/i)).toBeInTheDocument()
  })

  it('does not show the offline warning when jobs are queued', async () => {
    listMock.mockResolvedValue({ data: [job()] })
    render(<AdminJobsPage />)

    await screen.findAllByText('Debt Reminders')
    expect(screen.queryByText(/scheduler is not running/i)).not.toBeInTheDocument()
  })

  it('shows a countdown to the next run', async () => {
    listMock.mockResolvedValue({ data: [job()] })
    render(<AdminJobsPage />)

    expect(await screen.findAllByText(/in \d+ min/)).not.toHaveLength(0)
  })

  it('shows the job timezone alongside the next run', async () => {
    listMock.mockResolvedValue({ data: [job()] })
    render(<AdminJobsPage />)

    expect((await screen.findAllByText('Africa/Accra')).length).toBeGreaterThan(0)
  })

  it('queues a run by scheduler job id', async () => {
    listMock.mockResolvedValue({ data: [job()] })
    triggerMock.mockResolvedValue({ data: { triggered: true, detail: 'queued' } })
    render(<AdminJobsPage />)

    const runNow = await screen.findByRole('button', { name: /run now/i })
    runNow.click()
    const confirm = await screen.findByRole('button', { name: /confirm run/i })
    confirm.click()

    await waitFor(() => expect(triggerMock).toHaveBeenCalledWith('hourly-debt-reminder-job'))
  })

  it('surfaces an API error', async () => {
    listMock.mockRejectedValue({ response: { data: { detail: 'Not a super admin' } } })
    render(<AdminJobsPage />)

    expect(await screen.findByText(/Not a super admin/)).toBeInTheDocument()
  })

  it('reports an empty scheduler', async () => {
    listMock.mockResolvedValue({ data: [] })
    render(<AdminJobsPage />)

    expect(await screen.findByText(/No scheduled jobs are registered/i)).toBeInTheDocument()
  })
})