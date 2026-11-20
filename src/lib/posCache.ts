import type { Product } from './types'

const DB_NAME = 'bbgh-pos'
const DB_VERSION = 1
const STORE = 'products'
const BUSINESS_INDEX = 'businessId'

interface CachedProductRecord {
  key: string
  businessId: number
  barcode: string
  product: Product
  savedAt: number
}

// IndexedDB is unavailable in private modes and in tests; the in-memory map
// keeps the same API working so POS lookups never depend on storage.
const memory = new Map<string, Product>()
let dbPromise: Promise<IDBDatabase | null> | null = null

function cacheKey(businessId: number, barcode: string): string {
  return `${businessId}:${barcode}`
}

function withBarcode(product: Product): string {
  return (product.barcode || '').trim()
}

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
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' })
        store.createIndex(BUSINESS_INDEX, 'businessId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })

  return dbPromise
}

/**
 * Persists the current business catalogue so the POS can still identify
 * products from a warm cache if the first catalogue request fails.
 */
export async function cacheProducts(businessId: number, products: Product[]): Promise<void> {
  if (!Number.isFinite(businessId)) return

  const entries = products
    .map((product) => ({ product, barcode: withBarcode(product) }))
    .filter((entry) => entry.barcode.length > 0)

  for (const { product, barcode } of entries) {
    memory.set(cacheKey(businessId, barcode), product)
  }

  const db = await openDb()
  if (!db) return

  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const savedAt = Date.now()
      for (const { product, barcode } of entries) {
        const record: CachedProductRecord = {
          key: cacheKey(businessId, barcode),
          businessId,
          barcode,
          product,
          savedAt,
        }
        store.put(record)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    })
  } catch {
    // Storage failures must never interrupt a sale.
  }
}

export async function getCachedProduct(businessId: number, barcode: string): Promise<Product | null> {
  const code = (barcode || '').trim()
  if (!code) return null

  const key = cacheKey(businessId, code)
  const fromMemory = memory.get(key)
  if (fromMemory) return fromMemory

  const db = await openDb()
  if (!db) return null

  try {
    return await new Promise<Product | null>((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(key)
      request.onsuccess = () => {
        const record = request.result as CachedProductRecord | undefined
        if (record?.product) memory.set(key, record.product)
        resolve(record?.product ?? null)
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function getCachedProducts(businessId: number): Promise<Product[]> {
  const prefix = `${businessId}:`
  const fromMemory = Array.from(memory.entries())
    .filter(([key]) => key.startsWith(prefix))
    .map(([, product]) => product)
  if (fromMemory.length > 0) return fromMemory

  const db = await openDb()
  if (!db) return []

  try {
    return await new Promise<Product[]>((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).index(BUSINESS_INDEX).getAll(IDBKeyRange.only(businessId))
      request.onsuccess = () => {
        const records = (request.result || []) as CachedProductRecord[]
        const products = records.map((record) => record.product)
        for (const record of records) {
          if (record.barcode) memory.set(cacheKey(businessId, record.barcode), record.product)
        }
        resolve(products)
      }
      request.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

/** Test/helper hook; not used by the app at runtime. */
export function clearProductCache(): void {
  memory.clear()
}

export async function clearAllProductCaches(): Promise<void> {
  memory.clear()
  const db = await openDb()
  if (!db) return
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear()
  } catch {
    // Sign-out must not fail because storage is unavailable.
  }
}
