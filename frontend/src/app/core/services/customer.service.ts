import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type {
  CustomerCreate,
  CustomerResponse,
  CustomerUpdate,
} from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  constructor(private api: ApiService) {}

  createCustomer(payload: CustomerCreate, headers?: Record<string, string>) {
    return this.api.post<CustomerResponse>('/customers', payload, headers);
  }

  listCustomers(params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }, headers?: Record<string, string>) {
    const qs = new URLSearchParams();
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    const path = `/customers${qs.toString() ? `?${qs.toString()}` : ''}`;
    return this.api.get<CustomerResponse[]>(path, headers);
  }

  getCustomer(id: number, headers?: Record<string, string>) {
    return this.api.get<CustomerResponse>(`/customers/${id}`, headers);
  }

  updateCustomer(id: number, payload: CustomerUpdate, headers?: Record<string, string>) {
    return this.api.patch<CustomerResponse>(`/customers/${id}`, payload, headers);
  }

  deleteCustomer(id: number, headers?: Record<string, string>) {
    return this.api.delete<void>(`/customers/${id}`, headers);
  }
}
