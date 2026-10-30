import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { Layout } from './core/layout/layout';

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
        path: '',
        canActivate: [AuthGuard],
        component: Layout,
        children: [
            {
                path: 'orgs',
                title: 'Organisasi | StokSaku ERP',
                loadComponent: () =>
                    import('./features/organizations/org-list').then((m) => m.OrgList),
            },
            {
                path: 'orgs/create',
                title: 'Buat Organisasi | StokSaku ERP',
                loadComponent: () =>
                    import('./features/organizations/org-create').then((m) => m.OrgCreate),
            },
            {
                path: 'dashboard',
                title: 'Beranda | StokSaku ERP',
                loadComponent: () =>
                    import('./features/dashboard/dashboard').then((m) => m.Dashboard),
            },
            {
                path: 'products',
                title: 'Produk | StokSaku ERP',
                loadComponent: () => import('./features/products/products').then((m) => m.Products),
            },
            {
                path: 'inventory',
                title: 'Inventaris | StokSaku ERP',
                loadComponent: () =>
                    import('./features/inventory/inventory').then((m) => m.Inventory),
            },
        ],
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
