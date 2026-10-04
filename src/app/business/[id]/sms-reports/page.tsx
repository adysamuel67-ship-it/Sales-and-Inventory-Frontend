'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { reportAPI, adminAPI } from '@/lib/api'
import { extractArray, parseApiError, formatCedi } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import {
  REPORT_SCHEDULES,
  reportWindow,
  buildReportSms,
  smsSegments,
  smsCostGhs,
  type ReportKind,
  type ReportSummary,
} from '@/lib/sms'

interface MemberRow {
  user_id: number
  name?: string | null
  phone?: string | null
  role?: string | null
}

export default function SmsReportsPage() {
  const params = useParams()
  const router = useRouter()
  const businessId = parseInt(params?.id as string)
  const { user, isAuthenticated, isLoading, profileLoaded } = useAuth()

  const [kind, setKind] = useState<ReportKind>('daily')
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const effectiveRole = user?.business_role || user?.role
  const canView =
    effectiveRole === 'admin' || effectiveRole === 'ADMIN' || effectiveRole === 'manager'

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (profileLoaded && user?.is_verified === false) {
      router.replace('/verify')
      return
    }
    if (profileLoaded && user && !canView) {
      router.replace(businessId ? `/business/${businessId}/dashboard` : '/dashboard')
    }
  }, [isLoading, isAuthenticated, profileLoaded, user, canView, businessId, router])

  const load = useCallback(async () => {
    if (!businessId || isNaN(businessId)) return
    setLoading(true)
    setError('')
    try {
      const win = reportWindow(kind)
      const res = await reportAPI.saleSummary(businessId, win.start, win.end)
      const data = (res.data || {}) as ReportSummary
      setSummary({
        total_revenue: data.total_revenue ?? 0,
        total_profit: data.total_profit ?? 0,
        total_sales: data.total_sales ?? 0,
        sold_quantity: data.sold_quantity ?? 0,
        cash_total: data.cash_total ?? 0,
        momo_total: data.momo_total ?? 0,
        card_total: data.card_total ?? 0,
        best_selling_product: data.best_selling_product ?? null,
      })
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [businessId, kind])

  useEffect(() => {
    if (businessId && canView) load()
  }, [businessId, canView, load])

  useEffect(() => {
    if (!businessId || !canView) return
    let cancelled = false
    adminAPI
      .listMembers()
      .then((res) => {
        if (cancelled) return
        setMembers(
          extractArray(res.data).map((m: any) => ({
            user_id: Number(m.user_id ?? m.id),
            name: m.name ?? null,
            phone: m.phone ?? null,
            role: m.role ?? null,
          }))
        )
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [businessId, canView])
const schedule = useMemo(
    () => REPORT_SCHEDULES.find((s) => s.kind === kind)!,
    [kind]
  )
  const win = useMemo(() => reportWindow(kind), [kind])

  const sms = useMemo(() => {
    if (!summary) return ''
    return buildReportSms({
      summary,
      start: win.start,
      end: win.end,
      title: schedule.smsTitle,
    })
  }, [summary, win, schedule])

  const segments = sms ? smsSegments(sms) : 1

  /**
   * The backend only sends reports to active, verified members whose
   * BusinessMember role is admin or manager AND who have a usable phone.
   * Mirrors get_business_members() + to_international().
   */
  const recipients = useMemo(() => {
    const eligible = members.filter((m) => {
      const role = (m.role || '').toLowerCase()
      if (role !== 'admin' && role !== 'manager') return false
      return !!m.phone && /[0-9]/.test(m.phone)
    })
    return { eligible, skipped: members.length - eligible.length }
  }, [members])

  const stats = useMemo(
    () => [
      { label: 'Revenue', value: summary ? formatCedi(summary.total_revenue) : '—' },
      { label: 'Profit', value: summary ? formatCedi(summary.total_profit) : '—' },
      { label: 'Orders', value: summary ? String(summary.total_sales ?? 0) : '—' },
      { label: 'Units sold', value: summary ? String(summary.sold_quantity ?? 0) : '—' },
    ],
    [summary]
  )

  if (isLoading || (isAuthenticated && profileLoaded && !canView)) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Reports"
        title="SMS Reports"
        subtitle="A summary of your sales, sent straight to your phone"
        backLink={`/business/${businessId}/reports`}
        backLabel="All reports"
      />

      {error && (
        <div className="mb-6">
          <Alert
            kind="error"
            title="Could not load the report preview"
            onDismiss={() => setError('')}
          >
            {error}
          </Alert>
        </div>
      )}

      <SchedulePicker kind={kind} onChange={setKind} />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wider text-neutral-light">{stat.label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
            )}
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <PreviewPanel sms={sms} loading={loading} segments={segments} label={schedule.label} />
        <aside className="space-y-5">
          <RecipientPanel recipients={recipients.eligible} skipped={recipients.skipped} />
          <WindowPanel
            start={win.start}
            end={win.end}
            cadence={schedule.cadence}
            title={schedule.smsTitle}
          />
        </aside>
      </div>
    </DashboardLayout>
  )
}
function SchedulePicker({
  kind,
  onChange,
}: {
  kind: ReportKind
  onChange: (kind: ReportKind) => void
}) {
  return (
    <section className="mb-6">
      <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Report schedule">
        {REPORT_SCHEDULES.map((s) => {
          const active = s.kind === kind
          return (
            <button
              key={s.kind}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(s.kind)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                active
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                  : 'border-slate-200 bg-surface hover:border-slate-300 hover:bg-surfaceAlt'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${active ? 'text-primary' : 'text-slate-900'}`}
                >
                  {s.label}
                </span>
                {active && (
                  <svg
                    className="h-4 w-4 shrink-0 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-light">{s.cadence}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function PreviewPanel({
  sms,
  loading,
  segments,
  label,
}: {
  sms: string
  loading: boolean
  segments: number
  label: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">Message preview</h2>
          <p className="mt-0.5 text-xs text-neutral-light">
            Exactly what {label.toLowerCase()} recipients receive
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              segments > 1 ? 'bg-warning-light text-warning' : 'bg-success-light text-success'
            }`}
          >
            {segments} SMS
          </span>
          <span className="text-[11px] text-neutral-light">
            {sms.length} chars · GH¢{smsCostGhs(segments).toFixed(2)}/msg
          </span>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : (
          <div className="max-w-sm rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
            <pre className="whitespace-pre-wrap break-words font-sans">{sms}</pre>
          </div>
        )}

        {segments > 1 && !loading && (
          <p className="mt-3 text-xs text-warning">
            This message runs {sms.length} characters, so it is billed as {segments} SMS parts.
          </p>
        )}
      </div>
    </div>
  )
}

function RecipientPanel({
  recipients,
  skipped,
}: {
  recipients: MemberRow[]
  skipped: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">Who gets this report</h2>
        <p className="mt-0.5 text-xs text-neutral-light">
          Admins and managers with a phone number on file
        </p>
      </div>
      <div className="p-5">
        {recipients.length === 0 ? (
          <p className="text-sm text-neutral-light">
            No admin or manager has a phone number saved, so this report has nobody to send to.
            Add a phone number in Settings.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {recipients.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {(m.name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {m.name || `Member #${m.user_id}`}
                  </span>
                  <span className="block truncate text-xs text-neutral-light">{m.phone}</span>
                </span>
                <span className="shrink-0 rounded-full bg-surfaceAlt px-2 py-0.5 text-[11px] capitalize text-slate-600">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}

        {skipped > 0 && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-neutral-light">
            {skipped} member{skipped === 1 ? '' : 's'} skipped — no phone number, or a role
            outside admin and manager.
          </p>
        )}
      </div>
    </div>
  )
}

function WindowPanel({
  start,
  end,
  cadence,
  title,
}: {
  start: string
  end: string
  cadence: string
  title: string
}) {
  const rows = [
    { label: 'Covers', value: `${start} → ${end}` },
    { label: 'Sent', value: cadence },
    { label: 'Title sent', value: title },
  ]
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Reporting window</h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-neutral-light">{row.label}</dt>
            <dd className="text-right font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}