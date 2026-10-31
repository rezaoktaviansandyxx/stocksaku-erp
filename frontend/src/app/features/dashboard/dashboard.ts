import { Component, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import type { InventoryAlertResponse, ProductResponse } from '../../core/models/inventory.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <div class="welcome-text">
          <h1>Ringkasan Dasbor</h1>
          <p class="subtitle">Pantau performa inventaris dan ketersediaan stok Anda secara langsung.</p>
        </div>
        @if (orgName()) {
          <div class="org-pill">
            <span class="pill-icon">🏢</span>
            <span>{{ orgName() }}</span>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Memuat data dasbor...</p>
        </div>
      } @else if (error()) {
        <div class="error-banner">
          <span class="error-icon">⚠️</span>
          <span>{{ error() }}</span>
        </div>
      } @else {
        <div class="cards">
          <div class="card card-primary">
            <div class="card-icon-wrapper blue">📦</div>
            <div class="card-info">
              <span class="label">Total Produk</span>
              <span class="value">{{ productCount() }}</span>
              <span class="trend neutral">Terdaftar di sistem</span>
            </div>
          </div>
          <div class="card card-danger" [class.highlight]="zeroStockCount() > 0">
            <div class="card-icon-wrapper red">🚨</div>
            <div class="card-info">
              <span class="label">Stok Habis</span>
              <span class="value" [class.danger-val]="zeroStockCount() > 0">{{ zeroStockCount() }}</span>
              <span class="trend danger">Perlu restock segera</span>
            </div>
          </div>
          <div class="card card-warning" [class.highlight]="belowMinCount() > 0">
            <div class="card-icon-wrapper orange">⚠️</div>
            <div class="card-info">
              <span class="label">Di Bawah Minimum</span>
              <span class="value" [class.warning-val]="belowMinCount() > 0">{{ belowMinCount() }}</span>
              <span class="trend warning">Mendekati batas aman</span>
            </div>
          </div>
        </div>

        @if (alerts() && (zeroStockCount() > 0 || belowMinCount() > 0)) {
          <div class="alerts-container">
            <div class="alerts-header">
              <h2>Peringatan Stok & Tindakan Diperlukan</h2>
              <span class="badge-alert">{{ zeroStockCount() + belowMinCount() }} Peringatan</span>
            </div>
            
            <div class="alerts-grid">
              @if (zeroStockCount() > 0) {
                <div class="alert-box alert-box-danger">
                  <div class="box-title">
                    <span class="indicator red"></span>
                    <h3>Stok Habis (0 Unit)</h3>
                  </div>
                  <div class="alert-list">
                    @for (p of alerts()?.zero_stock; track p.product_id) {
                      <div class="alert-item">
                        <span class="sku-tag">{{ p.sku }}</span>
                        <span class="product-name">{{ p.name }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              @if (belowMinCount() > 0) {
                <div class="alert-box alert-box-warning">
                  <div class="box-title">
                    <span class="indicator orange"></span>
                    <h3>Di Bawah Batas Minimum</h3>
                  </div>
                  <div class="alert-list">
                    @for (p of alerts()?.below_minimum; track p.product_id) {
                      <div class="alert-item">
                        <div class="alert-item-main">
                          <span class="sku-tag">{{ p.sku }}</span>
                          <span class="product-name">{{ p.name }}</span>
                        </div>
                        <span class="stock-pill">{{ p.quantity }} / min {{ p.min_stock }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .welcome-text h1 {
      font-size: 1.625rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.02em;
      margin-bottom: 0.25rem;
    }

    .welcome-text .subtitle {
      color: var(--color-text-muted);
      font-size: 0.95rem;
    }

    .org-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.9rem;
      background: #ffffff;
      border: 1px solid var(--color-border);
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text);
      box-shadow: var(--shadow-sm);
    }
    
    .cards { 
      display: grid; 
      gap: 1.25rem; 
      grid-template-columns: repeat(3, 1fr);
    }
    
    .card { 
      background: var(--color-card-bg); 
      padding: 1.25rem 1.5rem; 
      border-radius: 12px; 
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 1.25rem;
      transition: all 0.2s ease;
    }

    .card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .card-icon-wrapper {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      flex-shrink: 0;
    }

    .card-icon-wrapper.blue {
      background: #e0f2fe;
    }

    .card-icon-wrapper.red {
      background: #fee2e2;
    }

    .card-icon-wrapper.orange {
      background: #fef3c7;
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    
    .card .value { 
      font-size: 2rem; 
      font-weight: 700; 
      color: var(--color-text);
      line-height: 1.1;
    }

    .card .value.danger-val {
      color: var(--color-danger);
    }

    .card .value.warning-val {
      color: var(--color-warning);
    }
    
    .card .label { 
      color: var(--color-text-muted); 
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .trend {
      font-size: 0.78rem;
      font-weight: 500;
      margin-top: 0.25rem;
    }

    .trend.neutral { color: var(--color-text-muted); }
    .trend.danger { color: var(--color-danger); }
    .trend.warning { color: var(--color-warning); }

    /* Alerts */
    .alerts-container {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
      margin-top: 0.5rem;
    }

    .alerts-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.75rem;
    }

    .alerts-header h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-text);
    }

    .badge-alert {
      background: #fef2f2;
      color: var(--color-danger);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      border: 1px solid #fecaca;
    }

    .alerts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.25rem;
    }

    .alert-box {
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid;
    }

    .alert-box-danger {
      background: #fff5f5;
      border-color: #fed7d7;
    }

    .alert-box-warning {
      background: #fffaf0;
      border-color: #feebc8;
    }

    .box-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .box-title h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--color-text);
    }

    .indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .indicator.red { background: var(--color-danger); }
    .indicator.orange { background: var(--color-warning); }

    .alert-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .alert-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: #ffffff;
      border-radius: 6px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      gap: 0.75rem;
    }

    .alert-item-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sku-tag {
      font-family: monospace;
      font-size: 0.75rem;
      background: #f1f5f9;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: var(--color-text-muted);
      font-weight: 600;
    }

    .product-name {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .stock-pill {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-warning);
      background: #fef3c7;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      white-space: nowrap;
    }

    .loading-state {
      padding: 3rem;
      text-align: center;
      color: var(--color-text-muted);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-banner {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: var(--color-danger);
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    /* Responsive */
    @media (max-width: 1023px) {
      .cards { grid-template-columns: repeat(2, 1fr); }
    }
    
    @media (max-width: 640px) {
      .cards { grid-template-columns: 1fr; }
      .dashboard-header { flex-direction: column; }
    }
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
