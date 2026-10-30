import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private platformId = inject(PLATFORM_ID);

  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  getItem(key: string): string | null {
    if (!this.isBrowser()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  removeItem(key: string): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}
