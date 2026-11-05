import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ConfirmDialog } from '@shared/components';
import { AppIconComponent, IconName } from '@shared/components';
import { ToastContainerComponent } from '@shared/components';
import { APP_VERSION } from '../../version';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  title: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    ConfirmDialog,
    AppIconComponent,
    ToastContainerComponent
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  navItems: NavItem[] = [
    { label: 'Beranda', path: '/dashboard', icon: 'dashboard', title: 'Beranda' },
    { label: 'Produk', path: '/products', icon: 'box', title: 'Produk' },
    { label: 'Kategori & Satuan', path: '/products/categories-units', icon: 'tag', title: 'Kategori & Satuan' },
    { label: 'Gudang', path: '/warehouses', icon: 'warehouse', title: 'Kelola Gudang' },
    { label: 'Inventaris', path: '/inventory', icon: 'boxes', title: 'Inventaris' },
    { label: 'Pembelian (PO)', path: '/purchases', icon: 'shopping-bag', title: 'Pesanan Pembelian (PO)' },
    { label: 'Penjualan (SO)', path: '/sales', icon: 'shopping-cart', title: 'Pesanan Penjualan (SO)' },
    { label: 'Mitra & Kontak', path: '/partners', icon: 'users', title: 'Kontak & Mitra Bisnis' },
  ];

  mobileMenuOpen = signal(false);
  showLogoutConfirm = signal(false);
  logoutLoading = signal(false);
  pageTitle = signal('StokSaku ERP');
  appVersion = APP_VERSION;
  currentYear = new Date().getFullYear();

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {
    // Update page title on route change
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        // Find exact match first, then fall back to longest prefix match
        const exactMatch = this.navItems.find((item) => this.router.isActive(item.path, true));
        if (exactMatch) {
          this.pageTitle.set(exactMatch.title);
        } else {
          const match = this.navItems
            .filter((item) => this.router.isActive(item.path, false))
            .sort((a, b) => b.path.length - a.path.length)[0];
          this.pageTitle.set(match?.title || 'StokSaku ERP');
        }
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
