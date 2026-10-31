import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, headers?: Record<string, string>) {
    return this.http.get<T>(`${this.baseUrl}${path}`, { headers });
  }

  post<T>(path: string, body: unknown, headers?: Record<string, string>) {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, { headers });
  }

  patch<T>(path: string, body: unknown, headers?: Record<string, string>) {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, { headers });
  }

  delete<T>(path: string, headers?: Record<string, string>) {
    return this.http.delete<T>(`${this.baseUrl}${path}`, { headers });
  }

  getBlob(path: string, headers?: Record<string, string>) {
    return this.http.get(`${this.baseUrl}${path}`, { headers, responseType: 'blob' });
  }
}
