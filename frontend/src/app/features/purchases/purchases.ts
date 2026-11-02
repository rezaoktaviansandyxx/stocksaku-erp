import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseService } from '@core/services';
import { SupplierService } from '@core/services';
import { InventoryService } from '@core/services';
import { AuthService } from '@core/services';
import { ConfirmDialog } from '@shared/components';
import { NumberFormatDirective } from '@shared/directives';
import type {
  PurchaseOrderResponse,
  PurchaseOrderCreate,
  PurchaseOrderItemCreate,
} from '@core/models';
import type { SupplierResponse } from '@core/models';
import type { ProductResponse, WarehouseResponse } from '@core/models';

interface ItemRow {
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
}

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog, NumberFormatDirective],
  templateUrl: './purchases.html',
  styleUrl: './purchases.scss',
})
export class Purchases implements OnInit {
  purchases = signal<PurchaseOrderResponse[]>([]);
  suppliers = signal<SupplierResponse[]>([]);
  warehouses = signal<WarehouseResponse[]>([]);
  products = signal<ProductResponse[]>([]);

  loading = signal(false);
  submitting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Filters
  selectedStatus = '';
  selectedSupplierId: number | null = null;

  // Modals
  showCreateModal = signal(false);
  selectedPo = signal<PurchaseOrderResponse | null>(null);
  poToReceive = signal<PurchaseOrderResponse | null>(null);

