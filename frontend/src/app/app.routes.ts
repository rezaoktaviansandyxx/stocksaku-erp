import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        title: 'Masuk | StokSaku ERP',
        loadComponent: () => import('./features/auth/login').then((m) => m.Login),
    },
    {
        path: 'register',
        title: 'Daftar | StokSaku ERP',
        loadComponent: () => import('./features/auth/register').then((m) => m.Register),
    },
    {
        path: 'orgs',
        title: 'Organisasi | StokSaku ERP',
        loadComponent: () =>
            import('./features/organizations/org-list').then((m) => m.OrgList),
        canActivate: [AuthGuard],
    },
    {
        path: 'orgs/create',
        title: 'Buat Organisasi | StokSaku ERP',
        loadComponent: () =>
            import('./features/organizations/org-create').then((m) => m.OrgCreate),
        canActivate: [AuthGuard],
    },
    {
        path: 'dashboard',
        title: 'Beranda | StokSaku ERP',
        loadComponent: () =>
            import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        canActivate: [AuthGuard],
    },
    {
        path: 'products',
        title: 'Produk | StokSaku ERP',
        loadComponent: () => import('./features/products/products').then((m) => m.Products),
        canActivate: [AuthGuard],
    },
    {
        path: 'inventory',
        title: 'Inventaris | StokSaku ERP',
        loadComponent: () =>
            import('./features/inventory/inventory').then((m) => m.Inventory),
        canActivate: [AuthGuard],
    },
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full',
    },
    {
        path: '**',
        redirectTo: '/login',
    },
];
