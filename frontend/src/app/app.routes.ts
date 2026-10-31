import { Routes } from '@angular/router';
import { AuthGuard, OrgGuard } from './core/guards/auth.guard';
import { Layout } from './core/layout/layout';
import { OrgLayout } from './core/layout/org-layout';

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
        canActivate: [AuthGuard],
        component: OrgLayout,
        children: [
            {
                path: '',
                title: 'Pilih Organisasi | StokSaku ERP',
                loadComponent: () =>
                    import('./features/organizations/org-list').then((m) => m.OrgList),
            },
            {
                path: 'create',
                title: 'Buat Organisasi | StokSaku ERP',
                loadComponent: () =>
                    import('./features/organizations/org-create').then((m) => m.OrgCreate),
            },
        ],
    },
    {
        path: '',
        canActivate: [OrgGuard],
        component: Layout,
        children: [
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
                path: 'products/categories-units',
                title: 'Kategori & Satuan | StokSaku ERP',
                loadComponent: () =>
                    import('./features/products/categories-units').then((m) => m.CategoriesUnits),
            },
            {
                path: 'inventory',
                title: 'Inventaris | StokSaku ERP',
                loadComponent: () =>
                    import('./features/inventory/inventory').then((m) => m.Inventory),
            },
            {
                path: 'warehouses',
                title: 'Gudang | StokSaku ERP',
                loadComponent: () =>
                    import('./features/warehouses/warehouses').then((m) => m.Warehouses),
            },
            {
                path: 'partners',
                title: 'Kontak & Mitra | StokSaku ERP',
                loadComponent: () =>
                    import('./features/partners/partners').then((m) => m.Partners),
            },
            {
                path: 'purchases',
                title: 'Pembelian (PO) | StokSaku ERP',
                loadComponent: () =>
                    import('./features/purchases/purchases').then((m) => m.Purchases),
            },
        ],
    },
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full',
    },
    {
        path: '**',
        redirectTo: '/dashboard',
    },
];
