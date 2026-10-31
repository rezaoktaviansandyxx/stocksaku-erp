import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private platformId = inject(PLATFORM_ID);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(true);
    }

    if (!this.auth.isAuthenticated()) {
      if (this.router) {
        this.router.navigate(['/login']);
      }
      return of(false);
    }
    return of(true);
  }
}

@Injectable({ providedIn: 'root' })
export class OrgGuard implements CanActivate {
  private platformId = inject(PLATFORM_ID);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(true);
    }

    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    if (!this.auth.isOrgSelected()) {
      this.router.navigate(['/orgs']);
      return of(false);
    }

    return of(true);
  }
}

