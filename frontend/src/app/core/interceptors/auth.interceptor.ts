import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const org = auth.getActiveOrg();

  let setHeaders: Record<string, string> = {};

  if (token && !req.headers.has('Authorization')) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (org && !req.headers.has('X-Organization-Slug')) {
    setHeaders['X-Organization-Slug'] = org;
  }

  if (Object.keys(setHeaders).length > 0) {
    req = req.clone({
      setHeaders,
    });
  }

  return next(req);
};
