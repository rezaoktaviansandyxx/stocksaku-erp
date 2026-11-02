import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'register',
    renderMode: RenderMode.Prerender,
  },
  {
    // Rute yang membutuhkan otentikasi / session client dirender di client-side (Client)
    path: '**',
    renderMode: RenderMode.Client,
  },
];
