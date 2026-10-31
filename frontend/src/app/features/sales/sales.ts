import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../core/services/sales.service';
import { CustomerService } from '../../core/services/customer.service';
import { InventoryService } from '../../core/services/inventory.service';
import { AuthService } from '../../core/services/auth.service';
import type {
  SalesOrderCreate,
  SalesOrderItemCreate,
  SalesOrderResponse,
} from '../../core/models/sales.model';
import type { CustomerResponse } from '../../core/models/customer.model';
import type { ProductResponse, WarehouseResponse } from '../../core/models/inventory.model';

interface ItemRow {
  product_id: number | null;
  quantity: number;
  unit_price: number;
  available: number | null;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
})
export class Sales implements OnInit {
  sales = signal<SalesOrderResponse[]>([]);
  customers = signal<CustomerResponse[]>([]);
  warehouses = signal<WarehouseResponse[]>([]);
  products = signal<ProductResponse[]>([]);

  loading = signal(false);
  submitting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Filters
  selectedStatus = '';

  // Modals
  showCreateModal = signal(false);
  selectedSo = signal<SalesOrderResponse | null>(null);
  soToConfirm = signal<SalesOrderResponse | null>(null);
  soToCancel = signal<SalesOrderResponse | null>(null);

  // Form Model
  newSo: {
    customer_id: number | null;
    warehouse_id: number | null;
    notes: string;
  } = {
    customer_id: null,
    warehouse_id: null,
    notes: '',
  };

  soItemRows: ItemRow[] = [];

  // Confirm Form
  confirmWarehouseId: number | null = null;
  confirmNotes = '';

  constructor(
    private salesService: SalesService,
    private customerService: CustomerService,
    private inventoryService: InventoryService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadMasterData();
  }

  loadData(): void {
    this.loading.set(true);
    const headers = this.auth.buildHeaders();
    this.salesService
      .listSalesOrders({ status: this.selectedStatus || undefined }, headers)
      .subscribe({
        next: (res) => {
          this.sales.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Gagal memuat daftar pesanan penjualan');
          this.loading.set(false);
        },
      });
  }

  loadMasterData(): void {
    const headers = this.auth.buildHeaders();
    this.customerService.listCustomers(undefined, headers).subscribe({
      next: (res) => this.customers.set(res),
    });

    this.inventoryService.listWarehouses({}, headers).subscribe({
      next: (res) => {
        this.warehouses.set(res);
        if (res.length > 0 && !this.newSo.warehouse_id) {
          this.newSo.warehouse_id = res[0].id;
        }
      },
    });

    this.inventoryService.listProducts({}, headers).subscribe({
      next: (res) => this.products.set(res),
    });
  }

