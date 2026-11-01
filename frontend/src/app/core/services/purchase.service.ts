import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type {
  PurchaseOrderCreate,
  PurchaseOrderResponse,
  PurchaseReceiveRequest,
} from '../models/purchase.model';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private api: ApiService) {}

  createPurchaseOrder(payload: PurchaseOrderCreate, headers?: Record<string, string>) {
    return this.api.post<PurchaseOrderResponse>('/purchases', payload, headers);
  }

  listPurchaseOrders(params?: {
    status?: string;
    supplier_id?: number;
    skip?: number;
    limit?: number;
  }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.supplier_id !== undefined) qs.set('supplier_id', String(params.supplier_id));
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));

    const path = `/purchases${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<PurchaseOrderResponse[]>(path, headers);
  }

  getPurchaseOrder(id: number, headers?: Record<string, string>) {
    return this.api.get<PurchaseOrderResponse>(`/purchases/${id}`, headers);
  }

  sendPurchaseOrder(id: number, headers?: Record<string, string>) {
    return this.api.post<PurchaseOrderResponse>(`/purchases/${id}/send`, null, headers);
  }

  receivePurchaseOrder(id: number, payload?: PurchaseReceiveRequest, headers?: Record<string, string>) {
    return this.api.post<PurchaseOrderResponse>(`/purchases/${id}/receive`, payload || {}, headers);
  }
}
