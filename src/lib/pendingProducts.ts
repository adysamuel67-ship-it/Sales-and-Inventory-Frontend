import type { Product } from './types'

let nextTempId = -1

const pendingCreates = new Map<number, Promise<Product | null>>()

export function newTempProductId(): number {
  return nextTempId--
}

export function isTempProductId(id: number): boolean {
  return Number.isFinite(id) && id < 0
}

export function registerPendingProductCreate(tempId: number, save: Promise<Product | null>): void {
  pendingCreates.set(tempId, save)
}

export function resolvePendingProducts(ids: number[]): Promise<Map<number, Product>> {
  const resolved = new Map<number, Product>()
  const tempIds = Array.from(new Set(ids.filter(isTempProductId)))

  return Promise.all(
    tempIds.map(async (tempId) => {
      const saved = await (pendingCreates.get(tempId) ?? Promise.resolve(null))
      if (!saved || !saved.product_id || saved.product_id <= 0) {
        throw new Error('A newly added product could not be saved. Remove it and try again.')
      }
      resolved.set(tempId, saved)
    })
  ).then(() => resolved)
}