  // Modern Dialog State
  alertDialog = signal<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
  });

  // Form Model
  newPo: {
    supplier_id: number | null;
    warehouse_id: number | null;
    notes: string;
  } = {
    supplier_id: null,
    warehouse_id: null,
    notes: '',
  };

  poItemRows: ItemRow[] = [];

  // Receive Form
  receiveWarehouseId: number | null = null;
  receiveNotes = '';

  constructor(
    private purchaseService: PurchaseService,
    private supplierService: SupplierService,
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
    this.purchaseService
      .listPurchaseOrders(
        {
          status: this.selectedStatus || undefined,
          supplier_id: this.selectedSupplierId ?? undefined,
        },
        headers,
      )
      .subscribe({
        next: (res) => {
          this.purchases.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Gagal memuat daftar pesanan pembelian');
          this.loading.set(false);
        },
      });
  }

  loadMasterData(): void {
    const headers = this.auth.buildHeaders();
    this.supplierService.listSuppliers(undefined, headers).subscribe({
      next: (res) => this.suppliers.set(res),
    });

    this.inventoryService.listWarehouses({}, headers).subscribe({
      next: (res) => {
        this.warehouses.set(res);
        if (res.length > 0 && !this.newPo.warehouse_id) {
          this.newPo.warehouse_id = res[0].id;
        }
      },
    });

    this.inventoryService.listProducts({}, headers).subscribe({
      next: (res) => this.products.set(res),
    });
  }

  openCreateModal(): void {
    this.newPo = {
      supplier_id: this.suppliers().length > 0 ? this.suppliers()[0].id : null,
      warehouse_id: this.warehouses().length > 0 ? this.warehouses()[0].id : null,
      notes: '',
    };
    const firstProd = this.products().length > 0 ? this.products()[0] : null;
    this.poItemRows = [
      {
        product_id: firstProd ? firstProd.id : null,
        product_name: firstProd ? `${firstProd.name} (${firstProd.sku})` : '',
        quantity: 1,
        unit_cost: firstProd ? Number(firstProd.cost_price) : 0,
      },
    ];
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  addItemRow(): void {
    const firstProd = this.products().length > 0 ? this.products()[0] : null;
    this.poItemRows.push({
      product_id: firstProd ? firstProd.id : null,
      product_name: firstProd ? `${firstProd.name} (${firstProd.sku})` : '',
      quantity: 1,
      unit_cost: firstProd ? Number(firstProd.cost_price) : 0,
    });
  }

  removeItemRow(index: number): void {
    this.poItemRows.splice(index, 1);
  }

  onProductSelected(row: ItemRow): void {
    if (!row.product_id) return;
    const prod = this.products().find((p) => p.id === row.product_id);
    if (prod) {
      row.unit_cost = Number(prod.cost_price);
    }
  }

  onProductSearchInput(row: ItemRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.trim();
    row.product_name = input.value;

    const found = this.products().find(p => 
      `${p.name} (${p.sku})`.toLowerCase() === val.toLowerCase() ||
      p.name.toLowerCase() === val.toLowerCase() ||
      p.sku.toLowerCase() === val.toLowerCase()
    );

    if (found) {
      row.product_id = found.id;
      row.product_name = `${found.name} (${found.sku})`;
      row.unit_cost = Number(found.cost_price) || 0;
    } else {
      row.product_id = null;
    }
  }

  closeAlertDialog(): void {
    this.alertDialog.update((d) => ({ ...d, isOpen: false }));
  }

  showAlert(message: string, title: string = 'Perhatian', variant: 'danger' | 'warning' | 'info' | 'success' = 'warning'): void {
    this.alertDialog.set({
      isOpen: true,
      title,
      message,
      variant,
    });
  }

  calculateEstimatedTotal(): number {
    return this.poItemRows.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  }

  submitCreate(): void {
    if (!this.newPo.supplier_id) {
      this.showAlert('Pilih supplier terlebih dahulu sebelum menyimpan pesanan pembelian.', 'Peringatan Validasi', 'warning');
      return;
    }

    const validItems: PurchaseOrderItemCreate[] = [];
    for (const row of this.poItemRows) {
      if (!row.product_id || row.quantity <= 0) {
        this.showAlert('Pastikan semua baris produk dan kuantitas diisi dengan benar.', 'Peringatan Validasi', 'warning');
        return;
      }
      validItems.push({
        product_id: row.product_id,
        quantity: row.quantity,
        unit_cost: row.unit_cost,
      });
    }

    if (validItems.length === 0) {
      this.showAlert('Tambahkan minimal 1 barang untuk membuat pesanan pembelian.', 'Peringatan Validasi', 'warning');
      return;
    }

    const payload: PurchaseOrderCreate = {
      supplier_id: this.newPo.supplier_id,
      warehouse_id: this.newPo.warehouse_id,
      notes: this.newPo.notes || undefined,
      items: validItems,
    };

    this.submitting.set(true);
    const headers = this.auth.buildHeaders();
    this.purchaseService.createPurchaseOrder(payload, headers).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.closeCreateModal();
        this.showToast(`Pesanan pembelian ${res.order_number} berhasil dibuat.`);
        this.loadData();
      },
      error: (err) => {
        this.submitting.set(false);
        this.showAlert(err.error?.detail || 'Gagal membuat pesanan pembelian', 'Gagal Membuat PO', 'danger');
      },
    });
  }

  viewDetail(po: PurchaseOrderResponse): void {
    this.selectedPo.set(po);
  }

  closeDetailModal(): void {
    this.selectedPo.set(null);
  }

  sendOrder(po: PurchaseOrderResponse): void {
    this.submitting.set(true);
    const headers = this.auth.buildHeaders();
    this.purchaseService.sendPurchaseOrder(po.id, headers).subscribe({
      next: (updatedPo) => {
        this.submitting.set(false);
        if (this.selectedPo()?.id === po.id) {
          this.selectedPo.set(updatedPo);
        }
        this.showToast(`PO ${updatedPo.order_number} berhasil dikirim ke supplier.`);
        this.loadData();
      },
      error: (err) => {
        this.submitting.set(false);
        this.showAlert(err.error?.detail || 'Gagal mengirim pesanan pembelian', 'Gagal Kirim PO', 'danger');
      },
    });
  }

  openReceiveModal(po: PurchaseOrderResponse): void {
    this.poToReceive.set(po);
    this.receiveWarehouseId = po.warehouse_id || (this.warehouses().length > 0 ? this.warehouses()[0].id : null);
    this.receiveNotes = '';
  }

  closeReceiveModal(): void {
    this.poToReceive.set(null);
  }

  confirmReceive(): void {
    const po = this.poToReceive();
    if (!po) return;

    this.submitting.set(true);
    const headers = this.auth.buildHeaders();
    this.purchaseService
      .receivePurchaseOrder(
        po.id,
        {
          warehouse_id: this.receiveWarehouseId,
          notes: this.receiveNotes || undefined,
        },
        headers,
      )
      .subscribe({
        next: (updatedPo) => {
          this.submitting.set(false);
          this.closeReceiveModal();
          if (this.selectedPo()?.id === po.id) {
            this.selectedPo.set(updatedPo);
          }
          this.showToast(`Barang untuk PO ${updatedPo.order_number} berhasil diterima dan stok bertambah.`);
          this.loadData();
        },
        error: (err) => {
          this.submitting.set(false);
          this.showAlert(err.error?.detail || 'Gagal memproses penerimaan barang', 'Gagal Terima Barang', 'danger');
        },
      });
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
