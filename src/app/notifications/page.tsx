'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton from '@/components/ui/Skeleton'
import Pagination from '@/components/ui/Pagination'
import { notificationAPI, normalizeNotifications, NotificationItem } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import { useBusinessId } from '@/lib/useBusinessId'

const PAGE_SIZE = 20

type Filter = 'all' | 'unread'

function formatFullTimestamp(iso?: string): string {
  if (!iso) return 'Unknown time'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Unknown time'
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { businessId, loading: bizLoading } = useBusinessId()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<NotificationItem | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const res = await notificationAPI.list(businessId, filter === 'unread')
      setItems(normalizeNotifications(res.data))
      setPage(1)
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [businessId, filter])

  useEffect(() => {
    if (businessId) load()
  }, [businessId, load])

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items])
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const paged = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page]
  )

  // Optimistic read-mark: flip locally, revert if the request fails.
  const markRead = async (n: NotificationItem) => {
    if (n.is_read) return
    setBusyId(n.notification_id)
    setItems((prev) =>
      prev.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x))
    )
    try {
      await notificationAPI.markRead(n.notification_id)
    } catch (err: any) {
      setItems((prev) =>
        prev.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: false } : x))
      )
      setError(parseApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  const markAllRead = async () => {
    if (!businessId) return
    setBusyId(-1)
    try {
      const res = await notificationAPI.markAllRead(businessId)
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
      setNotice(`${res.data?.updated_count ?? items.length} notification(s) marked as read.`)
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete.notification_id
    setBusyId(id)
    const snapshot = items
    setItems((prev) => prev.filter((x) => x.notification_id !== id))
    setPendingDelete(null)
    try {
      await notificationAPI.remove(id)
      setNotice('Notification deleted.')
    } catch (err: any) {
      setItems(snapshot)
      setError(parseApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  const clearRead = async () => {
    if (!businessId) return
    setBusyId(-2)
    const snapshot = items
    setItems((prev) => prev.filter((x) => !x.is_read))
    try {
      const res = await notificationAPI.clearRead(businessId)
      setNotice(`${res.data?.deleted_count ?? 0} read notification(s) cleared.`)
    } catch (err: any) {
      setItems(snapshot)
      setError(parseApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Inbox"
          title="Notifications"
          subtitle="Everything the system has flagged for you. Open one to read it in full, or clear the ones you have already dealt with."
          actions={
            unreadCount > 0 ? (
              <Button
                variant="secondary"
                onClick={markAllRead}
                loading={busyId === -1}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                Mark all read
              </Button>
            ) : undefined
          }
        />

        {error && <Alert kind="error" onDismiss={() => setError('')}>{error}</Alert>}
        {notice && <Alert kind="success" onDismiss={() => setNotice('')}>{notice}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5" role="tablist" aria-label="Filter notifications">
            {([
              { key: 'all' as const, label: 'All', count: items.length },
              { key: 'unread' as const, label: 'Unread', count: unreadCount },
            ]).map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={filter === t.key}
                onClick={() => setFilter(t.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  filter === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-[10px] text-neutral-light">{t.count}</span>
              </button>
            ))}
          </div>

          {items.some((n) => n.is_read) && (
            <Button variant="ghost" size="sm" onClick={clearRead} loading={busyId === -2}>
              Clear read
            </Button>
          )}
        </div>

        <section className="surface-card overflow-hidden">
          {loading || bizLoading ? (
            <div className="space-y-4 p-5" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Loading notifications</span>
            </div>
          ) : paged.length === 0 ? (
            <EmptyState
              title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
              description={
                filter === 'unread'
                  ? 'You are all caught up. New alerts will appear here.'
                  : 'When something needs your attention, it will show up here.'
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {paged.map((n) => (
                  <li
                    key={n.notification_id}
                    className={`transition-colors hover:bg-surfaceAlt ${n.is_read ? '' : 'bg-primary-light/25'}`}
                  >
                    <div className="flex items-start gap-4 p-4 sm:p-5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          n.is_read ? 'bg-slate-100 text-slate-400' : 'bg-primary-light text-primary'
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>

                      {/* The body is the button: clicking reads the full message
                          and marks it read in one action. */}
                      <button
                        type="button"
                        onClick={() => markRead(n)}
                        disabled={busyId === n.notification_id}
                        className="min-w-0 flex-1 text-left disabled:opacity-60"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {n.title || 'Notification'}
                          </span>
                          {!n.is_read && <Badge color="indigo" dot>New</Badge>}
                        </div>
                        {/* Full message, not a two-line clamp - this is the
                            "see it in full" view the dropdown cannot give. */}
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                          {n.message}
                        </p>
                        <p className="mt-1.5 text-xs text-neutral-light">
                          {formatFullTimestamp(n.created_at)}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPendingDelete(n)}
                        disabled={busyId === n.notification_id}
                        aria-label={`Delete notification: ${n.title || 'Notification'}`}
                        className="shrink-0 rounded-lg p-2 text-neutral-light transition-colors hover:bg-rose-50 hover:text-danger disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                totalItems={items.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </section>
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setPendingDelete(null)}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-notif-title"
            className="relative w-full max-w-md animate-scale-in rounded-2xl border border-slate-200 bg-white p-6 shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="del-notif-title" className="text-section-title text-slate-900">
              Delete this notification?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              &ldquo;{pendingDelete.title || 'This notification'}&rdquo; will be removed
              permanently. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                loading={busyId === pendingDelete.notification_id}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
