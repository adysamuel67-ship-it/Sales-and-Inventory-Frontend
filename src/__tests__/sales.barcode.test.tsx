import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SalesPage from '@/app/business/[id]/sales/page'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

const mockSaleList = jest.fn()
const mockProductList = jest.fn()
const mockProductCreate = jest.fn()
const mockScan = jest.fn()
const mockMembers = jest.fn()

jest.mock('@/lib/api', () => ({
  saleAPI: {
    record: jest.fn(),
    list: (...args: any[]) => mockSaleList(...args),
    get: jest.fn(),
    update: jest.fn(),
    getReceipt: jest.fn(),
    delete: jest.fn(),
  },
  productAPI: {
    list: (...args: any[]) => mockProductList(...args),
    create: (...args: any[]) => mockProductCreate(...args),
    scan: (...args: any[]) => mockScan(...args),
  },
  customerAPI: {
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn(),
  },
  adminAPI: { listMembers: (...args: any[]) => mockMembers(...args) },
}))

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Owner', role: 'admin', business_role: 'admin' } }),
}))

jest.mock('@/components/SaleDetailModal', () => () => null)
jest.mock('@/components/SaleEditModal', () => () => null)
jest.mock('@/components/SaleReceiptModal', () => () => null)

async function openSaleForm() {
  render(<SalesPage />)
  await waitFor(() => expect(mockProductList).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: /record sale/i }))
}

async function scanBarcode(code: string) {
  fireEvent.click(screen.getByRole('button', { name: /scan barcode/i }))
  fireEvent.change(screen.getByLabelText(/^barcode$/i), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: /look up/i }))
  await waitFor(() => expect(mockScan).toHaveBeenCalledWith(1, code))
}

describe('Scanning a barcode while recording a sale', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSaleList.mockResolvedValue({ data: [] })
    mockProductList.mockResolvedValue({
      data: [
        { product_id: 10, name: 'Rice 50kg', price: 400, quantity: 20, is_active: true, barcode: '5901234123457' },
      ],
    })
    mockMembers.mockResolvedValue({ data: [] })
  })

  it('adds a locally matched product to the sale line', async () => {
    mockScan.mockResolvedValue({
      data: {
        found_locally: true,
        source: 'inventory',
        product: { product_id: 10, name: 'Rice 50kg', price: 400, cost_price: 300, quantity: 20, unit: 'units', barcode: '5901234123457' },
        suggested_name: null,
      },
    })

    await openSaleForm()
    await scanBarcode('5901234123457')

    fireEvent.click(await screen.findByRole('button', { name: /add to sale/i }))

    await waitFor(() =>
      expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Rice 50kg')
    )
    expect((screen.getByLabelText(/quantity for rice 50kg/i) as HTMLInputElement).value).toBe('1')
  })

  it('prefills a new product with the external name and scanned barcode', async () => {
    mockScan.mockResolvedValue({
      data: {
        found_locally: false,
        source: 'openfoodfacts',
        product: null,
        suggested_name: 'Coca Cola 500ml',
      },
    })

    await openSaleForm()
    await scanBarcode('5449000000996')

    fireEvent.click(await screen.findByRole('button', { name: /add this product/i }))

    expect(await screen.findByRole('heading', { name: /add product/i })).toBeInTheDocument()
    expect((screen.getByLabelText(/name \*/i) as HTMLInputElement).value).toBe('Coca Cola 500ml')
    expect((screen.getByLabelText(/^barcode$/i) as HTMLInputElement).value).toBe('5449000000996')
  })

  it('opens an empty add form with only the barcode when nothing matches', async () => {
    mockScan.mockRejectedValue({ response: { status: 404 } })

    await openSaleForm()
    await scanBarcode('0000000000000')

    fireEvent.click(await screen.findByRole('button', { name: /^add product$/i }))

    expect(await screen.findByRole('heading', { name: /add product/i })).toBeInTheDocument()
    expect((screen.getByLabelText(/name \*/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/^barcode$/i) as HTMLInputElement).value).toBe('0000000000000')
  })
})
