'use client'

import { useRef, useState } from 'react'
import { productAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { BoxIcon, XIcon, CheckCircleIcon, AlertTriangleIcon } from '@/components/ui/Icons'

interface ColumnReference {
  field: string
  label: string
  type?: string
  aliases: string[]
  required?: boolean
  note?: string
}

const COLUMN_REFERENCES: ColumnReference[] = [
  {
    field: 'name',
    label: 'Product Name',
    aliases: ['name', 'product name', 'item name', 'product'],
    required: true,
  },
  {
    field: 'price',
    label: 'Selling Price',
    type: 'Number',
    aliases: ['price', 'selling price', 'sale price', 'unit price', 'price (ghc)'],
    required: true,
    note: 'Must be greater than 0',
  },
  {
    field: 'quantity',
    label: 'Quantity / Stock',
    type: 'Number',
    aliases: ['quantity', 'qty', 'stock', 'quantity in stock', 'on hand', 'available'],
  },
  {
    field: 'cost_price',
    label: 'Cost Price',
    type: 'Number',
    aliases: ['cost_price', 'cost price', 'cost', 'buying price', 'purchase price'],
  },
  {
    field: 'sku',
    label: 'SKU / Code',
    aliases: ['sku', 'sku number', 'barcode', 'product code', 'code'],
  },
  {
    field: 'category',
    label: 'Category',
    aliases: ['category', 'type', 'group'],
  },
  {
    field: 'low_stock_threshold',
    label: 'Low Stock Threshold',
    type: 'Number',
    aliases: ['low_stock_threshold', 'low stock threshold', 'reorder level', 'min stock', 'threshold'],
    note: 'Defaults to 10',
  },
  {
    field: 'description',
    label: 'Description',
    aliases: ['description', 'desc', 'details', 'notes'],
  },
  {
    field: 'is_active',
    label: 'Active / Status',
    aliases: ['is_active', 'active', 'status'],
    note: 'Defaults to active',
  },
]

const ACCEPTED_EXTENSIONS = ['.csv', '.xls', '.xlsx']

function isValidExt(name: string): boolean {
  const lower = (name || '').toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function fileTypeLabel(name: string): string {
  const lower = (name || '').toLowerCase()
  if (lower.endsWith('.csv')) return 'CSV'
  if (lower.endsWith('.xlsx')) return 'Excel'
  if (lower.endsWith('.xls')) return 'Excel'
  return 'file'
}

function buildCsvTemplate(): string {
  const headers = [
    'name',
    'price',
    'quantity',
    'cost_price',
    'sku',
    'category',
    'low_stock_threshold',
    'description',
  ]
  const row = ['Example Product', '25.00', '50', '15.00', 'SKU-001', 'Beverages', '10', 'Optional note about the item']
  return [headers.join(','), row.join(',')].join('\n')
}

function download(filename: string, content: string | Blob, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function isColumnErrorStatus(status: number): boolean {
  return status === 406 || status === 422 || status === 400
}

function isColumnErrorMessage(msg: string): boolean {
  const lower = (msg || '').toLowerCase()
  return (
    lower.includes('column') ||
    lower.includes('required colun') ||
    lower.includes('name and price') ||
    lower.includes('could not parse') ||
    lower.includes('no data rows') ||
    lower.includes('null') ||
    lower.includes('header')
  )
}

export default function ProductUploadModal({
  businessId,
  onClose,
  onUploaded,
}: {
  businessId: number
  onClose: () => void
  onUploaded: (message: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    const selected = files?.[0]
    if (!selected) return
    setError('')
    setSuccess('')
    if (!isValidExt(selected.name)) {
      setFile(null)
      setProgress(0)
      setError(
        `"${selected.name}" is not a supported format. Please upload a CSV, XLS, or XLSX file.`
      )
      return
    }
    setFile(selected)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const submit = async () => {
    if (!file || uploading) return
    setUploading(true)
    setProgress(0)
    setError('')
    setSuccess('')
    try {
      await productAPI.upload(businessId, file, (p) => setProgress(p))
      setSuccess(`${file.name} was imported successfully. New rows were added to your inventory.`)
      setFile(null)
      setProgress(100)
    } catch (err: any) {
      const status = err?.response?.status
      const msg = parseApiError(err)
      if (isColumnErrorStatus(status) && isColumnErrorMessage(msg)) {
        setError(
          msg ||
            'We could not read the columns in that file. Check that your headers match the accepted names below.'
        )
      } else {
        setError(msg)
      }
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
              <BoxIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Import Products</h3>
              <p className="text-xs text-neutral-light">Upload a CSV or Excel file to add products in bulk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-5">
          {/* Accepted formats + template */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surfaceAlt rounded-xl p-3.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-light">
              <span>Supported:</span>
              {ACCEPTED_EXTENSIONS.map((ext) => (
                <span key={ext} className="px-2 py-0.5 bg-white rounded-md border border-gray-200 font-mono text-gray-600">
                  {ext}
                </span>
              ))}
            </div>
            <button
              onClick={() =>
                download('product-template.csv', buildCsvTemplate(), 'text/csv;charset=utf-8')
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download CSV template
            </button>
          </div>

          {/* Drag & drop area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-colors p-8 text-center ${
              dragging ? 'border-primary bg-primary-light' : 'border-gray-300 hover:border-primary/60 hover:bg-gray-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-light flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">
              {file ? file.name : 'Drag & drop your file here, or click to browse'}
            </p>
            {file && (
              <div className="mt-1 text-xs text-neutral-light">
                {fileTypeLabel(file.name)} · {formatSize(file.size)}
              </div>
            )}
            {!file && (
              <p className="mt-1 text-xs text-neutral-light">CSV or Excel with a header row</p>
            )}
          </div>

          {/* Selected file summary */}
          {file && !uploading && (
            <div className="flex items-center justify-between gap-3 bg-surfaceAlt rounded-xl p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-neutral-light">{fileTypeLabel(file.name)} · {formatSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setProgress(0) }}
                className="text-xs text-neutral-light hover:text-danger transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-light mb-1.5">
                <span>Uploading {file?.name}...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success / Error */}
          {success && (
            <div className="bg-success-light text-success text-sm p-3 rounded-xl flex items-start gap-2">
              <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="bg-danger-light text-danger text-sm p-3 rounded-xl flex items-start gap-2">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Column reference */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">Accepted Columns</h4>
              <span className="text-xs text-neutral-light">The column names in your file can match any alias below</span>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-neutral-light uppercase tracking-wider border-b border-gray-200">
                    <th className="px-4 py-2.5 font-medium">Field</th>
                    <th className="px-4 py-2.5 font-medium">Accepted header names</th>
                    <th className="px-4 py-2.5 font-medium">Type / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMN_REFERENCES.map((col, idx) => (
                    <tr key={col.field} className={idx % 2 ? 'bg-gray-50/50' : 'bg-white'}>
                      <td className="px-4 py-2.5 align-top">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${col.required ? 'text-gray-900' : 'text-gray-700'}`}>
                          {col.label}
                          {col.required && (
                            <span className="px-1.5 py-0.5 rounded-full bg-danger-light text-danger text-[10px] font-semibold uppercase">
                              required
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="flex flex-wrap gap-1">
                          {col.aliases.map((a) => (
                            <span key={a} className="px-1.5 py-0.5 bg-primary-light text-primary rounded text-xs font-mono">
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 align-top text-xs text-neutral-light">
                        {[col.type, col.note].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-neutral-light">
              Only <span className="font-medium">name</span> and <span className="font-medium">price</span> are required.
            </p>
          </div>

          {/* Duplicate warning */}
          <div className="bg-warning-light text-warning text-sm p-3 rounded-xl flex items-start gap-2">
            <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Products already in your inventory are <span className="font-medium">not added and not overwritten</span>.
              If a product name in your file already exists, that row is skipped — only brand-new product names will be created.
              You can safely re-import the same file.
            </span>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 rounded-b-2xl flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={submit}
            disabled={!file || uploading}
            loading={uploading}
          >
            {uploading ? 'Importing...' : 'Import Products'}
          </Button>
        </div>
      </div>
    </div>
  )
}
