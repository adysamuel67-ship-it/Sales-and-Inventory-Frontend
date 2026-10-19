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
  updated_at?: string
  deleted_at?: string | null
  deleted?: boolean
}
