'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { cronAPI, type CronJob } from '@/lib/api'
import { extractArray, isSuperAdminUser, parseApiError } from '@/lib/utils'

function normalize(raw: any): CronJob {
  return {
    id: String(raw?.id ?? raw?.name ?? ''),
    name: String(raw?.name ?? raw?.id ?? ''),
    label: String(raw?.label ?? raw?.name ?? raw?.id ?? 'Job'),
    description: String(raw?.description ?? ''),
    schedule: String(raw?.schedule ?? ''),
    trigger: String(raw?.trigger ?? 'cron'),
    timezone: String(raw?.timezone ?? 'UTC'),
    running: Boolean(raw?.running),
    pending: Boolean(raw?.pending),
    next_run: raw?.next_run ?? null,
  }
}

function formatWhen(iso?: string | null): string {
  if (!iso) return 'Not scheduled'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled'
  return parsed.toLocaleString()
}

export default function AdminJobsPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [triggering, setTriggering] = useState<string | null>(null)
  const [confirmTrigger, setConfirmTrigger] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  const isSuperAdmin = isSuperAdminUser(user)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  const notSuperAdmin = !!user && !isSuperAdmin
  useEffect(() => {
    if (profileLoaded && isAuthenticated && notSuperAdmin) {
      router.replace('/dashboard')
    }
  }, [profileLoaded, isAuthenticated, notSuperAdmin, router])

  const loadJobs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await cronAPI.list()
      setJobs(extractArray(res.data).map(normalize))
    } catch (err: any) {
      setError(parseApiError(err) || 'Failed to load scheduled jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) loadJobs()
  }, [isAuthenticated, isSuperAdmin, loadJobs])

  const handleTrigger = async (jobId: string) => {
    setTriggering(jobId)
    setConfirmTrigger(null)
    setError('')
    setNotice('')
    try {
      const res = await cronAPI.trigger(jobId)
      setNotice(res.data?.detail || 'Job queued.')
      loadJobs()
    } catch (err: any) {
      setError(parseApiError(err) || `Failed to trigger ${jobId}`)
    } finally {
      setTriggering(null)
    }
  }

  if (isLoading || !isAuthenticated || !profileLoaded || !isSuperAdminUser(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Scheduled Jobs</h1>
        <p className="text-sm text-neutral-light mt-1">
          Background jobs running on the server, and when each one fires next.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 bg-success-light text-success text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414 1.414L10 10.586l4.707 4.707a1 1 0 001.414-1.414L11.414 10l4.707-4.707a1 1 0 00-1.414-1.414L10 8.586 6.293 4.879a1 1 0 00-1.414 1.414L9.586 10l-4.707 4.707a1 1 0 101.414 1.414L10 11.414l4.707 4.707a1 1 0 001.414-1.414L11.414 10l4.707-4.707z" clipRule="evenodd" />
          </svg>
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {loading
          ? [1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)
          : jobs.map((job) => (
              <div key={job.id} className="bg-surface rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm">{job.label}</h3>
                    <p className="text-xs text-neutral-light mt-1">{job.description}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.running
                        ? 'bg-success-light text-success'
                        : job.pending
                          ? 'bg-warning-light text-warning'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {job.running ? 'Scheduled' : job.pending ? 'Paused' : 'Stopped'}
                  </span>
                </div>

                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-light">Cadence</dt>
                    <dd className="text-slate-700 font-medium text-right">{job.schedule}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-light">Next run</dt>
                    <dd className="text-slate-700 font-medium text-right">{formatWhen(job.next_run)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-light">Timezone</dt>
                    <dd className="text-slate-700 font-medium text-right">{job.timezone}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  {confirmTrigger === job.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTrigger(job.id)}
                        disabled={triggering === job.id}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-danger rounded-lg hover:bg-danger/90 transition-colors min-h-[36px]"
                      >
                        {triggering === job.id ? 'Queueing...' : 'Confirm Run'}
                      </button>
                      <button
                        onClick={() => setConfirmTrigger(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors min-h-[36px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmTrigger(job.id)}
                      disabled={triggering !== null || !job.running}
                      className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40 min-h-[36px]"
                    >
                      Run Now
                    </button>
                  )}
                </div>
              </div>
            ))}
      </div>

      <div className="bg-surface rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Schedules</h3>
          <button onClick={loadJobs} className="text-xs text-primary font-medium hover:underline">
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-medium">Job</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Next Run</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-slate-50 table-row-hover">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{job.label}</div>
                      <div className="text-xs text-neutral-light">{job.schedule}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          job.running
                            ? 'bg-success-light text-success'
                            : job.pending
                              ? 'bg-warning-light text-warning'
                              : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {job.running ? 'Scheduled' : job.pending ? 'Paused' : 'Stopped'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-light text-xs">
                      {formatWhen(job.next_run)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-neutral-light text-sm">
            No scheduled jobs are registered.
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}