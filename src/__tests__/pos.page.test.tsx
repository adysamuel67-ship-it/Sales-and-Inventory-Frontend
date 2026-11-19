import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PosPage from '@/app/business/[id]/pos/page'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}))

let mockUser: any = { id: 1, name: 'Cashier', role: 'cashier', business_role: 'cashier' }

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const productListMock = jest.fn()
const recordMock = jest.fn()

jest.mock('@/lib/api', () => ({
  productAPI: {
    list: (...args: any[]) => productListMock(...args),
    create: jest.fn(),
  },
  saleAPI: {
    record: (...args: any[]) => recordMock(...args),
  },
}))

jest.mock('@/lib/posCache', () => ({
  cacheProducts: jest.fn().mockResolvedValue(undefined),
  getCachedProducts: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/components/QuickAddProductModal', () => () => null)
jest.mock('@/components/SaleReceiptModal', () => () => null)

const PRODUCTS = [
  { product_id: 1, name: 'Coca-Cola 500ml', price: 15, quantity: 10, unit: 'bottles', barcode: '111', is_active: true },
  { product_id: 2, name: 'Biscuit', price: 8, quantity: 5, unit: 'packs', barcode: '222', is_active: true },
]

function scan(code: string) {
  fireEvent.change(screen.getByLabelText(/scan or type a barcode/i), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
}

async function renderPos() {
  render(<PosPage />)
  await waitFor(() => expect(productListMock).toHaveBeenCalled())
  await screen.findByText(/ready to scan products/i)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUser = { id: 1, name: 'Cashier', role: 'cashier', business_role: 'cashier' }
  productListMock.mockResolvedValue({ data: PRODUCTS })
  recordMock.mockResolvedValue({ data: { sale_id: 77 } })
})

describe('POS mode', () => {
  it('adds scanned products, merges quantities and submits one bulk sale', async () => {
    await renderPos()

    scan('111')
    expect(await screen.findByText('Coca-Cola 500ml')).toBeInTheDocument()

    scan('222')
    expect(await screen.findByText('Biscuit')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /increase quantity of coca-cola 500ml/i }))

    await waitFor(() => expect(screen.getByText('GHS 38.00')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /complete sale/i }))

    await waitFor(() =>
      expect(recordMock).toHaveBeenCalledWith(
        1,
        {
          list_items: [
            { product_id: 1, quantity: 2 },
            { product_id: 2, quantity: 1 },
          ],
          amount_paid: 38,
          payment_method: 'cash',
        },
        expect.any(String)
      )
    )

    expect(await screen.findByText(/sale completed successfully/i)).toBeInTheDocument()
    expect(screen.getByText(/no items scanned yet/i)).toBeInTheDocument()
  })

  it('blocks completion when a quantity exceeds available stock', async () => {
    productListMock.mockResolvedValue({
      data: [{ ...PRODUCTS[0], quantity: 1 }],
    })

    await renderPos()
    scan('111')

    fireEvent.click(await screen.findByRole('button', { name: /increase quantity of coca-cola 500ml/i }))

    expect(await screen.findByText(/only 1 bottles in stock/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeDisabled()
  })

  it('offers product creation to managers when a barcode is not in the catalogue', async () => {
    mockUser = { id: 1, name: 'Owner', role: 'admin', business_role: 'admin' }

    await renderPos()
    scan('999999')

    expect(await screen.findByText(/barcode not in your inventory/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add this product/i })).toBeInTheDocument()
  })
})
