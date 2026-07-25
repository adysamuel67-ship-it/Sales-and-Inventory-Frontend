export interface User {
  id: number
  name: string
  email: string
  phone: string
  role: string
  business_role?: string
  business_id?: number
  is_verified?: boolean
  is_active?: boolean
  created_at?: string
}

export interface Business {
  business_id: number
  name: string
  is_active?: boolean
  members?: number
  role?: string
}

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
  is_active?: boolean
  created_at?: string
}

export interface SaleItem {
  product_id: number
  product_name?: string
  name?: string
  quantity: number
  unit_price?: number
  total_price?: number
}

export interface SaleRecord {
  id: number
  product: string
  qty: number
  amount: number
  payment: string
  time: string
  created_at?: string
  amount_paid?: number
  payment_status?: string
  customer_id?: number
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  user_id?: number
  sold_by_name?: string
  note?: string
  sales_items?: SaleItem[]
}

export interface Customer {
  customer_id: number
  name: string
  phone?: string
  email?: string
  address?: string
  is_active?: boolean
  created_at?: string
}

export interface DebtRecord {
  debt_id: number
  sale_id?: number
  amount: number
  due_date?: string
  is_paid?: boolean
  created_at?: string
}

export interface CustomerWithDebt {
  customer_id: number
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  total_debt: number
  debts?: DebtRecord[]
}

export interface Transaction {
  transaction_id: number
  debt_id?: number
  performer_id?: number
  business_id?: number
  customer_id?: number
  amount_paid: number
  note?: string
  created_at?: string
}

export interface DashboardSummary {
  total_revenue: number
  total_profit: number
  total_sales: number
  total_products: number
}

export interface Approval {
  approval_id: number
  business_id: number
  requester_id: number
  role: string
  approval_type?: string
  status: string
  reason?: string
  created_at?: string
  requester?: {
    name?: string
    email?: string
    phone?: string
  }
}

export interface ChartDataPoint {
  day: string
  revenue: number
  profit: number
}
