import { Component, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import type { InventoryAlertResponse, ProductResponse } from '../../core/models/inventory.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="dashboard">
      <h1>Beranda</h1>
      @if (orgName()) {
        <p>Organisasi: {{ orgName() }}</p>
      }

      @if (!loading() && !error()) {
        <div class="cards">
          <div class="card">
            <span class="value">{{ productCount() }}</span>
            <span class="label">Total Produk</span>
          </div>
          <div class="card">
            <span class="value">{{ zeroStockCount() }}</span>
            <span class="label">Stok Habis</span>
          </div>
          <div class="card">
            <span class="value">{{ belowMinCount() }}</span>
            <span class="label">Di Bawah Minimum</span>
          </div>
        </div>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (alerts() && (zeroStockCount() > 0 || belowMinCount() > 0)) {
        <div class="alerts">
          <h2>Peringatan Stok</h2>
          @if (zeroStockCount() > 0) {
            <div class="alert-section">
              <h3>Stok Habis</h3>
              @for (p of alerts()?.zero_stock; track p.product_id) {
                <div>{{ p.sku }} — {{ p.name }}</div>
              }
            </div>
          }
          @if (belowMinCount() > 0) {
            <div class="alert-section">
              <h3>Di Bawah Minimum</h3>
              @for (p of alerts()?.below_minimum; track p.product_id) {
                <div>{{ p.sku }} — {{ p.name }} ({{ p.quantity }} / {{ p.min_stock }})</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { padding: 1.5rem; }
    .cards { display: flex; gap: 1rem; margin: 2rem 0; flex-wrap: wrap; }
    .card { flex: 1; min-width: 150px; background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .card .value { display: block; font-size: 2rem; font-weight: 700; color: #2c3e50; }
    .card .label { color: #7f8c8d; }
    .alerts { margin-top: 2rem; }
    .alert-section { margin-bottom: 1.5rem; }
    .alert-section h3 { color: #e67e22; }
    .error { color: #e74c3c; }
  `],
})
export class Dashboard {
  orgName = signal<string | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  alerts = signal<InventoryAlertResponse | null>(null);
  products = signal<ProductResponse[]>([]);

  constructor(
    private auth: AuthService,
    private inventory: InventoryService,
  ) {
    const orgSlug = this.auth.getActiveOrg();
    if (orgSlug) {
      this.auth.getMyOrganizations().subscribe({
        next: (orgs) => {
          const org = orgs.find((o) => o.slug === orgSlug);
          if (org) this.orgName.set(org.name);
        },
      });
    }

    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    const headers = this.auth.buildHeaders();

    this.inventory.listProducts({}, headers).subscribe({
      next: (prods) => {
        this.products.set(prods);
        this.fetchAlerts();
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Gagal memuat data');
        this.loading.set(false);
      },
    });
  }

  fetchAlerts(): void {
    const headers = this.auth.buildHeaders();
    this.inventory.getAlerts(headers).subscribe({
      next: (res) => {
        this.alerts.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Gagal memuat peringatan');
        this.loading.set(false);
      },
    });
  }

  productCount = () => this.products().length;
  zeroStockCount = () => this.alerts()?.zero_stock.length ?? 0;
  belowMinCount = () => this.alerts()?.below_minimum.length ?? 0;
}
