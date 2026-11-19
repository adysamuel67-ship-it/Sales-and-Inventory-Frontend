/**
 * Durable offline storage: a read cache and a write queue shared by every page.
 *
 * IndexedDB is unavailable in some private modes and in tests, so both stores
 * fall back to memory. Storage failures must never break a sale.
 */

export interface CachedEntry<T = any> {
  key: string
  data: T
  savedAt: number
}

export interface OutboxOp<T = any> {
  id: string
  type: string
  businessId: number
  payload: T
  idempotencyKey: string
  localId?: string
  createdAt: number
  attempts: number
}

const DB_NAME = 'bbgh-offline'
const DB_VERSION = 1
const CACHE_STORE = 'cache'
const OUTBOX_STORE = 'outbox'

const memoryCache = new Map<string, CachedEntry>()
const memoryOutbox = new Map<string, OutboxOp>()

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })

  return dbPromise
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null)
          return
        }
        try {
          const request = action(db.transaction(storeName, mode).objectStore(storeName))
          request.onsuccess = () => resolve(request.result ?? null)
          request.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
  )
}

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':')
}

export async function getCached<T = any>(key: string): Promise<T | null> {
  const local = memoryCache.get(key)
  if (local) return local.data as T

  const entry = await runTransaction<CachedEntry<T>>(CACHE_STORE, 'readonly', (store) => store.get(key))
  if (entry?.data != null) {
    memoryCache.set(key, entry)
    return entry.data
  }
  return null
}

export async function setCached<T = any>(key: string, data: T): Promise<void> {
  const entry: CachedEntry<T> = { key, data, savedAt: Date.now() }
  memoryCache.set(key, entry)

  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(CACHE_STORE, 'readwrite')
    tx.objectStore(CACHE_STORE).put(entry)
  } catch {
    // Cache writes are best effort.
  }
}

export function createIdempotencyKey(prefix = 'op'): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

export async function enqueue<T = any>(op: {
  type: string
  businessId: number
  payload: T
  idempotencyKey?: string
  localId?: string
}): Promise<OutboxOp<T>> {
  const record: OutboxOp<T> = {
    id: createIdempotencyKey('outbox'),
    type: op.type,
    businessId: op.businessId,
    payload: op.payload,
    idempotencyKey: op.idempotencyKey || createIdempotencyKey(op.type),
    localId: op.localId,
    createdAt: Date.now(),
    attempts: 0,
  }
  memoryOutbox.set(record.id, record as OutboxOp)

  const db = await openDb()
  if (db) {
    try {
      db.transaction(OUTBOX_STORE, 'readwrite').objectStore(OUTBOX_STORE).put(record)
    } catch {
      // Keep the in-memory copy.
    }
  }
  return record
}

export async function listOutbox(businessId?: number): Promise<OutboxOp[]> {
  const db = await openDb()
  const records = await runTransaction<OutboxOp[]>(OUTBOX_STORE, 'readonly', (store) => store.getAll())

  const all = new Map<string, OutboxOp>()
  for (const op of memoryOutbox.values()) all.set(op.id, op)
  for (const op of records || []) all.set(op.id, op)

  return Array.from(all.values())
    .filter((op) => businessId == null || op.businessId === businessId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function dequeue(id: string): Promise<void> {
  memoryOutbox.delete(id)
  const db = await openDb()
  if (!db) return
  try {
    db.transaction(OUTBOX_STORE, 'readwrite').objectStore(OUTBOX_STORE).delete(id)
  } catch {
    // Ignore storage failures.
  }
}

export async function updateOutboxAttempts(op: OutboxOp): Promise<void> {
  const next = { ...op, attempts: op.attempts + 1 }
  memoryOutbox.set(op.id, next)
  const db = await openDb()
  if (!db) return
  try {
    db.transaction(OUTBOX_STORE, 'readwrite').objectStore(OUTBOX_STORE).put(next)
  } catch {
    // Ignore storage failures.
  }
}

/** Test/helper hook; not used by the app at runtime. */
export function clearOfflineStorage(): void {
  memoryCache.clear()
  memoryOutbox.clear()
}
