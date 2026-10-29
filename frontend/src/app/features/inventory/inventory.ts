import { Component, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import type {
  ProductResponse,
  StockBalanceResponse,
  StockMovementResponse,
  WarehouseResponse,
} from '../../core/models/inventory.model';

type TransactionType = 'initial' | 'inbound' | 'outbound' | 'adjustment';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="inventory-page">
      <h1>Inventaris</h1>

      <!-- Summary Cards -->
      <div class="cards">
        <div class="card">
          <span class="value">{{ productCount() }}</span>
          <span class="label">Total Produk</span>
        </div>
        <div class="card">
          <span class="value">{{ warehouseCount() }}</span>
          <span class="label">Gudang</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button (click)="activeTab.set('balances')" [class.active]="activeTab() === 'balances'">
          Saldo Stok
        </button>
        <button (click)="activeTab.set('movements')" [class.active]="activeTab() === 'movements'">
          Riwayat Mutasi
        </button>
        <button (click)="activeTab.set('transaction')" [class.active]="activeTab() === 'transaction'">
          Transaksi Baru
        </button>
      </div>

      <!-- Balances Tab -->
      @if (activeTab() === 'balances') {
        <div>
          @if (loading()) { <p>Memuat...</p> }
          @else {
            <table class="data-table">
              <thead>
                <tr><th>Produk</th><th>Gudang</th><th>SKU</th><th>Saldo</th></tr>
              </thead>
              <tbody>
                @for (b of balances(); track b.id) {
                  <tr>
                    <td>{{ getProductName(b.product_id) }}</td>
                    <td>{{ getWarehouseName(b.warehouse_id) }}</td>
                    <td>{{ getProductSku(b.product_id) }}</td>
                    <td>{{ b.quantity }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (balances().length === 0) { <p class="empty">Belum ada saldo stok.</p> }
          }
        </div>
      }

      <!-- Movements Tab -->
      @if (activeTab() === 'movements') {
        <div>
          <div class="filters">
            <select [(ngModel)]="movementProductId" (change)="fetchMovements()">
              <option [ngValue]="null">Semua Produk</option>
              @for (p of products(); track p.id) {
                <option [ngValue]="p.id">{{ p.name }}</option>
              }
            </select>
            <input type="date" [(ngModel)]="movementStartDate" (change)="fetchMovements()" />
            <input type="date" [(ngModel)]="movementEndDate" (change)="fetchMovements()" />
          </div>

          @if (movements().length === 0) { <p class="empty">Tidak ada riwayat.</p> }
          @else {
            <table class="data-table">
              <thead>
                <tr><th>Tanggal</th><th>Produk</th><th>Gudang</th><th>Tipe</th><th>Kuantitas</th><th>Catatan</th></tr>
              </thead>
              <tbody>
                @for (m of movements(); track m.id) {
                  <tr>
                    <td>{{ m.created_at }}</td>
                    <td>{{ getProductName(m.product_id) }}</td>
                    <td>{{ getWarehouseName(m.warehouse_id) }}</td>
                    <td>{{ m.movement_type }}</td>
                    <td>{{ m.quantity }}</td>
                    <td>{{ m.notes }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- Transaction Tab -->
      @if (activeTab() === 'transaction') {
        <div class="transaction-form">
          <h2>{{ transactionLabel() }}</h2>

          <form (ngSubmit)="onSubmitTransaction()" #form="ngForm">
            <label>
              Tipe Transaksi
              <select [(ngModel)]="txType" name="tx_type">
                <option value="inbound">Barang Masuk</option>
                <option value="outbound">Barang Keluar</option>
                <option value="adjustment">Penyesuaian Stok</option>
                <option value="initial">Stok Awal</option>
              </select>
            </label>

            <label>
              Gudang
              <select [(ngModel)]="txWarehouseId" name="warehouse_id" required>
                <option [ngValue]="undefined">Pilih gudang</option>
                @for (w of warehouses(); track w.id) {
                  <option [ngValue]="w.id">{{ w.name }}</option>
                }
              </select>
            </label>

            <label>
              Produk
              <select [(ngModel)]="txProductId" name="product_id" required>
                <option [ngValue]="undefined">Pilih produk</option>
                @for (p of products(); track p.id) {
                  <option [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option>
                }
              </select>
            </label>

            <label>
              Kuantitas
              <input type="number" step="0.001" [(ngModel)]="txQuantity" name="quantity" required min="0.001" />
            </label>

            @if (txType === 'adjustment') {
              <label>
                Alasan
                <input type="text" [(ngModel)]="txReason" name="reason" required />
              </label>
            }

            <label>
              Catatan
              <textarea [(ngModel)]="txNotes" name="notes"></textarea>
            </label>

            <div class="modal-actions">
              <button type="submit" class="btn-primary" [disabled]="!txWarehouseId || !txProductId || form.invalid">
                {{ transactionLabel() }}
              </button>
            </div>
          </form>

          @if (txError()) { <p class="error">{{ txError() }}</p> }
        </div>
      }
    </div>
  `,
  styles: [`
    .inventory-page { padding: 1.5rem; }
    .cards { display: flex; gap: 1rem; margin: 1.5rem 0; flex-wrap: wrap; }
    .card { flex: 1; min-width: 150px; background: #fff; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .card .value { font-size: 1.5rem; font-weight: 700; }
    .card .label { color: #7f8c8d; display: block; }
    .tabs { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .tabs button { padding: 0.5rem 1rem; border: 1px solid #ddd; background: #fff; cursor: pointer; }
    .tabs button.active { background: #3498db; color: #fff; border-color: #3498db; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.5rem; border-bottom: 1px solid #eee; text-align: left; }
    .transaction-form label { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
    .transaction-form input, .transaction-form select, .transaction-form textarea { padding: 0.5rem; margin-top: 0.25rem; border: 1px solid #ddd; border-radius: 4px; }
    .filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .empty { color: #7f8c8d; }
    .error { color: #e74c3c; }
    .btn-primary { background: #3498db; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
  `],
})
export class Inventory implements OnInit {
  private auth = inject(AuthService);
  private inventory = inject(InventoryService);

  activeTab = signal<'balances' | 'movements' | 'transaction'>('balances');
  loading = signal(true);
  error = signal<string | null>(null);

  products = signal<ProductResponse[]>([]);
  warehouses = signal<WarehouseResponse[]>([]);
  balances = signal<StockBalanceResponse[]>([]);
  movements = signal<StockMovementResponse[]>([]);

  // Transaction form
  txType: TransactionType = 'inbound';
  txWarehouseId: number | undefined;
  txProductId: number | undefined;
  txQuantity: string = '0';
  txReason = '';
  txNotes = '';
  txError = signal<string | null>(null);

  // Movement filters
  movementProductId: number | null = null;
  movementStartDate = '';
  movementEndDate = '';

  private productMap = new Map<number, ProductResponse>();
  private warehouseMap = new Map<number, WarehouseResponse>();

  ngOnInit(): void {
    this.loadReferenceData();
  }

  loadReferenceData(): void {
    const headers = this.auth.buildHeaders();
    this.loading.set(true);

    this.inventory.listProducts({}, headers).subscribe({
      next: (prods) => {
        this.products.set(prods);
        prods.forEach((p) => this.productMap.set(p.id, p));
        this.fetchBalances();
        this.fetchMovements();
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Gagal memuat produk');
        this.loading.set(false);
      },
    });

    this.inventory.listWarehouses({}, headers).subscribe({
      next: (wh) => {
        this.warehouses.set(wh);
        wh.forEach((w) => this.warehouseMap.set(w.id, w));
      },
      error: () => {},
    });
  }

  fetchBalances(): void {
    const headers = this.auth.buildHeaders();
    this.inventory.listBalances({}, headers).subscribe({
      next: (b) => {
        this.balances.set(b);
        if (this.movements().length === 0) this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Gagal memuat saldo');
        this.loading.set(false);
      },
    });
  }

  fetchMovements(): void {
    const headers = this.auth.buildHeaders();
    const params: Record<string, unknown> = {};
    if (this.movementProductId) params['product_id'] = this.movementProductId;
    if (this.movementStartDate) params['start_date'] = this.movementStartDate;
    if (this.movementEndDate) params['end_date'] = this.movementEndDate;

    this.inventory.listMovements(params as never, headers).subscribe({
      next: (m) => {
        this.movements.set(m);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Gagal memuat riwayat');
        this.loading.set(false);
      },
    });
  }

  getProductName(id: number): string {
    return this.productMap.get(id)?.name ?? `Produk #${id}`;
  }

  getProductSku(id: number): string {
    return this.productMap.get(id)?.sku ?? '';
  }

  getWarehouseName(id: number): string {
    return this.warehouseMap.get(id)?.name ?? `Gudang #${id}`;
  }

  transactionLabel(): string {
    const labels: Record<TransactionType, string> = {
      initial: 'Stok Awal',
      inbound: 'Barang Masuk',
      outbound: 'Barang Keluar',
      adjustment: 'Penyesuaian Stok',
    };
    return labels[this.txType];
  }

  productCount = () => this.products().length;
  warehouseCount = () => this.warehouses().length;

  onSubmitTransaction(): void {
    const headers = this.auth.buildHeaders();
    const payload: Record<string, unknown> = {
      warehouse_id: this.txWarehouseId,
      product_id: this.txProductId,
      quantity: Number(this.txQuantity),
    };
    if (this.txType === 'adjustment') {
      payload['reason'] = this.txReason;
    }
    if (this.txNotes) {
      payload['notes'] = this.txNotes;
    }

    const type = this.txType;
    let obs;
    switch (type) {
      case 'initial':
        obs = this.inventory.setInitialStock(payload as never, headers);
        break;
      case 'inbound':
        obs = this.inventory.createInbound(payload as never, headers);
        break;
      case 'outbound':
        obs = this.inventory.createOutbound(payload as never, headers);
        break;
      case 'adjustment':
        obs = this.inventory.adjustStock(payload as never, headers);
        break;
    }

    obs?.subscribe({
      next: () => {
        this.txError.set(null);
        this.resetTransactionForm();
        this.fetchBalances();
        this.fetchMovements();
      },
      error: (err) => {
        this.txError.set(err.error?.detail || 'Transaksi gagal');
      },
    });
  }

  resetTransactionForm(): void {
    this.txWarehouseId = undefined;
    this.txProductId = undefined;
    this.txQuantity = '0';
    this.txReason = '';
    this.txNotes = '';
  }
}
