'use client'

import { useState, useMemo, memo } from 'react'
import Link from 'next/link'
import SaleDetailModal from './SaleDetailModal'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from './ui/Table'
import { MappedSale, formatPayment } from '@/lib/utils'

type SaleRecord = MappedSale

interface Props {
  sales: SaleRecord[]
  businessId?: number
}

const paymentBadgeColor: Record<string, 'emerald' | 'indigo' | 'amber' | 'slate'> = {
  cash: 'emerald',
  mobile_money: 'indigo',
  card: 'amber',
}

function isBorrow(sale: MappedSale): boolean {
  if (sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0) return true
  if (sale.payment_status === 'partial' || sale.payment_status === 'borrowed' || sale.payment_status === 'unpaid') return true
  return false
}

export default memo(function RecentSales({ sales, businessId }: Props) {
  const salesLink = businessId ? `/business/${businessId}/sales` : '/sales'
  const [detailSale, setDetailSale] = useState<MappedSale | null>(null)
  const [view, setView] = useState<'all' | 'sales' | 'borrows'>('all')

  const { paidSales, borrowSales } = useMemo(() => {
    const paid: MappedSale[] = []
    const borrowed: MappedSale[] = []
    for (const s of sales) {
      if (isBorrow(s)) borrowed.push(s)
      else paid.push(s)
    }
    return { paidSales: paid, borrowSales: borrowed }
  }, [sales])

  const displaySales = view === 'borrows' ? borrowSales : view === 'sales' ? paidSales : sales

  const tabs = [
    { key: 'all' as const, label: 'All', count: sales.length },
    { key: 'sales' as const, label: 'Sales', count: paidSales.length },
    { key: 'borrows' as const, label: 'Borrows', count: borrowSales.length },
  ]

  return (
    <>
      <section className="surface-card overflow-hidden">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-section-title text-slate-900">Recent Activity</h2>
              <p className="mt-0.5 text-xs text-neutral-light">Your latest recorded transactions</p>
            </div>
            <Link
              href={salesLink}
              className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:text-primary-dark"
            >
              View All
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M18 12H6" />
              </svg>
            </Link>
          </div>

          {/* Segmented control: the active tab sits on a white pill with a
              shadow, so selection reads without relying on colour alone. */}
          <div
            className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5"
            role="tablist"
            aria-label="Filter transactions"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={view === tab.key}
                onClick={() => setView(tab.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  view === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-[10px] ${view === tab.key ? 'text-neutral-light' : 'text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </header>

      {displaySales.length > 0 ? (
          <Table>
            <TableHead>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell align="center">Qty</TableHeaderCell>
              <TableHeaderCell align="right">Amount</TableHeaderCell>
              <TableHeaderCell align="center">Status</TableHeaderCell>
              <TableHeaderCell align="right">Time</TableHeaderCell>
            </TableHead>
            <TableBody>
              {displaySales.map((sale) => {
                const borrow = isBorrow(sale)
                return (
                  <TableRow key={sale.id} onClick={() => setDetailSale(sale)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {borrow && <span className="status-dot bg-warning" aria-label="On credit" />}
                        <span className="truncate font-medium text-slate-900">{sale.product}</span>
                      </div>
                    </TableCell>
                    <TableCell align="center" className="text-neutral-light">
                      {sale.qty}
                    </TableCell>
                    <TableCell align="right" className="font-semibold text-slate-900">
                      {sale.amount > 0 ? (
                        `GH₵${sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-xs font-normal text-neutral-light">No charge</span>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Badge color={paymentBadgeColor[sale.payment] ?? 'slate'}>
                          {formatPayment(sale.payment)}
                        </Badge>
                        {borrow && <Badge color="amber">Borrow</Badge>}
                      </div>
                    </TableCell>
                    <TableCell align="right" className="whitespace-nowrap text-xs text-neutral-light">
                      {sale.time}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            compact
            title={`No ${view === 'borrows' ? 'borrows' : view === 'sales' ? 'sales' : 'activity'} yet`}
            description={
              view === 'borrows'
                ? 'Items sold on credit will appear here once recorded.'
                : view === 'sales'
                  ? 'Record your first sale to see it here.'
                  : 'Record a sale to get started.'
            }
            action={
              <Link
                href={salesLink}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all duration-150 hover:bg-primary-dark"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Sale
              </Link>
            }
          />
        )}
      </section>
    {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}
    </>
  )
})
