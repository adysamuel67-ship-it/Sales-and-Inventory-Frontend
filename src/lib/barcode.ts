export const BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'codabar',
]

/** Trim scanner whitespace/newlines without altering leading zeros. */
export function normalizeBarcode(value: string): string {
  return (value || '').trim()
}

export function isValidBarcode(value: string): boolean {
  return normalizeBarcode(value).length > 0
}

/**
 * Native BarcodeDetector is Chromium-only today. Callers should still offer
 * manual entry when this returns false (notably iOS Safari and Firefox).
 */
export function cameraScanningSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return (
    typeof (window as any).BarcodeDetector !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}
