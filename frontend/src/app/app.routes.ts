import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        title: 'Beranda | StokSaku ERP',
        loadComponent: () => import('./features/dashboard/dashboard').then((m)=> m.Dashboard)
    },
    {
        path: 'inventory',
        title: 'Inventaris | StokSaku ERP',
        loadComponent: () => import('./features/inventory/inventory').then((m)=> m.Inventory)
    },
    {
        path: '*',
        redirectTo: '',
    }
];