  openCreateModal(): void {
    this.newSo = {
      customer_id: null,
      warehouse_id: this.warehouses().length > 0 ? this.warehouses()[0].id : null,
      notes: '',
    };
    const firstProd = this.products().length > 0 ? this.products()[0] : null;
    this.soItemRows = [
      {
        product_id: firstProd ? firstProd.id : null,
        quantity: 1,
        unit_price: firstProd ? Number(firstProd.selling_price) : 0,
        available: null,
      },
    ];
    this.refreshAllAvailability();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  addItemRow(): void {
    const firstProd = this.products().length > 0 ? this.products()[0] : null;
    this.soItemRows.push({
      product_id: firstProd ? firstProd.id : null,
      quantity: 1,
      unit_price: firstProd ? Number(firstProd.selling_price) : 0,
      available: null,
    });
    this.refreshAllAvailability();
  }

  removeItemRow(index: number): void {
    this.soItemRows.splice(index, 1);
  }

  onProductSelected(row: ItemRow): void {
    if (!row.product_id) return;
    const prod = this.products().find((p) => p.id === row.product_id);
    if (prod) {
      row.unit_price = Number(prod.selling_price);
    }
    this.refreshAvailability(row);
  }

  onWarehouseChanged(): void {
    this.refreshAllAvailability();
  }

  // Cek saldo real-time per baris produk di gudang yang dipilih
  refreshAllAvailability(): void {
    for (const row of this.soItemRows) {
      this.refreshAvailability(row);
    }
  }

  refreshAvailability(row: ItemRow): void {
    if (!row.product_id || !this.newSo.warehouse_id) {
      row.available = null;
      return;
    }
    const headers = this.auth.buildHeaders();
    const productId = row.product_id;
    this.inventoryService
      .listBalances(
        { warehouse_id: this.newSo.warehouse_id, product_id: productId },
        headers,
      )
      .subscribe({
        next: (res) => {
          if (row.product_id !== productId) return;
          row.available = res.length > 0 ? Number(res[0].quantity) : 0;
        },
        error: () => {
          row.available = null;
        },
      });
  }

  isOverStock(row: ItemRow): boolean {
    return row.available !== null && row.quantity > row.available;
  }

  hasStockShortage(): boolean {
    return this.soItemRows.some((r) => this.isOverStock(r));
  }

  calculateTotal(): number {
    return this.soItemRows.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }

  submitCreate(): void {
    const validItems: SalesOrderItemCreate[] = [];
    for (const row of this.soItemRows) {
      if (!row.product_id || row.quantity <= 0) {
        alert('Pastikan semua baris produk dan kuantitas diisi dengan benar');
        return;
      }
      validItems.push({
        product_id: row.product_id,
        quantity: row.quantity,
        unit_price: row.unit_price,
      });
    }

    if (validItems.length === 0) {
      alert('Tambahkan minimal 1 barang');
      return;
    }

    const payload: SalesOrderCreate = {
      customer_id: this.newSo.customer_id,
      warehouse_id: this.newSo.warehouse_id,
      notes: this.newSo.notes || undefined,
      items: validItems,
    };

    this.submitting.set(true);
    const headers = this.auth.buildHeaders();
    this.salesService.createSalesOrder(payload, headers).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.closeCreateModal();
        this.showToast(`Pesanan penjualan ${res.order_number} berhasil dibuat sebagai Draft.`);
        this.loadData();
      },
      error: (err) => {
        this.submitting.set(false);
        alert(err.error?.detail || 'Gagal membuat pesanan penjualan');
      },
    });
  }

  viewDetail(so: SalesOrderResponse): void {
    this.selectedSo.set(so);
  }

  closeDetailModal(): void {
    this.selectedSo.set(null);
  }

  openConfirmModal(so: SalesOrderResponse): void {
    this.soToConfirm.set(so);
    this.confirmWarehouseId = so.warehouse_id || (this.warehouses().length > 0 ? this.warehouses()[0].id : null);
    this.confirmNotes = '';
  }

  closeConfirmModal(): void {
    this.soToConfirm.set(null);
  }

  confirmSo(): void {
    const so = this.soToConfirm();
    if (!so) return;

    this.submitting.set(true);
    const headers = this.auth.buildHeaders();
    this.salesService
      .confirmSalesOrder(
        so.id,
        {
          warehouse_id: this.confirmWarehouseId,
          notes: this.confirmNotes || undefined,
        },
        headers,
      )
      .subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.closeConfirmModal();
          if (this.selectedSo()?.id === so.id) {
            this.selectedSo.set(updated);
          }
          this.showToast(`Penjualan ${updated.order_number} dikonfirmasi dan stok berkurang.`);
          this.loadData();
        },
        error: (err) => {
          this.submitting.set(false);
          this.closeConfirmModal();
          this.errorMessage.set(err.error?.detail || 'Gagal mengonfirmasi penjualan');
        },
      });
  }

  openCancelModal(so: SalesOrderResponse): void {
    this.soToCancel.set(so);
  }

  closeCancelModal(): void {
    this.soToCancel.set(null);
  }

  confirmCancel(): void {
    const so = this.soToCancel();
    if (!so) return;

    this.submitting.set(true);
    const headers = this.auth.buildHeaders();
    this.salesService.cancelSalesOrder(so.id, headers).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.closeCancelModal();
        if (this.selectedSo()?.id === so.id) {
          this.selectedSo.set(updated);
        }
        this.showToast(`Penjualan ${updated.order_number} dibatalkan.`);
        this.loadData();
      },
      error: (err) => {
        this.submitting.set(false);
        this.closeCancelModal();
        this.errorMessage.set(err.error?.detail || 'Gagal membatalkan penjualan');
      },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'Draft':
        return 'Draft';
      case 'Confirmed':
        return 'Dikonfirmasi';
      case 'Cancelled':
        return 'Dibatalkan';
      default:
        return status;
    }
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(val: number | string): string {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  }

  private showToast(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 4000);
  }
}
