import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

import type {
  CategoryResponse,
  InventoryAlertResponse,
  ProductCreate,
  ProductResponse,
  ProductUpdate,
  StockAdjustmentRequest,
  StockBalanceResponse,
  StockInitialRequest,
  StockMovementRequest,
  StockMovementResponse,
  UnitResponse,
  WarehouseResponse,
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private api: ApiService) {}

  // Products
  createProduct(payload: ProductCreate, headers?: Record<string, string>) {
    return this.api.post<ProductResponse>('/products', payload, headers);
  }

  listProducts(params: {
    skip?: number;
    limit?: number;
    search?: string;
    active_only?: boolean;
  }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.active_only !== undefined) qs.set('active_only', String(params.active_only));
    const path = `/products${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<ProductResponse[]>(path, headers);
  }

  getProduct(id: number, headers?: Record<string, string>) {
    return this.api.get<ProductResponse>(`/products/${id}`, headers);
  }

  updateProduct(id: number, payload: ProductUpdate, headers?: Record<string, string>) {
    return this.api.patch<ProductResponse>(`/products/${id}`, payload, headers);
  }

  deactivateProduct(id: number, headers?: Record<string, string>) {
    return this.api.post<{ message: string; product_id: number }>(
      `/inventory/deactivate-product?product_id=${id}`,
      {},
      headers,
    );
  }

  // Categories
  listCategories(params: { skip?: number; limit?: number }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const path = `/categories${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<CategoryResponse[]>(path, headers);
  }

  createCategory(payload: { name: string }, headers?: Record<string, string>) {
    return this.api.post<CategoryResponse>('/categories', payload, headers);
  }

  // Units
  listUnits(params: { skip?: number; limit?: number }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const path = `/units${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<UnitResponse[]>(path, headers);
  }

  // Warehouses
  listWarehouses(params: { skip?: number; limit?: number; active_only?: boolean }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.active_only !== undefined) qs.set('active_only', String(params.active_only));
    const path = `/warehouses${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<WarehouseResponse[]>(path, headers);
  }

  createWarehouse(payload: { name: string; is_active?: boolean }, headers?: Record<string, string>) {
    return this.api.post<WarehouseResponse>('/warehouses', payload, headers);
  }

  // Inventory operations
  setInitialStock(payload: StockInitialRequest, headers?: Record<string, string>) {
    return this.api.post<StockMovementResponse>('/inventory/initial', payload, headers);
  }

  createInbound(payload: StockMovementRequest, headers?: Record<string, string>) {
    return this.api.post<StockMovementResponse>('/inventory/inbound', payload, headers);
  }

  createOutbound(payload: StockMovementRequest, headers?: Record<string, string>) {
    return this.api.post<StockMovementResponse>('/inventory/outbound', payload, headers);
  }

  adjustStock(payload: StockAdjustmentRequest, headers?: Record<string, string>) {
    return this.api.post<StockMovementResponse>('/inventory/adjustment', payload, headers);
  }

  // Balances & movements
  listBalances(params: {
    skip?: number;
    limit?: number;
    warehouse_id?: number;
    product_id?: number;
  }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.warehouse_id !== undefined) qs.set('warehouse_id', String(params.warehouse_id));
    if (params.product_id !== undefined) qs.set('product_id', String(params.product_id));
    const path = `/inventory/balances${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<StockBalanceResponse[]>(path, headers);
  }

  listMovements(params: {
    skip?: number;
    limit?: number;
    product_id?: number;
    start_date?: string;
    end_date?: string;
  }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.product_id !== undefined) qs.set('product_id', String(params.product_id));
    if (params.start_date) qs.set('start_date', params.start_date);
    if (params.end_date) qs.set('end_date', params.end_date);
    const path = `/inventory/movements${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<StockMovementResponse[]>(path, headers);
  }

  // Alerts
  getAlerts(headers?: Record<string, string>) {
    return this.api.get<InventoryAlertResponse>('/inventory/alerts', headers);
  }
}
