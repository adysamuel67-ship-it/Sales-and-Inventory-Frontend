/**
 * Product Upload Modal Tests
 *
 * Verifies that a failed import surfaces exactly what the backend returned,
 * and that a successful import reports the row counts from the response.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProductUploadModal from '@/components/ProductUploadModal'
import { productAPI } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  productAPI: { upload: jest.fn() },
}))

const uploadMock = productAPI.upload as jest.Mock

function selectFile(name = 'products.csv') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, {
    target: { files: [new File(['name,price\nRice,5\n'], name, { type: 'text/csv' })] },
  })
}

function clickImport() {
  fireEvent.click(screen.getByRole('button', { name: /import products/i }))
}

describe('ProductUploadModal error handling', () => {
  it('shows the backend detail message when the import fails', async () => {
    uploadMock.mockRejectedValue({
      response: { status: 403, data: { detail: 'Price and product name are required columns' } },
    })

    render(<ProductUploadModal businessId={1} onClose={() => {}} onUploaded={() => {}} />)
    selectFile()
    clickImport()

    await waitFor(() =>
      expect(screen.getByText('Price and product name are required columns')).toBeInTheDocument()
    )
  })

  it('shows a plain text backend body when detail is missing', async () => {
    uploadMock.mockRejectedValue({
      response: { status: 500, data: 'Internal Server Error' },
      message: 'Request failed with status code 500',
    })

    render(<ProductUploadModal businessId={1} onClose={() => {}} onUploaded={() => {}} />)
    selectFile()
    clickImport()

    await waitFor(() =>
      expect(screen.getByText('Internal Server Error')).toBeInTheDocument()
    )
    expect(screen.queryByText('Request failed with status code 500')).not.toBeInTheDocument()
  })

  it('shows the message key some backend errors use', async () => {
    uploadMock.mockRejectedValue({
      response: { status: 429, data: { msg: 'Too many requests, try again later' } },
    })

    render(<ProductUploadModal businessId={1} onClose={() => {}} onUploaded={() => {}} />)
    selectFile()
    clickImport()

    await waitFor(() =>
      expect(screen.getByText('Too many requests, try again later')).toBeInTheDocument()
    )
  })
})

describe('ProductUploadModal success', () => {
  it('reports the counts returned for the uploaded rows', async () => {
    uploadMock.mockResolvedValue({
      data: { message: 'Product stored successfully', created: 3, skipped_duplicates: 1 },
    })
    const onUploaded = jest.fn()

    render(<ProductUploadModal businessId={1} onClose={() => {}} onUploaded={onUploaded} />)
    selectFile()
    clickImport()

    await waitFor(() =>
      expect(screen.getByText('3 products added · 1 skipped (duplicate name)')).toBeInTheDocument()
    )
    expect(onUploaded).toHaveBeenCalledWith('3 products added · 1 skipped (duplicate name)')
  })
})
