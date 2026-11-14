export interface Product {
  product_id: number
  name: string
  price: number
  cost_price: number
  quantity: number
  unit: string
  low_stock_threshold?: number
  category?: string
  description?: string
  sku?: string
  barcode?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  deleted?: boolean
}

export interface DebtRecord {
  debt_id: number
  sale_id?: number
  amount: number
  due_date?: string
  is_paid: boolean
  created_at?: string
  note?: string
}

export interface Debtor {
  customer_id: number
  customer_name: string
  customer_email?: string
  customer_phone?: string
  total_debt: number
  debts: DebtRecord[]
}

export interface DebtSummary {
  total_outstanding: number
  total_customers: number
  total_overdue: number
  overdue_amount: number
}

export interface DebtPayment {
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
