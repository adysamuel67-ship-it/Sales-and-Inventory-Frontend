/**
 * Shared Modal + restock regression tests
 *
 * Verifies:
 * 1. Modal closes on Escape and backdrop click
 * 2. Clicks inside the panel (inputs, buttons) never close it — the bug class
 *    that made the Restock modal vanish as soon as a trader tapped the field
 * 3. Modal exposes dialog semantics for assistive tech
 * 4. The real ProductsPage restock flow keeps the modal open while typing
 * 5. OfflineBanner appears and disappears with connectivity
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/business/1/products'),
  useParams: jest.fn(() => ({ id: '1' })),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() })),
}))

jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 1, name: 'Ama', email: 'ama@test.com', role: 'OWNER', business_role: 'owner' },
    logout: jest.fn(),
    businesses: [{ business_id: 1, name: 'Ama Shop' }],
    currentBusiness: { business_id: 1, name: 'Ama Shop' },
  })),
}))

jest.mock('@/lib/api', () => ({
  productAPI: {
    list: jest.fn(() =>
      Promise.resolve({ data: { data: [{ product_id: 7, name: 'Rice', price: 50, cost_price: 40, quantity: 5, unit: 'bags', is_active: true }] } })
    ),
    restock: jest.fn(() => Promise.resolve({ data: { data: { quantity: 55 } } })),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deactivate: jest.fn(),
    export: jest.fn(),
  },
}))

import Modal from '@/components/ui/Modal'
import OfflineBanner from '@/components/OfflineBanner'
import ProductsPage from '@/app/business/[id]/products/page'

describe('Modal', () => {
  const renderModal = (onClose = jest.fn()) => {
    render(
      <Modal onClose={onClose} panelClassName="w-full max-w-sm p-6">
        <h2 id="t">Restock</h2>
        <input aria-label="qty" />
        <button onClick={() => {}}>Save</button>
      </Modal>
    )
    return onClose
  }

  it('exposes dialog semantics', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('keeps the panel open when its contents are clicked or typed in', () => {
    const onClose = renderModal()
    fireEvent.click(screen.getByLabelText('qty'))
    fireEvent.click(screen.getByText('Save'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on backdrop click', () => {
    const onClose = renderModal()
    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ProductsPage restock modal', () => {
  it('stays open while the quantity field is used', async () => {
    render(<ProductsPage />)

    const [row] = await screen.findAllByText('Rice')
    fireEvent.click(row)
    fireEvent.click(await screen.findByText('Restock'))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Restock Product')

    const input = screen.getByLabelText('Quantity to add')
    fireEvent.click(input)
    fireEvent.change(input, { target: { value: '50' } })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(input).toHaveValue(50)
  })
})

describe('OfflineBanner', () => {
  const setOnline = (value: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', { value, configurable: true })
  }

  it('renders nothing while online', () => {
    setOnline(true)
    const { container } = render(<OfflineBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a banner when the browser goes offline', async () => {
    setOnline(true)
    render(<OfflineBanner />)
    setOnline(false)
    fireEvent(window, new Event('offline'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/offline/i))
  })

  it('removes the banner when back online', async () => {
    setOnline(false)
    const { container } = render(<OfflineBanner />)
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    setOnline(true)
    fireEvent(window, new Event('online'))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
