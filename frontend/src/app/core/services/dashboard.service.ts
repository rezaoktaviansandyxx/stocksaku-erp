import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { DashboardSummaryResponse } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getSummary(headers?: Record<string, string>) {
    return this.api.get<DashboardSummaryResponse>('/dashboard/summary', headers);
  }
}
