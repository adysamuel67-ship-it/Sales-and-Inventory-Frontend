import { dequeue, listOutbox, type OutboxOp, updateOutboxAttempts } from './offlineDb'

export const OUTBOX_SUCCESS_EVENT = 'bbgh:outbox-success'
export const OUTBOX_FAILURE_EVENT = 'bbgh:outbox-failure'

type SyncHandler = (op: OutboxOp) => Promise<any>

export interface OutboxSuccessDetail {
  op: OutboxOp
  result: any
}

const handlers = new Map<string, SyncHandler>()
let activeFlush: Promise<void> | null = null

export function registerSyncHandler(type: string, handler: SyncHandler): () => void {
  handlers.set(type, handler)
  return () => {
    if (handlers.get(type) === handler) handlers.delete(type)
  }
}

async function flush(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  const ops = await listOutbox()
  for (const op of ops) {
    const handler = handlers.get(op.type)
    if (!handler) continue
    try {
      const result = await handler(op)
      await dequeue(op.id)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OUTBOX_SUCCESS_EVENT, { detail: { op, result } }))
      }
    } catch (error) {
      await updateOutboxAttempts(op)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OUTBOX_FAILURE_EVENT, { detail: { op, error } }))
      }
    }
  }
}

export function flushOutbox(): Promise<void> {
  if (activeFlush) return activeFlush
  activeFlush = flush().finally(() => {
    activeFlush = null
  })
  return activeFlush
}

export async function requestBackgroundSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    const sync = (registration as any).sync
    if (sync?.register) await sync.register('bbgh-outbox')
  } catch {
    // Background Sync is optional; the online listener still flushes.
  }
}

export function startOfflineSync(): () => void {
  if (typeof window === 'undefined') return () => {}

  const onOnline = () => void flushOutbox()
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'BBGH_FLUSH_SYNC') void flushOutbox()
  }
  const timer = window.setInterval(() => void flushOutbox(), 60000)

  window.addEventListener('online', onOnline)
  navigator.serviceWorker?.addEventListener('message', onMessage)

  return () => {
    window.removeEventListener('online', onOnline)
    navigator.serviceWorker?.removeEventListener('message', onMessage)
    window.clearInterval(timer)
  }
}
