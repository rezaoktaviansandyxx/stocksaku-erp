import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { AppIconComponent } from '@shared/components';
import { AppBadgeComponent } from '@shared/components';
import { PaginationComponent } from '@shared/components';
import { RupiahPipe } from '@shared/pipes';
import { NumberFormatDirective } from '@shared/directives';
import { ToastService } from '@core/services';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/services';
import { InventoryService } from '@core/services';
import type {
  ProductResponse,
  StockBalanceResponse,
  StockMovementResponse,
  WarehouseResponse,
} from '@core/models';

type TransactionType = 'initial' | 'inbound' | 'outbound' | 'adjustment';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, AppIconComponent, PaginationComponent, NumberFormatDirective],
  templateUrl: './inventory.html',
  styleUrl: './inventory.scss',
})
export class Inventory implements OnInit {
  private auth = inject(AuthService);
  private inventory = inject(InventoryService);
  private toast = inject(ToastService);

  currentPage = signal(1);
  pageSize = signal(10);

  activeTab = signal<'balances' | 'movements'>('balances');
  loading = signal(true);
  submitting = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Dialog Transaksi
  showTransactionModal = signal(false);

  // Quick Warehouse modal
  showQuickWarehouseModal = signal(false);
  quickWarehouseName = '';
  quickWarehouseSubmitting = signal(false);
  quickWarehouseError = signal<string | null>(null);

  products = signal<ProductResponse[]>([]);
  warehouses = signal<WarehouseResponse[]>([]);
  balances = signal<StockBalanceResponse[]>([]);
  movements = signal<StockMovementResponse[]>([]);

  // Balances filter & search
  balanceSearchTerm = '';
  balanceWarehouseFilter: number | null = null;

  
  paginatedBalances = computed(() => {
    const list = this.filteredBalances();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  filteredBalances = computed(() => {
    let list = this.balances();
    const search = this.balanceSearchTerm.trim().toLowerCase();
    const whId = this.balanceWarehouseFilter;

    if (whId !== null) {
      list = list.filter((b) => b.warehouse_id === whId);
    }

    if (search) {
      list = list.filter((b) => {
        const prod = this.productMap.get(b.product_id);
        const name = prod?.name?.toLowerCase() || '';
        const sku = prod?.sku?.toLowerCase() || '';
        return name.includes(search) || sku.includes(search);
      });
    }

    return list;
  });

  // Summary computed stats
  productCount = computed(() => this.products().length);
  warehouseCount = computed(() => this.warehouses().length);
  totalStockItems = computed(() =>
    this.balances().reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)
  );

  // Transaction form
  txType: TransactionType = 'inbound';
  txWarehouseId: number | undefined;
  txProductId: number | undefined;
  txQuantity: string = '';
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

  resetMovementFilters(): void {
    this.movementProductId = null;
    this.movementStartDate = '';
    this.movementEndDate = '';
    this.fetchMovements();
  }

  downloadBalancesXlsx(): void {
    const headers = this.auth.buildHeaders();
    this.inventory.exportBalancesXlsx(headers).subscribe({
      next: (blob) => this.saveBlob(blob, `laporan-saldo-stok-${this.timestamp()}.xlsx`),
      error: () => this.error.set('Gagal mengunduh laporan saldo stok XLSX'),
    });
  }

  downloadMovementsXlsx(): void {
    const headers = this.auth.buildHeaders();
    const params: Record<string, unknown> = {};
    if (this.movementProductId) params['product_id'] = this.movementProductId;
    if (this.movementStartDate) params['start_date'] = this.movementStartDate;
    if (this.movementEndDate) params['end_date'] = this.movementEndDate;

    this.inventory.exportMovementsXlsx(params as never, headers).subscribe({
      next: (blob) => this.saveBlob(blob, `riwayat-mutasi-stok-${this.timestamp()}.xlsx`),
      error: () => this.error.set('Gagal mengunduh riwayat mutasi XLSX'),
    });
  }

  downloadBalancesCsv(): void {
    const headers = this.auth.buildHeaders();
    this.inventory.exportBalancesCsv(headers).subscribe({
      next: (blob) => this.saveBlob(blob, `laporan-saldo-stok-${this.timestamp()}.csv`),
      error: () => this.error.set('Gagal mengunduh laporan saldo stok'),
    });
  }

  downloadMovementsCsv(): void {
    const headers = this.auth.buildHeaders();
    const params: Record<string, unknown> = {};
    if (this.movementProductId) params['product_id'] = this.movementProductId;
    if (this.movementStartDate) params['start_date'] = this.movementStartDate;
    if (this.movementEndDate) params['end_date'] = this.movementEndDate;

    this.inventory.exportMovementsCsv(params as never, headers).subscribe({
      next: (blob) => this.saveBlob(blob, `riwayat-mutasi-stok-${this.timestamp()}.csv`),
      error: () => this.error.set('Gagal mengunduh riwayat mutasi'),
    });
  }

  private timestamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  getProductName(id: number): string {
    return this.productMap.get(id)?.name ?? `Produk #${id}`;
  }

  getProductSku(id: number): string {
    return this.productMap.get(id)?.sku ?? '-';
  }

  getWarehouseName(id: number): string {
    return this.warehouseMap.get(id)?.name ?? `Gudang #${id}`;
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return dateStr;
    }
  }

