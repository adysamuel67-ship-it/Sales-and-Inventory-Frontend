import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import BarcodeScanModal from '@/components/BarcodeScanModal'
import { cameraScanningSupported, isValidBarcode, normalizeBarcode } from '@/lib/barcode'

const mockScan = jest.fn()

jest.mock('@/lib/api', () => ({
  productAPI: {
    scan: (...args: any[]) => mockScan(...args),
  },
}))

function renderScanner(overrides: Partial<React.ComponentProps<typeof BarcodeScanModal>> = {}) {
  const props = {
    businessId: 1,
    canCreate: true,
    onClose: jest.fn(),
    onProduct: jest.fn(),
    onSuggestion: jest.fn(),
    onCreate: jest.fn(),
    ...overrides,
  }
  render(<BarcodeScanModal {...props} />)
  return props
}

function typeAndLookup(value: string) {
  fireEvent.change(screen.getByLabelText(/^barcode$/i), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: /look up/i }))
}

describe('barcode helpers', () => {
  it('normalizes scanner whitespace without dropping leading zeros', () => {
    expect(normalizeBarcode(' 0012345678905\n')).toBe('0012345678905')
  })

  it('treats empty and whitespace-only values as invalid', () => {
    expect(isValidBarcode('')).toBe(false)
    expect(isValidBarcode('   ')).toBe(false)
    expect(isValidBarcode('0123')).toBe(true)
  })

  it('reports camera scanning as unsupported when the browser has no BarcodeDetector', () => {
    expect(cameraScanningSupported()).toBe(false)
  })
})

describe('BarcodeScanModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('looks up a trimmed barcode and shows the local product', async () => {
    mockScan.mockResolvedValue({
      data: {
        found_locally: true,
        source: 'inventory',
        product: {
          product_id: 5,
          name: 'Milk 1L',
          price: 12,
          cost_price: 8,
          quantity: 4,
          unit: 'units',
          barcode: '5901234123457',
        },
        suggested_name: null,
      },
    })

    const props = renderScanner()
    typeAndLookup('  5901234123457  ')

    await waitFor(() => expect(mockScan).toHaveBeenCalledWith(1, '5901234123457'))
    expect(await screen.findByText('Milk 1L')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /view product/i }))
    expect(props.onProduct).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: 5, name: 'Milk 1L', barcode: '5901234123457' })
    )
  })

  it('offers the external catalogue name and passes the barcode to the add flow', async () => {
    mockScan.mockResolvedValue({
      data: {
        found_locally: false,
        source: 'openfoodfacts',
        product: null,
        suggested_name: 'Coca Cola 500ml',
      },
    })

    const props = renderScanner()
    typeAndLookup('5449000000996')

    expect(await screen.findByText('Coca Cola 500ml')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add this product/i }))

    expect(props.onSuggestion).toHaveBeenCalledWith('5449000000996', 'Coca Cola 500ml')
  })

  it('shows a not-found state with a manual add option for managers', async () => {
    mockScan.mockRejectedValue({ response: { status: 404 } })

    const props = renderScanner()
    typeAndLookup('0000000000000')

    expect(await screen.findByText(/no product found/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^add product$/i }))

    expect(props.onCreate).toHaveBeenCalledWith('0000000000000')
  })

  it('hides add controls for staff without manage permission', async () => {
    mockScan.mockRejectedValue({ response: { status: 404 } })

    renderScanner({ canCreate: false })
    typeAndLookup('0000000000000')

    expect(await screen.findByText(/no product found/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^add product$/i })).not.toBeInTheDocument()
  })

  it('does not call the API for an empty barcode', async () => {
    renderScanner()
    typeAndLookup('   ')

    expect(mockScan).not.toHaveBeenCalled()
    expect(await screen.findByText(/enter or scan a barcode first/i)).toBeInTheDocument()
  })

  it('surfaces upstream lookup errors', async () => {
    mockScan.mockRejectedValue({
      response: { status: 502, data: { detail: 'Barcode service is unavailable' } },
    })

    renderScanner()
    typeAndLookup('1234567890123')

    expect(await screen.findByText('Barcode service is unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/no product found/i)).not.toBeInTheDocument()
  })
})
