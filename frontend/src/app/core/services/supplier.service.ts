import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type {
  SupplierCreate,
  SupplierResponse,
  SupplierUpdate,
} from '../models/supplier.model';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  constructor(private api: ApiService) {}

  createSupplier(payload: SupplierCreate, headers?: Record<string, string>) {
    return this.api.post<SupplierResponse>('/suppliers', payload, headers);
  }

  listSuppliers(params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    const path = `/suppliers${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<SupplierResponse[]>(path, headers);
  }

  getSupplier(id: number, headers?: Record<string, string>) {
    return this.api.get<SupplierResponse>(`/suppliers/${id}`, headers);
  }

  updateSupplier(id: number, payload: SupplierUpdate, headers?: Record<string, string>) {
    return this.api.patch<SupplierResponse>(`/suppliers/${id}`, payload, headers);
  }

  deleteSupplier(id: number, headers?: Record<string, string>) {
    return this.api.delete<void>(`/suppliers/${id}`, headers);
  }
}
