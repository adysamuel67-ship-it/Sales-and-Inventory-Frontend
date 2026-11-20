import { act, fireEvent, render, screen } from '@testing-library/react'
import BarcodeCaptureModal from '@/components/BarcodeCaptureModal'

let mockDetected: ((raw: string) => void) | null = null
const mockStopCamera = jest.fn()

jest.mock('@/lib/useBarcodeScanner', () => ({
  useBarcodeScanner: ({ onDetected }: { onDetected: (raw: string) => void }) => {
    mockDetected = onDetected
    return {
      supported: true,
      cameraActive: true,
      cameraError: '',
      permissionStatus: 'granted',
      videoRef: { current: null },
      startCamera: jest.fn(),
      stopCamera: mockStopCamera,
    }
  },
}))

describe('BarcodeCaptureModal', () => {
  beforeEach(() => {
    mockDetected = null
    mockStopCamera.mockClear()
  })

  it('captures a typed barcode and closes', () => {
    const onCapture = jest.fn()
    const onClose = jest.fn()

    render(<BarcodeCaptureModal onCapture={onCapture} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Barcode'), { target: { value: ' 5901234123457 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use barcode' }))

    expect(onCapture).toHaveBeenCalledWith('5901234123457')
    expect(onClose).toHaveBeenCalled()
  })

  it('offers the existing barcode for confirmation', () => {
    const onCapture = jest.fn()
    const onClose = jest.fn()

    render(<BarcodeCaptureModal initialValue="0012345678905" onCapture={onCapture} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Use barcode' }))

    expect(onCapture).toHaveBeenCalledWith('0012345678905')
    expect(onClose).toHaveBeenCalled()
  })

  it('captures a code detected by the camera', () => {
    const onCapture = jest.fn()
    const onClose = jest.fn()

    render(<BarcodeCaptureModal onCapture={onCapture} onClose={onClose} />)

    act(() => mockDetected?.('  5901234123457  '))

    expect(mockStopCamera).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use scanned barcode' }))

    expect(onCapture).toHaveBeenCalledWith('5901234123457')
    expect(onClose).toHaveBeenCalled()
  })
})
