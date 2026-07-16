'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'

interface Job {
  id: string
  name: string
  status: string
  last_run?: string
  next_run?: string
}

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key]
    }
  }
  return []
}

export default function AdminJobsPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [triggering, setTriggering] = useState<string | null>(null)
  const [confirmTrigger, setConfirmTrigger] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.role !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [profileLoaded, isAuthenticated, user, router])

  const loadJobs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/crons/jobs')
      setJobs(extractArray(res.data))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'super_admin') loadJobs()
  }, [isAuthenticated, user])

  const handleTrigger = async (jobName: string) => {
    setTriggering(jobName)
    setConfirmTrigger(null)
    try {
      await api.post(`/admin/crons/${jobName}`)
      loadJobs()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : `Failed to trigger ${jobName}`)
    } finally {
      setTriggering(null)
    }
  }

  const cronJobs = [
    { name: 'daily_summery', label: 'Daily Summary', description: 'Generate daily sales and revenue summary' },
    { name: 'weekly_summery', label: 'Weekly Summary', description: 'Generate weekly analytics report' },
    { name: 'monthly_summery', label: 'Monthly Summary', description: 'Generate monthly analytics report' },
  ]

  if (isLoading || !isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cron Jobs</h1>
        <p className="text-sm text-neutral-light mt-1">Manage and trigger scheduled jobs</p>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {cronJobs.map((job) => {
          const lastRun = jobs.find((j) => j.name === job.name)
          return (
            <div key={job.name} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm">{job.label}</h3>
              <p className="text-xs text-neutral-light mt-1">{job.description}</p>
              {lastRun?.last_run && (
                <p className="text-[10px] text-neutral-light mt-2">
                  Last run: {new Date(lastRun.last_run).toLocaleString()}
                </p>
              )}
              <div className="mt-3">
                {confirmTrigger === job.name ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrigger(job.name)}
                      disabled={triggering === job.name}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-danger rounded-lg hover:bg-danger/90 transition-colors min-h-[36px]"
                    >
                      {triggering === job.name ? 'Running...' : 'Confirm Run'}
                    </button>
                    <button
                      onClick={() => setConfirmTrigger(null)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[36px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmTrigger(job.name)}
                    disabled={triggering !== null}
                    className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40 min-h-[36px]"
                  >
                    Trigger Now
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Job History</h3>
          <button
            onClick={loadJobs}
            className="text-xs text-primary font-medium hover:underline"
          >
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
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Job</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Last Run</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id || job.name} className="border-t border-gray-50 table-row-hover">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{job.name}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        job.status === 'success' ? 'bg-success-light text-success'
                          : job.status === 'failed' ? 'bg-danger-light text-danger'
                          : 'bg-warning-light text-warning'
                      }`}>
                        {job.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-light text-xs">
                      {job.last_run ? new Date(job.last_run).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-neutral-light text-sm">
            No job history available
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
