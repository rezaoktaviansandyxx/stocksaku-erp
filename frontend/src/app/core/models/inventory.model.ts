// src/app/core/models/inventory.model.ts
export interface ProductResponse {
  id: number;
  organization_id: number;
  sku: string;
  name: string;
  category_id: number | null;
  unit_id: number;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
}

export interface CategoryResponse {
  id: number;
  organization_id: number;
  name: string;
  created_at: string;
}

export interface UnitResponse {
  id: number;
  organization_id: number;
  name: string;
  symbol: string;
  created_at: string;
}

export interface WarehouseResponse {
  id: number;
  organization_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface StockBalanceResponse {
  id: number;
  warehouse_id: number;
  product_id: number;
  quantity: number;
  updated_at: string;
}

export interface StockMovementResponse {
  id: number;
  warehouse_id: number;
  product_id: number;
  created_by: number | null;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface InventoryAlertResponse {
  zero_stock: Array<{
    product_id: number;
    sku: string;
    name: string;
    quantity: number;
  }>;
  below_minimum: Array<{
    product_id: number;
    sku: string;
    name: string;
    quantity: number;
    min_stock: number;
  }>;
}

export interface StockInitialRequest {
  warehouse_id: number;
  product_id: number;
  quantity: number;
  notes?: string | null;
}

export interface StockMovementRequest {
  warehouse_id: number;
  product_id: number;
  quantity: number;
  notes?: string | null;
}

export interface StockAdjustmentRequest {
  warehouse_id: number;
  product_id: int;
  quantity: number;
  reason: string;
  notes?: string | null;
}

// Type alias for the type issue
type int = number;

export interface ProductCreate {
  sku: string;
  name: string;
  cost_price: number;
  selling_price: number;
  min_stock?: number;
  is_active?: boolean;
  category_id?: number | null;
  unit_id: number;
}

export interface ProductUpdate {
  sku?: string;
  name?: string;
  cost_price?: number;
  selling_price?: number;
  min_stock?: number;
  is_active?: boolean;
  category_id?: number | null;
  unit_id?: number;
}
