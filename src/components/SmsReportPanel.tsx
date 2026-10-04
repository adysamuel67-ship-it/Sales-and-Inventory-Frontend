'use client'

import { useEffect, useMemo, useState } from 'react'
import { adminAPI } from '@/lib/api'
import { extractArray } from '@/lib/utils'
import {
  REPORT_SCHEDULES,
  reportWindow,
  buildReportSms,
  smsSegments,
  smsCostGhs,
  type ReportKind,
  type ReportSummary,
} from '@/lib/sms'

/**
 * The automated SMS sales report, shown as a section of the Reports page.
 *
 * The backend builds this message in RecieptReportGenerator and pushes it on a
 * daily/weekly/monthly schedule to every admin and manager with a phone on
 * file. It gets its own panel because a shopkeeper needs to see exactly what
 * lands on their phone — the figures shown are the ones the message carries.
 */

interface Props {
  businessId: number
  summary: ReportSummary | null
}

interface MemberRow {
  user_id: number
  name?: string | null
  phone?: string | null
  role?: string | null
}

export default function SmsReportPanel({ businessId, summary }: Props) {
  const [kind, setKind] = useState<ReportKind>('daily')
  const [members, setMembers] = useState<MemberRow[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!businessId) return
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
  }, [businessId])

  const schedule = useMemo(
    () => REPORT_SCHEDULES.find((s) => s.kind === kind)!,
    [kind]
  )
  const window = useMemo(() => reportWindow(kind), [kind])

  const sms = useMemo(() => {
    if (!summary) return ''
    return buildReportSms({
      summary,
      start: window.start,
      end: window.end,
      title: schedule.smsTitle,
    })
  }, [summary, window, schedule])

  const segments = sms ? smsSegments(sms) : 1

  /**
   * get_business_members() selects verified, active admin and manager members,
   * and process_report_data() skips anyone whose phone cannot be normalised by
   * to_international(). Mirrored here so the count shown is honest.
   */
  const recipients = useMemo(() => {
    const eligible = members.filter((m) => {
      const role = (m.role || '').toLowerCase()
      if (role !== 'admin' && role !== 'manager') return false
      return !!m.phone && /[0-9]/.test(m.phone)
    })
    return { eligible, skipped: members.length - eligible.length }
  }, [members])

  return (
    <section className="mb-6 bg-surface rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">SMS Report</h2>
          <p className="text-xs text-neutral-light mt-0.5">
            Sent to {recipients.eligible.length} recipient
            {recipients.eligible.length === 1 ? '' : 's'} · {schedule.cadence}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-surfaceAlt min-h-[40px]"
        >
          {expanded ? 'Hide preview' : 'Preview'}
          <svg
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="p-5">
        <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Report schedule">
          {REPORT_SCHEDULES.map((s) => {
            const active = s.kind === kind
            return (
              <button
                key={s.kind}
                role="tab"
                aria-selected={active}
                onClick={() => setKind(s.kind)}
                className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-slate-200 bg-surface hover:border-slate-300 hover:bg-surfaceAlt'
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${active ? 'text-primary' : 'text-slate-900'}`}
                >
                  {s.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-neutral-light">
                  {window.start === window.end ? window.start : `${window.start} → ${window.end}`}
                </span>
              </button>
            )
          })}
        </div>

        {expanded && (
          <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-2 flex items-center gap-2">
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
              <div className="max-w-sm rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
                <pre className="whitespace-pre-wrap break-words font-sans">{sms}</pre>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-light">
                Who receives it
              </h3>
              {recipients.eligible.length === 0 ? (
                <p className="text-sm text-neutral-light">
                  No admin or manager has a phone number saved, so this report has nobody to send
                  to. Add a phone number in Settings.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {recipients.eligible.map((m) => (
                    <li key={m.user_id} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
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

              {recipients.skipped > 0 && (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-neutral-light">
                  {recipients.skipped} member{recipients.skipped === 1 ? '' : 's'} skipped — no
                  phone number, or a role outside admin and manager.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}