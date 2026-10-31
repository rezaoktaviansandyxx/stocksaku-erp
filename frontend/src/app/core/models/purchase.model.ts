export interface PurchaseOrderItemCreate {
  product_id: number;
  quantity: number;
  unit_cost: number;
}

export interface PurchaseOrderItemResponse {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface PurchaseOrderCreate {
  supplier_id: number;
  warehouse_id?: number | null;
  order_number?: string;
  notes?: string;
  items: PurchaseOrderItemCreate[];
}

export interface PurchaseOrderResponse {
  id: number;
  organization_id: number;
  supplier_id: number;
  supplier_name?: string;
  warehouse_id?: number | null;
  warehouse_name?: string;
  created_by?: number | null;
  order_number: string;
  status: 'Draft' | 'Ordered' | 'Received' | string;
  total_amount: number;
  notes?: string;
  created_at: string;
  received_at?: string | null;
  items: PurchaseOrderItemResponse[];
}

export interface PurchaseReceiveRequest {
  warehouse_id?: number | null;
  notes?: string;
}
