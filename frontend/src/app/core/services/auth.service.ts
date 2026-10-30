import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

import type {
  LoginRequest,
  LoginResponse,
  OrganizationCreate,
  OrganizationResponse,
  RegisterRequest,
  UserResponse,
} from '../models/auth.model';

const TOKEN_KEY = 'auth_token';
const ORG_KEY = 'active_org';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private api: ApiService,
    private storage: StorageService,
  ) {}

  register(payload: RegisterRequest): Observable<UserResponse> {
    return this.api.post<UserResponse>('/auth/register', payload);
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('/auth/login', payload)
      .pipe(tap((res) => this.storage.setItem(TOKEN_KEY, res.access_token)));
  }

  logout(): Observable<unknown> {
    const token = this.getToken();
    this.storage.removeItem(TOKEN_KEY);
    this.storage.removeItem(ORG_KEY);
    if (token) {
      this.api.post('/auth/logout', {}, { Authorization: `Bearer ${token}` }).subscribe({
        error: () => {},
      });
    }
    return new Observable<unknown>();
  }

  getToken(): string | null {
    return this.storage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  setActiveOrg(slug: string): void {
    this.storage.setItem(ORG_KEY, slug);
  }

  getActiveOrg(): string | null {
    return this.storage.getItem(ORG_KEY);
  }

  isOrgSelected(): boolean {
    return !!this.getActiveOrg();
  }

  buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const org = this.getActiveOrg();
    if (org) headers['X-Organization-Slug'] = org;
    return headers;
  }

  getMyOrganizations(): Observable<OrganizationResponse[]> {
    return this.api.get<OrganizationResponse[]>('/organizations/mine', this.buildHeaders());
  }

  createOrganization(payload: OrganizationCreate): Observable<OrganizationResponse> {
    return this.api.post<OrganizationResponse>('/organizations', payload, this.buildHeaders());
  }
}
