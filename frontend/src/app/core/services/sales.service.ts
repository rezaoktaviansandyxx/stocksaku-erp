import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type {
  SalesConfirmRequest,
  SalesOrderCreate,
  SalesOrderResponse,
} from '../models/sales.model';

@Injectable({ providedIn: 'root' })
export class SalesService {
  constructor(private api: ApiService) {}

  createSalesOrder(payload: SalesOrderCreate, headers?: Record<string, string>) {
    return this.api.post<SalesOrderResponse>('/sales', payload, headers);
  }

  listSalesOrders(params?: {
    status?: string;
    customer_id?: number;
    skip?: number;
    limit?: number;
  }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.customer_id !== undefined) qs.set('customer_id', String(params.customer_id));
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));

    const path = `/sales${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<SalesOrderResponse[]>(path, headers);
  }

  getSalesOrder(id: number, headers?: Record<string, string>) {
    return this.api.get<SalesOrderResponse>(`/sales/${id}`, headers);
  }

  confirmSalesOrder(id: number, payload?: SalesConfirmRequest, headers?: Record<string, string>) {
    return this.api.post<SalesOrderResponse>(`/sales/${id}/confirm`, payload || {}, headers);
  }

  cancelSalesOrder(id: number, headers?: Record<string, string>) {
    return this.api.post<SalesOrderResponse>(`/sales/${id}/cancel`, {}, headers);
  }
}
