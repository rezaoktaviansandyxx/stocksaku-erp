import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  title: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  navItems: NavItem[] = [
    { label: 'Beranda', path: '/dashboard', icon: '🏠', title: 'Beranda' },
    { label: 'Produk', path: '/products', icon: '📦', title: 'Produk' },
    { label: 'Inventaris', path: '/inventory', icon: '📋', title: 'Inventaris' },
  ];

  mobileMenuOpen = signal(false);
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

  logout(): void {
    this.auth.logout();
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }
}
