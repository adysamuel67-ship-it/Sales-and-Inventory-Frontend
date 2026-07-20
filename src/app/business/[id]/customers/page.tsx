'use client'

import { useEffect, useState, useCallback, Suspense, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { customerAPI, saleAPI, debtAPI } from '@/lib/api'
import { extractArray, parseApiError, isAdminRole, isStaffRole, MappedSale } from '@/lib/utils'
import SaleDetailModal from '@/components/SaleDetailModal'

interface Customer {
  customer_id: number
  name: string
  phone?: string
  email?: string
  address?: string
  is_active?: boolean
  created_at?: string
  [key: string]: any
}

interface DebtCustomer {
  customer_id: number
  customer_debt: number
}

interface CustomerDebtDetail {
  debt_id: number
  amount: number
  due_date: string
  is_paid: boolean
  created_at?: string
}

interface SaleRecord {
  sale_id: number
  total_amount: number
  amount_paid: number
  payment_method: string
  created_at: string
  customer_id?: number
}

interface CustomerTransaction {
  transaction_id: number
  debt_id: number
  performer_id: number
  business_id: number
  customer_id?: number
  amount_paid: number
  note?: string
  created_at: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
}

type Tab = 'all' | 'debt'

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
  const [formAddress, setFormAddress] = useState('')
  const [creating, setCreating] = useState(false)

  const [showEditForm, setShowEditForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [updating, setUpdating] = useState(false)

  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const [showProfile, setShowProfile] = useState(false)
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null)
  const [profileDebt, setProfileDebt] = useState<CustomerDebtDetail[]>([])
  const [profileSales, setProfileSales] = useState<SaleRecord[]>([])
  const [profileTransactions, setProfileTransactions] = useState<CustomerTransaction[]>([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [detailSale, setDetailSale] = useState<MappedSale | null>(null)

  const isStaff = isStaffRole(user?.role)
  const isAdmin = isAdminRole(user?.role)

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
        const custData = extractArray(custRes.value.data)
        setCustomers(custData)
      } else {
        const detail = custRes.reason?.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'Failed to load customers')
      }
      if (debtRes.status === 'fulfilled') {
        const raw = debtRes.value.data
        const arr = extractArray(raw)
        const aggregated = new Map<number, number>()
        for (const d of arr) {
          const debt = d.debt || d
          const cid = Number(debt.customer_id ?? d.customer_id ?? d.user_id ?? d.id)
          if (!cid) continue
          const amt = Number(debt.amount ?? debt.customer_debt ?? debt.debt ?? debt.total_debt ?? debt.debt_amount ?? d.customer_debt ?? d.amount ?? 0)
          aggregated.set(cid, (aggregated.get(cid) ?? 0) + amt)
        }
        const mapped = Array.from(aggregated.entries()).map(([customer_id, customer_debt]) => ({
          customer_id,
          customer_debt,
        }))
        setDebtData(mapped)
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

  const { debtMap, debtCustomers, totalDebt } = useMemo(() => {
    const map = new Map(debtData.filter((d) => d.customer_debt > 0).map((d) => [d.customer_id, d.customer_debt]))
    const ids = new Set(map.keys())
    const dCustomers = customers.filter((c) => ids.has(Number(c.customer_id)))
    const total = debtData.filter((d) => d.customer_debt > 0).reduce((sum, d) => sum + d.customer_debt, 0)
    return { debtMap: map, debtCustomers: dCustomers, totalDebt: total }
  }, [debtData, customers])

  const displayedCustomers = activeTab === 'debt' ? debtCustomers : customers

  const filtered = useMemo(
    () => displayedCustomers.filter((c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    ),
    [displayedCustomers, search]
  )

  if (isNaN(businessId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid business</h2>
        <p className="text-sm text-gray-500">This business doesn&apos;t exist or the URL is invalid.</p>
      </div>
    )
  }

  const resetCreateForm = () => {
    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormAddress('')
    setShowForm(false)
  }

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
        address: formAddress.trim() || undefined,
      })
      resetCreateForm()
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

  const openEditForm = (customer: Customer) => {
    setEditCustomer(customer)
    setEditName(customer.name || '')
    setEditPhone(customer.phone || '')
    setEditEmail(customer.email || '')
    setEditAddress(customer.address || '')
    setShowEditForm(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !editCustomer || !editName.trim()) return
    setUpdating(true)
    setError('')
    setSuccess('')
    try {
      await customerAPI.update(businessId, editCustomer.customer_id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
      })
      setShowEditForm(false)
      setEditCustomer(null)
      setSuccess('Customer updated successfully!')
      loadCustomers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to update customer')
      }
    } finally {
      setUpdating(false)
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

  const handleDeactivate = async (customer: Customer) => {
    if (!businessId) return
    try {
      await customerAPI.deactivate(businessId, customer.customer_id)
      setSuccess(`Customer ${customer.is_active === false ? 'activated' : 'deactivated'} successfully!`)
      loadCustomers()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to update customer status')
    }
  }

  const openProfile = async (customer: Customer) => {
    setProfileCustomer(customer)
    setShowProfile(true)
    setProfileLoading(true)
    setProfileDebt([])
    setProfileSales([])
    setProfileTransactions([])

    try {
      const [debtRes, salesRes, txnRes] = await Promise.allSettled([
        debtAPI.getCustomerDebt(businessId, customer.customer_id),
        saleAPI.list(businessId),
        debtAPI.getCustomerTransactions(businessId, customer.customer_id),
      ])

      if (debtRes.status === 'fulfilled') {
        const raw = debtRes.value.data
        const debt = raw.debt || raw
        const debtArr = extractArray(raw)
        if (debtArr.length > 0) {
          setProfileDebt(debtArr.map((d: any) => {
            const debtObj = d.debt || d
            return {
              debt_id: debtObj.debt_id ?? d.debt_id ?? d.id,
              amount: Number(debtObj.amount ?? d.amount ?? 0),
              due_date: debtObj.due_date || d.due_date || '',
              is_paid: debtObj.is_paid ?? d.is_paid ?? false,
              created_at: debtObj.created_at || d.created_at || '',
            }
          }))
        } else if (debt && debt.debt_id) {
          setProfileDebt([{
            debt_id: debt.debt_id,
            amount: Number(debt.amount ?? 0),
            due_date: debt.due_date || '',
            is_paid: debt.is_paid ?? false,
            created_at: debt.created_at || '',
          }])
        }
      }

      if (salesRes.status === 'fulfilled') {
        const sales = extractArray(salesRes.value.data)
        const customerSales = sales.filter((s: any) => {
          const saleCid = s.customer_id ?? s.customer?.customer_id ?? s.debt?.customer_id
          return saleCid != null && Number(saleCid) === Number(customer.customer_id)
        })
        setProfileSales(customerSales.map((s: any) => ({
          sale_id: s.sale_id ?? s.id,
          total_amount: Number(s.total_amount ?? 0),
          amount_paid: Number(s.amount_paid ?? 0),
          payment_method: s.payment_method || 'N/A',
          created_at: s.created_at || '',
          customer_id: s.customer_id,
        })))
      }

      if (txnRes.status === 'fulfilled') {
        const raw = txnRes.value.data
        const arr = extractArray(raw)
        setProfileTransactions(arr.map((item: any) => {
          const txn = item.transactions || item
          return {
            transaction_id: txn.transaction_id ?? txn.id ?? item.transaction_id ?? item.id,
            debt_id: txn.debt_id ?? item.debt_id,
            performer_id: txn.performer_id ?? item.performer_id,
            business_id: txn.business_id ?? item.business_id,
            customer_id: txn.customer_id ?? item.customer_id,
            amount_paid: Number(txn.amount_paid ?? item.amount_paid ?? 0),
            note: txn.note || item.note || '',
            created_at: txn.created_at || item.created_at || '',
            customer_name: item.customer_name || txn.customer_name,
            customer_phone: item.customer_phone || txn.customer_phone,
            customer_email: item.customer_email || txn.customer_email,
            customer_address: item.customer_address || txn.customer_address,
          }
        }))
      }
    } catch {
    } finally {
      setProfileLoading(false)
    }
  }

  const profileTotalDebt = profileDebt.filter((d) => !d.is_paid).reduce((sum, d) => sum + d.amount, 0)
  const profileTotalSpent = profileSales.reduce((sum, s) => sum + s.total_amount, 0)

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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address (optional)</label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Accra"
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
                    resetCreateForm()
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

      {showEditForm && editCustomer && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Edit Customer</h3>
          <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={updating}
                className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false)
                  setEditCustomer(null)
                }}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Cancel
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
                  const debt = debtMap.get(Number(customer.customer_id)) ?? 0
                  return (
                    <tr key={customer.customer_id} className="border-t border-gray-50 table-row-hover">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                            customer.is_active === false
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {customer.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            {customer.address && (
                              <div className="text-xs text-neutral-light mt-0.5">{customer.address}</div>
                            )}
                          </div>
                        </div>
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
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => openProfile(customer)}
                                className="px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                title="View Profile"
                              >
                                Profile
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => openEditForm(customer)}
                                    className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    title="Edit"
                                  >
                                    Edit
                                  </button>
                                  {customer.is_active !== false && (
                                    <button
                                      onClick={() => setDeleteConfirm(customer.customer_id)}
                                      className="text-xs text-danger hover:underline font-medium"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
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

      {showProfile && profileCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowProfile(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Customer Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
                  profileCustomer.is_active === false
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {profileCustomer.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{profileCustomer.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      profileCustomer.is_active === false
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-success-light text-success'
                    }`}>
                      {profileCustomer.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                    {profileCustomer.created_at && (
                      <span className="text-xs text-neutral-light">
                        Since {new Date(profileCustomer.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {profileCustomer.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-600">{profileCustomer.phone}</span>
                  </div>
                )}
                {profileCustomer.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-600">{profileCustomer.email}</span>
                  </div>
                )}
                {profileCustomer.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-600">{profileCustomer.address}</span>
                  </div>
                )}
                {!profileCustomer.phone && !profileCustomer.email && !profileCustomer.address && (
                  <p className="text-sm text-neutral-light">No contact details provided</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-surfaceAlt rounded-xl p-4">
                  <p className="text-xs text-neutral-light mb-1">Total Spent</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profileLoading ? '...' : `GH₵${profileTotalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <div className="bg-surfaceAlt rounded-xl p-4">
                  <p className="text-xs text-neutral-light mb-1">Outstanding Debt</p>
                  <p className={`text-lg font-semibold ${profileTotalDebt > 0 ? 'text-danger' : 'text-success'}`}>
                    {profileLoading ? '...' : `GH₵${profileTotalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <div className="bg-surfaceAlt rounded-xl p-4">
                  <p className="text-xs text-neutral-light mb-1">Transactions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profileLoading ? '...' : profileTransactions.length}
                  </p>
                </div>
              </div>

              {profileLoading ? (
                <div className="py-6 text-center">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <>
                  {(() => {
                    const saleToMappedSale = (sale: SaleRecord): MappedSale => ({
                      id: sale.sale_id,
                      product: `Sale #${sale.sale_id}`,
                      qty: 0,
                      amount: sale.total_amount,
                      payment: sale.payment_method,
                      time: new Date(sale.created_at).toLocaleString(),
                      created_at: sale.created_at,
                      amount_paid: sale.amount_paid,
                      sales_items: [],
                    })

                    const borrowedItems = [
                      ...profileSales
                        .filter((sale) => sale.amount_paid < sale.total_amount)
                        .map((sale) => ({
                          key: `sale-${sale.sale_id}`,
                          date: new Date(sale.created_at),
                          amount: sale.total_amount,
                          paid: sale.amount_paid,
                          method: sale.payment_method,
                          dueDate: null as string | null,
                          source: 'sale' as const,
                        })),
                      ...profileDebt
                        .filter((debt) => !debt.is_paid)
                        .map((debt) => ({
                          key: `debt-${debt.debt_id}`,
                          date: new Date(debt.due_date || debt.created_at || ''),
                          amount: debt.amount,
                          paid: 0,
                          method: '',
                          dueDate: debt.due_date,
                          source: 'debt' as const,
                        })),
                    ].sort((a, b) => b.date.getTime() - a.date.getTime());

                    const hasBorrowed = borrowedItems.length > 0;
                    const hasPayments = profileTransactions.length > 0;

                    return (
                      <>
                        {hasBorrowed && (
                          <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                              <h5 className="text-sm font-semibold text-gray-900">Borrowed</h5>
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning text-white text-xs font-bold">
                                {borrowedItems.length}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {borrowedItems.map((item) => (
                                <div
                                  key={item.key}
                                  className={`flex items-center justify-between py-2 px-3 bg-surfaceAlt rounded-lg text-sm${item.source === 'sale' ? ' cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
                                  onClick={item.source === 'sale' ? () => {
                                    const sale = profileSales.find(s => s.sale_id === Number(item.key.replace('sale-', '')))
                                    if (sale) setDetailSale(saleToMappedSale(sale))
                                  } : undefined}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900">GH₵{item.amount.toFixed(2)}</span>
                                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">
                                        Borrowed
                                      </span>
                                    </div>
                                    <p className="text-xs text-neutral-light mt-0.5">
                                      {item.date.toLocaleDateString()}
                                      {item.dueDate && ` · Due ${new Date(item.dueDate).toLocaleDateString()}`}
                                      {item.method && ` · ${item.method}`}
                                    </p>
                                    {item.source === 'sale' && (
                                      <p className="text-xs text-neutral-light mt-0.5">
                                        Paid GH₵{item.paid.toFixed(2)} of GH₵{item.amount.toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {hasPayments && (
                          <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                              <h5 className="text-sm font-semibold text-gray-900">Payments</h5>
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success text-white text-xs font-bold">
                                {profileTransactions.length}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {profileTransactions.map((txn) => (
                                <div key={txn.transaction_id} className="flex items-center justify-between py-2.5 px-3 bg-surfaceAlt rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-success">GH₵{txn.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">
                                        Payment
                                      </span>
                                    </div>
                                    {txn.note && (
                                      <p className="text-xs text-neutral-light mt-0.5">{txn.note}</p>
                                    )}
                                    <p className="text-xs text-neutral-light mt-0.5">
                                      {new Date(txn.created_at).toLocaleDateString()} at {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!hasBorrowed && !hasPayments && (
                          <p className="text-sm text-neutral-light text-center py-4">No transaction history</p>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center gap-3">
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setShowProfile(false)
                      openEditForm(profileCustomer)
                    }}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors min-h-[44px]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false)
                      handleDeactivate(profileCustomer)
                    }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      profileCustomer.is_active === false
                        ? 'bg-success-light text-success hover:bg-success/10'
                        : 'bg-warning-light text-warning hover:bg-warning/10'
                    }`}
                  >
                    {profileCustomer.is_active === false ? 'Activate' : 'Deactivate'}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowProfile(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}
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
