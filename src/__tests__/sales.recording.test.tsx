import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SalesPage from '@/app/business/[id]/sales/page'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

const recordMock = jest.fn()
const listSalesMock = jest.fn()
const productListMock = jest.fn()
const membersMock = jest.fn()
const customerListMock = jest.fn()
const customerCreateMock = jest.fn()

jest.mock('@/lib/api', () => ({
  saleAPI: {
    record: (...a: any[]) => recordMock(...a),
    list: (...a: any[]) => listSalesMock(...a),
    get: jest.fn(),
    update: jest.fn(),
    getReceipt: jest.fn(),
    delete: jest.fn(),
  },
  productAPI: { list: (...a: any[]) => productListMock(...a) },
  customerAPI: {
    list: (...a: any[]) => customerListMock(...a),
    create: (...a: any[]) => customerCreateMock(...a),
  },
  adminAPI: { listMembers: (...a: any[]) => membersMock(...a) },
}))

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Cashier', role: 'cashier', business_role: 'cashier' } }),
}))

jest.mock('@/components/SaleDetailModal', () => () => null)
jest.mock('@/components/SaleEditModal', () => () => null)
jest.mock('@/components/SaleReceiptModal', () => () => null)
jest.mock('@/components/ui/ProductCombobox', () => ({
  __esModule: true,
  default: ({ value, onChange, products }: any) => (
    <select
      aria-label="product"
      data-testid="product-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">--</option>
      {(products || []).map((p: any) => (
        <option key={p.product_id} value={String(p.product_id)}>
          {p.name}
        </option>
      ))}
    </select>
  ),
}))

const PRODUCTS = [
  { product_id: 10, name: 'Rice 50kg', price: 400, quantity: 20, is_active: true },
  { product_id: 11, name: 'Oil 1L', price: 60, quantity: 5, is_active: true },
]

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function renderPage() {
  render(<SalesPage />)
  await waitFor(() => expect(productListMock).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: /record sale/i }))
}

function fillSale(productId = '10', qty = '2') {
  fireEvent.change(screen.getByTestId('product-select'), { target: { value: productId } })
  fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: qty } })
}

beforeEach(() => {
  jest.clearAllMocks()
  listSalesMock.mockResolvedValue({ data: [] })
  productListMock.mockResolvedValue({ data: PRODUCTS })
  membersMock.mockResolvedValue({ data: [] })
  customerListMock.mockResolvedValue({ data: [] })
})

describe('Recording a sale does not wait for the API', () => {
  it('confirms the sale while the request is still in flight', async () => {
    const gate = deferred<any>()
    recordMock.mockReturnValue(gate.promise)

    await renderPage()
    fillSale()
    fireEvent.click(screen.getByRole('button', { name: /confirm sale/i }))

    expect(await screen.findByText('Sale saved')).toBeInTheDocument()
    expect((await screen.findAllByText('Rice 50kg')).length).toBeGreaterThan(0)
    expect(recordMock).toHaveBeenCalledTimes(1)
    expect(gate.promise).toBeDefined()

    expect(screen.getByRole('button', { name: /record sale/i })).toBeInTheDocument()
    expect(await screen.findByText(/Saving/)).toBeInTheDocument()

    gate.resolve({ data: { sale_id: 555, total_amount: 800, payment_method: 'cash', sales_items: [] } })

    await waitFor(() => expect(screen.queryByText(/Saving/)).not.toBeInTheDocument())
    expect(screen.queryByText('Sale saved')).toBeInTheDocument()
  })

  it('replaces the placeholder id once the server responds', async () => {
    const gate = deferred<any>()
    recordMock.mockReturnValue(gate.promise)

    await renderPage()
    fillSale()
    fireEvent.click(screen.getByRole('button', { name: /confirm sale/i }))
    await screen.findByText('Sale saved')

    gate.resolve({ data: { sale_id: 777, total_amount: 800, payment_method: 'cash', sales_items: [] } })
    await waitFor(() => expect(screen.queryByText(/Saving/)).not.toBeInTheDocument())

    expect(screen.queryAllByText('Rice 50kg').length).toBeGreaterThan(0)
  })

  it('flags a sale that could not be saved and offers a retry', async () => {
    recordMock.mockRejectedValue({ response: { data: { detail: 'Insufficient stock for Rice 50kg' } } })

    await renderPage()
    fillSale()
    fireEvent.click(screen.getByRole('button', { name: /confirm sale/i }))

    expect(await screen.findByText(/did not save/i)).toBeInTheDocument()
    expect((await screen.findAllByText(/Insufficient stock/)).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    expect(screen.queryByText('Sale saved')).not.toBeInTheDocument()
  })

  it('clears the error once a retry succeeds', async () => {
    recordMock.mockRejectedValueOnce({ response: { data: { detail: 'Boom' } } })
    recordMock.mockResolvedValueOnce({ data: { sale_id: 888, total_amount: 800, payment_method: 'cash', sales_items: [] } })

    await renderPage()
    fillSale()
    fireEvent.click(screen.getByRole('button', { name: /confirm sale/i }))
    await screen.findByText(/did not save/i)

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => expect(screen.queryByText(/did not save/i)).not.toBeInTheDocument())
  })

  it('drops the failed sale and restores stock when discarded', async () => {
    recordMock.mockRejectedValue({ response: { data: { detail: 'Boom' } } })

    await renderPage()
    fillSale()
    fireEvent.click(screen.getByRole('button', { name: /confirm sale/i }))
    await screen.findByText(/did not save/i)

    fireEvent.click(screen.getByRole('button', { name: /discard/i }))
    await waitFor(() => expect(screen.queryByText(/did not save/i)).not.toBeInTheDocument())
  })
})