import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, defer, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean> {
    if (!this.auth.isAuthenticated()) {
      if (this.router) {
        this.router.navigate(['/login']);
      }
      return of(false);
    }
    return of(true);
  }
}
