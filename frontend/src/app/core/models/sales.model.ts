export interface SalesOrderItemCreate {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface SalesOrderItemResponse {
  id: number;
  sales_order_id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SalesOrderCreate {
  customer_id?: number | null;
  warehouse_id?: number | null;
  order_number?: string;
  notes?: string;
  items: SalesOrderItemCreate[];
}

export interface SalesOrderResponse {
  id: number;
  organization_id: number;
  customer_id?: number | null;
  customer_name?: string;
  warehouse_id?: number | null;
  warehouse_name?: string;
  created_by?: number | null;
  order_number: string;
  status: 'Draft' | 'Confirmed' | 'Cancelled' | string;
  total_amount: number;
  notes?: string;
  created_at: string;
  confirmed_at?: string | null;
  items: SalesOrderItemResponse[];
}

export interface SalesConfirmRequest {
  warehouse_id?: number | null;
  notes?: string;
}
