import {
  clearOfflineStorage,
  dequeue,
  enqueue,
  getCached,
  listOutbox,
  scopeKey,
  setCached,
} from '@/lib/offlineDb'
import {
  clearOfflineData,
  discardConflicts,
  flushOutbox,
  OUTBOX_CONFLICT_EVENT,
  OUTBOX_FAILURE_EVENT,
  OUTBOX_SUCCESS_EVENT,
  registerSyncHandler,
} from '@/lib/offlineSync'

describe('offline storage and sync', () => {
  const unregisters: (() => void)[] = []

  beforeEach(async () => {
    await clearOfflineStorage()
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    unregisters.splice(0).forEach((stop) => stop())
  })

  it('keeps cached reads when the network is gone', async () => {
    await setCached('products:1', [{ product_id: 7, name: 'Sugar' }])
    expect(await getCached('products:1')).toEqual([{ product_id: 7, name: 'Sugar' }])
    expect(await getCached('missing')).toBeNull()
  })

  it('stores queued writes with a stable idempotency key', async () => {
    const op = await enqueue({
      type: 'sale.record',
      businessId: 1,
      payload: { list_items: [{ product_id: 7, quantity: 2 }] },
      idempotencyKey: 'sale-fixed',
      localId: '-1',
    })
    expect(op.idempotencyKey).toBe('sale-fixed')
    expect((await listOutbox(1)).map((item) => item.id)).toEqual([op.id])
    expect(await listOutbox(2)).toEqual([])
  })

  it('flushes the outbox once and removes successfully synced operations', async () => {
    const handler = jest.fn().mockResolvedValue({ sale_id: 42 })
    unregisters.push(registerSyncHandler('sale.record', handler))
    const onSuccess = jest.fn()
    window.addEventListener(OUTBOX_SUCCESS_EVENT, onSuccess)

    const op = await enqueue({ type: 'sale.record', businessId: 1, payload: {} })
    await flushOutbox()

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: op.id }))
    expect(await listOutbox()).toEqual([])
    expect(onSuccess).toHaveBeenCalledTimes(1)
    window.removeEventListener(OUTBOX_SUCCESS_EVENT, onSuccess)
  })

  it('retains failed operations and reports them', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('offline'))
    unregisters.push(registerSyncHandler('sale.record', handler))
    const onFailure = jest.fn()
    window.addEventListener(OUTBOX_FAILURE_EVENT, onFailure)

    const op = await enqueue({ type: 'sale.record', businessId: 1, payload: {} })
    await flushOutbox()

    expect(await listOutbox()).toEqual([expect.objectContaining({ id: op.id, attempts: 1 })])
    expect(onFailure).toHaveBeenCalledTimes(1)
    window.removeEventListener(OUTBOX_FAILURE_EVENT, onFailure)
    await dequeue(op.id)
  })

  it('does not attempt a flush while offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    const handler = jest.fn().mockResolvedValue({})
    unregisters.push(registerSyncHandler('sale.record', handler))

    await enqueue({ type: 'sale.record', businessId: 1, payload: {} })
    await flushOutbox()

    expect(handler).not.toHaveBeenCalled()
    expect(await listOutbox()).toHaveLength(1)
  })

  it('isolates cached data and queued writes by account', async () => {
    const first = scopeKey(1, 5, 'sales:5')
    const second = scopeKey(2, 5, 'sales:5')
    await setCached(first, ['first account'])
    await setCached(second, ['second account'])

    expect(await getCached(first)).toEqual(['first account'])
    expect(await getCached(second)).toEqual(['second account'])

    await enqueue({ type: 'sale.record', businessId: 5, userId: 1, payload: {} })
    await enqueue({ type: 'sale.record', businessId: 5, userId: 2, payload: {} })

    expect(await listOutbox(5, 1)).toHaveLength(1)
    expect(await listOutbox(5, 2)).toHaveLength(1)
  })

  it('flags conflicting writes and stops retrying them until discarded', async () => {
    const conflictError = { response: { status: 409 } }
    const handler = jest.fn().mockRejectedValue(conflictError)
    unregisters.push(registerSyncHandler('sale.record', handler))
    const onConflict = jest.fn()
    window.addEventListener(OUTBOX_CONFLICT_EVENT, onConflict)

    const op = await enqueue({ type: 'sale.record', businessId: 1, userId: 7, payload: {} })
    await flushOutbox()
    await flushOutbox()

    expect(onConflict).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(await listOutbox()).toEqual([expect.objectContaining({ id: op.id, conflict: true })])

    await discardConflicts()
    expect(await listOutbox()).toEqual([])
    window.removeEventListener(OUTBOX_CONFLICT_EVENT, onConflict)
  })

  it('clears offline data during account changes', async () => {
    await setCached('session-data', ['private'])
    await enqueue({ type: 'sale.record', businessId: 1, payload: {} })
    await clearOfflineData()

    expect(await getCached('session-data')).toBeNull()
    expect(await listOutbox()).toEqual([])
  })
})
