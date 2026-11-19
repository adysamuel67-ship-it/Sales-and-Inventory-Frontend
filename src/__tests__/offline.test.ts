import { clearOfflineStorage, dequeue, enqueue, getCached, listOutbox, setCached } from '@/lib/offlineDb'
import {
  OUTBOX_FAILURE_EVENT,
  OUTBOX_SUCCESS_EVENT,
  flushOutbox,
  registerSyncHandler,
} from '@/lib/offlineSync'

describe('offline storage and sync', () => {
  const unregisters: (() => void)[] = []

  beforeEach(() => {
    clearOfflineStorage()
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
})
