import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  title: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ConfirmDialog],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  navItems: NavItem[] = [
    { label: 'Beranda', path: '/dashboard', icon: '🏠', title: 'Beranda' },
    { label: 'Produk', path: '/products', icon: '📦', title: 'Produk' },
    { label: 'Kategori & Satuan', path: '/products/categories-units', icon: '🏷️', title: 'Kategori & Satuan' },
    { label: 'Gudang', path: '/warehouses', icon: '🏢', title: 'Kelola Gudang' },
    { label: 'Inventaris', path: '/inventory', icon: '📋', title: 'Inventaris' },
    { label: 'Pembelian (PO)', path: '/purchases', icon: '🛒', title: 'Pesanan Pembelian (PO)' },
    { label: 'Penjualan (SO)', path: '/sales', icon: '🧾', title: 'Pesanan Penjualan (SO)' },
    { label: 'Mitra & Kontak', path: '/partners', icon: '👥', title: 'Kontak & Mitra Bisnis' },
  ];

  mobileMenuOpen = signal(false);
  showLogoutConfirm = signal(false);
  logoutLoading = signal(false);
  pageTitle = signal('StokSaku ERP');

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {
    // Update page title on route change
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const newTitle = this.navItems.find(
          (item) => this.router.isActive(item.path, false),
        )?.title;
        this.pageTitle.set(newTitle || 'StokSaku ERP');
      });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  openLogoutConfirm(): void {
    this.showLogoutConfirm.set(true);
  }

  cancelLogout(): void {
    this.showLogoutConfirm.set(false);
  }

  confirmLogout(): void {
    this.logoutLoading.set(true);
    this.auth.logout();
    this.showLogoutConfirm.set(false);
    this.logoutLoading.set(false);
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }
}