  openTransactionModal(type: TransactionType = 'inbound'): void {
    this.txType = type;
    this.txError.set(null);
    if (!this.warehouses().length) {
      this.loadWarehouses();
    }
    // Auto-select first warehouse if available and none selected
    if (!this.txWarehouseId && this.warehouses().length > 0) {
      this.txWarehouseId = this.warehouses()[0].id;
    }
    this.showTransactionModal.set(true);
  }

  closeTransactionModal(): void {
    this.showTransactionModal.set(false);
    this.resetTransactionForm();
  }

  loadWarehouses(autoSelectId?: number): void {
    const headers = this.auth.buildHeaders();
    this.inventory.listWarehouses({}, headers).subscribe({
      next: (wh) => {
        this.warehouses.set(wh);
        wh.forEach((w) => this.warehouseMap.set(w.id, w));
        if (autoSelectId) {
          this.txWarehouseId = autoSelectId;
        } else if (!this.txWarehouseId && wh.length > 0) {
          this.txWarehouseId = wh[0].id;
        }
      },
      error: () => {},
    });
  }

  // Quick Warehouse modal methods
  openQuickWarehouseModal(): void {
    this.quickWarehouseName = '';
    this.quickWarehouseError.set(null);
    this.showQuickWarehouseModal.set(true);
  }

  closeQuickWarehouseModal(): void {
    this.showQuickWarehouseModal.set(false);
    this.quickWarehouseName = '';
    this.quickWarehouseError.set(null);
  }

  saveQuickWarehouse(): void {
    const name = this.quickWarehouseName.trim();
    if (!name) {
      this.quickWarehouseError.set('Nama gudang harus diisi.');
      return;
    }
    this.quickWarehouseSubmitting.set(true);
    this.quickWarehouseError.set(null);

    const headers = this.auth.buildHeaders();
    this.inventory.createWarehouse({ name, is_active: true }, headers).subscribe({
      next: (newWh) => {
        this.quickWarehouseSubmitting.set(false);
        this.closeQuickWarehouseModal();
        this.loadWarehouses(newWh.id);
      },
      error: (err) => {
        this.quickWarehouseSubmitting.set(false);
        this.quickWarehouseError.set(err.error?.detail || 'Gagal menambahkan gudang');
      },
    });
  }

  selectTxType(type: TransactionType): void {
    this.txType = type;
    this.txError.set(null);
  }

  quickAdjust(balance: StockBalanceResponse): void {
    this.txType = 'adjustment';
    this.txWarehouseId = balance.warehouse_id;
    this.txProductId = balance.product_id;
    this.txQuantity = String(balance.quantity);
    this.txReason = 'Penyesuaian stok berkala';
    this.txError.set(null);
    this.showTransactionModal.set(true);
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

  onSubmitTransaction(): void {
    if (!this.txWarehouseId || !this.txProductId) {
      this.txError.set('Harap pilih gudang dan produk.');
      return;
    }

    const qty = Number(this.txQuantity);
    if (isNaN(qty) || qty <= 0) {
      this.txError.set('Kuantitas harus berupa angka valid lebih besar dari 0.');
      return;
    }

    const headers = this.auth.buildHeaders();
    const payload: Record<string, unknown> = {
      warehouse_id: this.txWarehouseId,
      product_id: this.txProductId,
      quantity: qty,
    };
    if (this.txType === 'adjustment') {
      if (!this.txReason.trim()) {
        this.txError.set('Alasan penyesuaian harus diisi.');
        return;
      }
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

    this.submitting.set(true);
    obs?.subscribe({
      next: () => {
        this.submitting.set(false);
        this.txError.set(null);
        this.successMessage.set(
          `Transaksi ${this.transactionLabel()} berhasil dicatat.`
        );
        this.closeTransactionModal();
        this.fetchBalances();
        this.fetchMovements();

        setTimeout(() => {
          this.successMessage.set(null);
        }, 4000);
      },
      error: (err) => {
        this.submitting.set(false);
        this.txError.set(err.error?.detail || 'Transaksi gagal diproses');
      },
    });
  }

  resetTransactionForm(): void {
    this.txWarehouseId = undefined;
    this.txProductId = undefined;
    this.txQuantity = '';
    this.txReason = '';
    this.txNotes = '';
    this.txError.set(null);
  }
}
