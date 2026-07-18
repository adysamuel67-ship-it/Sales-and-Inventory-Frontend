'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/lib/auth'
import { adminAPI, productAPI } from '@/lib/api'
import { extractArray, isStaffRole } from '@/lib/utils'

interface LowStockItem {
  name: string
  stock: number
  threshold: number
  unit: string
  business_name?: string
}

export default function AdminLowStockPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.role !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [profileLoaded, isAuthenticated, user, router])

  useEffect(() => {
    const loadLowStock = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await adminAPI.listAllUsers()
        const users = extractArray(res.data)
        const allItems: LowStockItem[] = []

        for (const u of users.slice(0, 20)) {
          try {
            if (u.business_id) {
              const prodRes = await productAPI.list(u.business_id)
              const prods = extractArray(prodRes.data)
              for (const p of prods) {
                const qty = p.quantity ?? p.stock ?? 0
                const threshold = p.threshold ?? p.reorder_level ?? 10
                if (qty <= threshold) {
                  allItems.push({
                    name: p.name || 'Unknown',
                    stock: qty,
                    threshold,
                    unit: p.unit || 'units',
                    business_name: u.business_name || `Business #${u.business_id}`,
                  })
                }
              }
            }
          } catch {
            // Skip failed business
          }
        }
        setItems(allItems)
      } catch (err: any) {
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'Failed to load low stock data')
      } finally {
        setLoading(false)
      }
    }
    if (isAuthenticated && user?.role === 'super_admin') loadLowStock()
  }, [isAuthenticated, user])

  if (isLoading || !isAuthenticated || !profileLoaded || user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Low Stock</h1>
        <p className="text-sm text-neutral-light mt-1">Products running low across all businesses</p>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>
      )}

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Product</th>
                  <th className="text-left px-5 py-3 font-medium">Business</th>
                  <th className="text-center px-5 py-3 font-medium">Stock</th>
                  <th className="text-center px-5 py-3 font-medium">Min</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-50 table-row-hover">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{item.name}</td>
                    <td className="px-5 py-3.5 text-neutral-light">{item.business_name}</td>
                    <td className="px-5 py-3.5 text-center font-medium text-danger">{item.stock}</td>
                    <td className="px-5 py-3.5 text-center text-neutral-light">{item.threshold}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.stock <= item.threshold * 0.3 ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'
                      }`}>
                        {item.stock <= item.threshold * 0.3 ? 'Critical' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-neutral-light text-sm">
            All products across the platform are well stocked
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
