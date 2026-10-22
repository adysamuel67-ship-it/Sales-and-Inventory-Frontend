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
const productCreateMock = jest.fn()
const membersMock = jest.fn()
const customerListMock = jest.fn()

jest.mock('@/lib/api', () => ({
  saleAPI: {
    record: (...a: any[]) => recordMock(...a),
    list: (...a: any[]) => listSalesMock(...a),
    get: jest.fn(),
    update: jest.fn(),
    getReceipt: jest.fn(),
    delete: jest.fn(),
  },
  productAPI: {
    list: (...a: any[]) => productListMock(...a),
    create: (...a: any[]) => productCreateMock(...a),
  },
  customerAPI: {
    list: (...a: any[]) => customerListMock(...a),
    create: jest.fn(),
  },
  adminAPI: { listMembers: (...a: any[]) => membersMock(...a) },
}))

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Owner', role: 'admin', business_role: 'admin' } }),
}))

jest.mock('@/components/SaleDetailModal', () => () => null)
jest.mock('@/components/SaleEditModal', () => () => null)
jest.mock('@/components/SaleReceiptModal', () => () => null)

async function openSaleForm() {
  render(<SalesPage />)
  await waitFor(() => expect(productListMock).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: /record sale/i }))
  const input = screen.getByRole('combobox') as HTMLInputElement
  fireEvent.focus(input)
  return input
}

describe('Adding a product while recording a sale', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    listSalesMock.mockResolvedValue({ data: [] })
    productListMock.mockResolvedValue({
      data: [{ product_id: 10, name: 'Rice 50kg', price: 400, quantity: 20, is_active: true }],
    })
    membersMock.mockResolvedValue({ data: [] })
    customerListMock.mockResolvedValue({ data: [] })
    productCreateMock.mockResolvedValue({
      data: { product_id: 99, name: 'Sugar', price: 5, quantity: 25, is_active: true },
    })
    recordMock.mockResolvedValue({ data: { sale_id: 1, total_amount: 10, payment_method: 'cash', sales_items: [] } })
  })

  it('creates the missing product from the sale form and selects it for the sale', async () => {
    const input = await openSaleForm()
    fireEvent.change(input, { target: { value: 'Sugar' } })

    fireEvent.click(screen.getByTestId('quick-add-product'))

    expect(screen.getByRole('heading', { name: /add product/i })).toBeInTheDocument()
    expect((screen.getByLabelText(/name \*/i) as HTMLInputElement).value).toBe('Sugar')

    fireEvent.change(screen.getByLabelText(/selling price/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/quantity in stock/i), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: /add & select/i }))

    await waitFor(() =>
      expect(productCreateMock).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Sugar',
        price: 5,
        quantity: 25,
      }))
    )

    await waitFor(() => expect(screen.queryByRole('heading', { name: /add product/i })).not.toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/quantity for sugar/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm sale/i }))

    await waitFor(() =>
      expect(recordMock).toHaveBeenCalledWith(1, expect.objectContaining({
        list_items: [{ product_id: 99, quantity: 2 }],
      }))
    )
  })

  it('keeps the sale form open and shows the API error when product creation fails', async () => {
    productCreateMock.mockRejectedValue({ response: { data: { detail: 'A product with this name already exists' } } })

    const input = await openSaleForm()
    fireEvent.change(input, { target: { value: 'Sugar' } })
    fireEvent.click(screen.getByTestId('quick-add-product'))

    fireEvent.change(screen.getByLabelText(/selling price/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/quantity in stock/i), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: /add & select/i }))

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /add product/i })).toBeInTheDocument()
  })
})
