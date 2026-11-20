'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { listOutbox } from '@/lib/offlineDb'
import {
  discardConflicts,
  flushOutbox,
  OUTBOX_CONFLICT_EVENT,
  OUTBOX_FAILURE_EVENT,
  OUTBOX_SUCCESS_EVENT,
} from '@/lib/offlineSync'

/**
 * Fixed top banner shown whenever the browser reports the connection is gone.
 * A second status strip reports queued changes and failed synchronisation so a
 * trader can tell what is saved locally and what has reached the server.
 */
export default function OfflineBanner() {
  const { user } = useAuth()
  const [offline, setOffline] = useState(false)
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState(0)
  const [conflicts, setConflicts] = useState(0)

  const refresh = useCallback(async () => {
    const ops = await listOutbox(undefined, user?.id)
    setPending(ops.length)
    setFailed(ops.filter((op) => op.attempts > 0 && !op.conflict).length)
    setConflicts(ops.filter((op) => op.conflict).length)
  }, [user?.id])

  useEffect(() => {
    setOffline(!navigator.onLine)
    const goOffline = () => setOffline(true)
    const goOnline = () => {
      setOffline(false)
      void refresh()
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [refresh])

  useEffect(() => {
    void refresh()
    window.addEventListener(OUTBOX_SUCCESS_EVENT, refresh)
    window.addEventListener(OUTBOX_FAILURE_EVENT, refresh)
    window.addEventListener(OUTBOX_CONFLICT_EVENT, refresh)
    const timer = window.setInterval(() => void refresh(), 15000)
    return () => {
      window.removeEventListener(OUTBOX_SUCCESS_EVENT, refresh)
      window.removeEventListener(OUTBOX_FAILURE_EVENT, refresh)
      window.removeEventListener(OUTBOX_CONFLICT_EVENT, refresh)
      window.clearInterval(timer)
    }
  }, [refresh])

  return (
    <>
      {offline && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[100] bg-amber-500 text-white text-center text-sm font-medium py-2 px-4 shadow-md"
        >
          You are offline. Saved data is safe and sales can be queued here.
          Sign-in, chat, SMS, uploads, reports and live updates need a connection.
        </div>
      )}
      {conflicts > 0 && (
        <div role="alert" className="fixed inset-x-0 top-0 z-[101] bg-red-700 text-white text-center text-sm py-2 px-4 shadow-md">
          {conflicts} saved {conflicts === 1 ? 'change conflicts' : 'changes conflict'} with the server. Review before retrying.{' '}
          <button
            type="button"
            className="underline font-semibold"
            onClick={() => void discardConflicts().then(refresh)}
          >
            Discard {conflicts === 1 ? 'it' : 'them'}
          </button>
        </div>
      )}
      {pending > 0 && !offline && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[99] flex items-center justify-center gap-3 bg-slate-900 text-white text-center text-sm py-2 px-4 shadow-md"
        >
          <span>
            {pending} change{pending === 1 ? '' : 's'} waiting to sync
            {failed > 0 ? ` — ${failed} failed` : ''}.
          </span>
          <button
            type="button"
            onClick={() => void flushOutbox()}
            className="rounded-md bg-white/15 px-2 py-0.5 font-semibold hover:bg-white/25"
          >
            Retry now
          </button>
        </div>
      )}
    </>
  )
}
