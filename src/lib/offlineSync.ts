import { saleAPI } from './api'
import { clearOfflineStorage, dequeue, listOutbox, markConflict, type OutboxOp, updateOutboxAttempts } from './offlineDb'
import { clearAllProductCaches } from './posCache'

export const OUTBOX_SUCCESS_EVENT = 'bbgh:outbox-success'
export const OUTBOX_FAILURE_EVENT = 'bbgh:outbox-failure'
export const OUTBOX_CONFLICT_EVENT = 'bbgh:outbox-conflict'

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
    if (op.conflict) continue
    const handler = handlers.get(op.type)
    if (!handler) continue
    try {
      const result = await handler(op)
      await dequeue(op.id)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OUTBOX_SUCCESS_EVENT, { detail: { op, result } }))
      }
    } catch (error: any) {
      await updateOutboxAttempts(op)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OUTBOX_FAILURE_EVENT, { detail: { op, error } }))
        if (error?.response?.status === 409 || error?.status === 409) {
          await markConflict(op)
          window.dispatchEvent(new CustomEvent(OUTBOX_CONFLICT_EVENT, { detail: { op, error } }))
        }
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

export async function discardConflicts(): Promise<number> {
  const conflicts = (await listOutbox()).filter((op) => op.conflict)
  for (const op of conflicts) await dequeue(op.id)
  return conflicts.length
}

export async function clearOfflineData(): Promise<void> {
  await Promise.all([clearOfflineStorage(), clearAllProductCaches()])
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage({ type: 'BBGH_CLEAR_CACHES' })
  } catch {
    // The reload still clears IndexedDB even if no worker is active.
  }
}

export function startOfflineSync(): () => void {
  if (typeof window === 'undefined') return () => {}

  const unregisterSale = registerSyncHandler('sale.record', async (op) => {
    const res = await saleAPI.record(op.businessId, op.payload, op.idempotencyKey)
    return res.data?.data ?? res.data
  })

  const onOnline = () => void flushOutbox()
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'BBGH_FLUSH_SYNC') void flushOutbox()
  }
  const timer = window.setInterval(() => void flushOutbox(), 60000)

  window.addEventListener('online', onOnline)
  navigator.serviceWorker?.addEventListener('message', onMessage)

  return () => {
    unregisterSale()
    window.removeEventListener('online', onOnline)
    navigator.serviceWorker?.removeEventListener('message', onMessage)
    window.clearInterval(timer)
  }
}
