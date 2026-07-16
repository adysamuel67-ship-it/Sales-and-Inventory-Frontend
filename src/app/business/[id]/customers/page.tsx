'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { customerAPI } from '@/lib/api'

interface Customer {
  customer_id: number
  name: string
  phone?: string
  email?: string
  address?: string
  is_active?: boolean
  [key: string]: any
}

interface DebtCustomer {
  customer_id: number
  customer_debt: number
}

type Tab = 'all' | 'debt'

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key]
    }
  }
  return []
}

function CustomersContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = parseInt(params?.id as string)
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [debtData, setDebtData] = useState<DebtCustomer[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [debtError, setDebtError] = useState('')
  const [success, setSuccess] = useState('')

  const returnSale = searchParams.get('return_sale') === '1'
  const presetName = searchParams.get('name') || ''
  const presetPhone = searchParams.get('phone') || ''

  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState(presetName)
  const [formPhone, setFormPhone] = useState(presetPhone)
  const [formEmail, setFormEmail] = useState('')
  const [creating, setCreating] = useState(false)

  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const isStaff = user?.role === 'STAFF' || user?.role === 'staff'

  const loadCustomers = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    setDebtError('')
    try {
      const [custRes, debtRes] = await Promise.allSettled([
        customerAPI.list(businessId),
        customerAPI.listWithDebt(businessId),
      ])
      if (custRes.status === 'fulfilled') {
        setCustomers(extractArray(custRes.value.data))
      } else {
        const detail = custRes.reason?.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'Failed to load customers')
      }
      if (debtRes.status === 'fulfilled') {
        const raw = debtRes.value.data
        const arr = extractArray(raw)
        setDebtData(arr.map((d: any) => ({
          customer_id: d.customer_id ?? d.user_id ?? d.id,
          customer_debt: Number(d.customer_debt ?? d.debt ?? d.amount ?? 0),
        })))
      } else {
        const detail = debtRes.reason?.response?.data?.detail
        setDebtError(typeof detail === 'string' ? detail : 'Could not load debt data')
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    if (businessId) loadCustomers()
  }, [businessId])

  useEffect(() => {
    if (presetName || presetPhone) {
      setShowForm(true)
    }
  }, [presetName, presetPhone])

  const debtMap = new Map(debtData.filter((d) => d.customer_debt > 0).map((d) => [d.customer_id, d.customer_debt]))
  const debtCustomerIds = new Set(debtMap.keys())
  const debtCustomers = customers.filter((c) => debtCustomerIds.has(c.customer_id))
  const totalDebt = debtData.filter((d) => d.customer_debt > 0).reduce((sum, d) => sum + d.customer_debt, 0)

  const displayedCustomers = activeTab === 'debt' ? debtCustomers : customers

  const filtered = displayedCustomers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !formName.trim()) return
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      await customerAPI.create(businessId, {
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
      })
      setFormName('')
      setFormPhone('')
      setFormEmail('')
      setShowForm(false)
      setSuccess('Customer created successfully!')

      if (returnSale) {
        setTimeout(() => {
          router.push(`/business/${businessId}/sales`)
        }, 1000)
        return
      }

      loadCustomers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to create customer')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!businessId) return
    try {
      await customerAPI.delete(businessId, id)
      setDeleteConfirm(null)
      setSuccess('Customer deleted.')
      loadCustomers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete customer')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-neutral-light mt-1">
            {returnSale ? 'Create a customer to complete the sale' : 'Manage your customers and debts'}
          </p>
        </div>
        {!isStaff && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-success-light text-success text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}
      {debtError && (
        <div className="mb-4 bg-warning-light text-warning text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {debtError}
        </div>
      )}

      {showForm && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {returnSale ? 'Create Customer to Complete Sale' : 'Add New Customer'}
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Kwame Mensah"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="024XXXXXXX"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email (optional)</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {creating ? 'Creating...' : 'Create Customer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (returnSale) {
                    router.push(`/business/${businessId}/sales`)
                  } else {
                    setShowForm(false)
                    setFormName('')
                    setFormPhone('')
                    setFormEmail('')
                  }
                }}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                {returnSale ? 'Back to Sales' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
            activeTab === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All Customers ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('debt')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
            activeTab === 'debt'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          With Debt ({debtCustomers.length})
        </button>
      </div>

      {activeTab === 'debt' && debtCustomers.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-danger-light rounded-xl flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-danger shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-danger font-medium">
            Total outstanding debt: GH₵{totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
          />
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Phone</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Email</th>
                  {activeTab === 'debt' && <th className="text-right px-5 py-3 font-medium">Debt</th>}
                  {!isStaff && <th className="text-right px-5 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => {
                  const debt = debtMap.get(customer.customer_id) ?? 0
                  return (
                    <tr key={customer.customer_id} className="border-t border-gray-50 table-row-hover">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        {customer.address && (
                          <div className="text-xs text-neutral-light mt-0.5">{customer.address}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{customer.phone || '-'}</td>
                      <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{customer.email || '-'}</td>
                      {activeTab === 'debt' && (
                        <td className="px-5 py-3.5 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            debt >= 100 ? 'bg-danger-light text-danger'
                              : 'bg-warning-light text-warning'
                          }`}>
                            GH₵{debt.toFixed(2)}
                          </span>
                        </td>
                      )}
                      {!isStaff && (
                        <td className="px-5 py-3.5 text-right">
                          {deleteConfirm === customer.customer_id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleDelete(customer.customer_id)}
                                className="px-2 py-1 text-xs font-medium text-white bg-danger rounded-lg"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(customer.customer_id)}
                              className="text-xs text-danger hover:underline font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {search
                ? 'No customers match your search'
                : activeTab === 'debt'
                  ? debtError
                    ? 'Unable to load debt data'
                    : 'No customers with outstanding debt'
                  : 'No customers yet'}
            </p>
            <p className="text-xs text-neutral-light mb-3">
              {search
                ? 'Try a different search term'
                : activeTab === 'debt'
                  ? debtError
                    ? 'Check your connection and try again'
                    : 'All customers are up to date'
                  : 'Add your first customer to get started'}
            </p>
            {!search && activeTab === 'all' && !isStaff && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dark transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Customer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="px-5 py-12 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <CustomersContent />
    </Suspense>
  )
}
