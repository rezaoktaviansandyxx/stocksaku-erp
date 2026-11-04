import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialog } from '@shared/components';
import { AppIconComponent } from '@shared/components';
import { AppBadgeComponent } from '@shared/components';
import { PaginationComponent } from '@shared/components';
import { BarcodeScannerComponent } from '@shared/components';
import { RupiahPipe } from '@shared/pipes';
import { NumberFormatDirective } from '@shared/directives';
import { AuthService } from '@core/services';
import { InventoryService } from '@core/services';
import { ToastService } from '@core/services';
import type {
  CategoryResponse,
  ProductResponse,
  UnitResponse,
} from '@core/models';

interface ProductForm {
  sku: string;
  name: string;
  cost_price: number | null;
  selling_price: number | null;
  min_stock: number | null;
  category_id: number | null;
  unit_id: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmDialog,
    AppIconComponent,
    AppBadgeComponent,
    PaginationComponent,
    BarcodeScannerComponent,
    RupiahPipe,
    NumberFormatDirective
  ],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit {
  private auth = inject(AuthService);
  private inventory = inject(InventoryService);
  private toast = inject(ToastService);

  loading = signal(true);
  error = signal<string | null>(null);
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  units = signal<UnitResponse[]>([]);

  searchTerm = '';
  selectedCategory: number | null = null;
  sortField: 'name' | 'sku' | 'selling_price' | 'min_stock' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  currentPage = signal(1);
  pageSize = signal(10);

  // Main Product Modal
  showModal = signal(false);
  editing = signal(false);
  formModel: ProductForm = {
    sku: '',
    name: '',
    cost_price: 0,
    selling_price: 0,
    min_stock: 0,
    category_id: null,
    unit_id: 0,
  };
  editProductId: number | null = null;

  // Quick Add Category Modal
  showQuickCategoryModal = signal(false);
  quickCategoryName = '';

  // Quick Add Unit Modal
  showQuickUnitModal = signal(false);
  quickUnitName = '';
  quickUnitSymbol = '';

  // Delete / Deactivate Confirmation Modal
  showConfirmDelete = signal(false);
  productToDelete = signal<ProductResponse | null>(null);
  deleteLoading = signal(false);

  quickActionLoading = signal(false);

  // Barcode Scanner Modal
  showScanner = signal(false);
  scannerTarget: 'search' | 'sku' = 'search';

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    const headers = this.auth.buildHeaders();
    this.loading.set(true);

    this.inventory.listProducts({}, headers).subscribe({
      next: (prods) => {
        this.products.set(prods);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Gagal memuat produk');
        this.loading.set(false);
      },
    });

    this.inventory.listCategories({}, headers).subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => {},
    });

    this.inventory.listUnits({}, headers).subscribe({
      next: (un) => {
        this.units.set(un);
        if (this.formModel.unit_id === 0 && un.length > 0) {
          this.formModel.unit_id = un[0].id;
        }
      },
      error: () => {},
    });
  }

  applyFilter(): void {
    const headers = this.auth.buildHeaders();
    this.loading.set(true);
    this.inventory
      .listProducts({ search: this.searchTerm, active_only: true }, headers)
      .subscribe({
        next: (prods) => {
          this.products.set(prods);
          this.loading.set(false);
          this.currentPage.set(1);
        },
        error: (err) => {
          this.error.set(err.error?.detail || 'Gagal mencari');
          this.loading.set(false);
        },
      });
  }

  filteredAndSortedProducts(): ProductResponse[] {
    let list = [...this.products()];
    if (this.selectedCategory !== null) {
      list = list.filter((p) => p.category_id === this.selectedCategory);
    }

    list.sort((a, b) => {
      let valA: any = a[this.sortField];
      let valB: any = b[this.sortField];
      if (typeof valA === 'string') {
        return this.sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return this.sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }

  toggleSort(field: 'name' | 'sku' | 'selling_price' | 'min_stock'): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
  }

  paginatedProducts(): ProductResponse[] {
    const list = this.filteredAndSortedProducts();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return list.slice(start, end);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  getCategoryName(id: number | null): string {
    if (!id) return '-';
    const found = this.categories().find((c) => c.id === id);
    return found ? found.name : '-';
  }

  getUnitSymbol(id: number): string {
    const found = this.units().find((u) => u.id === id);
    return found ? found.symbol : '';
  }

  openModal(): void {
    this.editing.set(false);
    this.editProductId = null;
    this.formModel = {
      sku: '',
      name: '',
      cost_price: 0,
      selling_price: 0,
      min_stock: 0,
      category_id: null,
      unit_id: this.units()[0]?.id ?? 0,
    };
    this.showModal.set(true);
  }

  openEdit(p: ProductResponse): void {
    this.editing.set(true);
    this.editProductId = p.id;
    this.formModel = {
      sku: p.sku,
      name: p.name,
      cost_price: Number(p.cost_price),
      selling_price: Number(p.selling_price),
      min_stock: Number(p.min_stock),
      category_id: p.category_id ?? null,
      unit_id: p.unit_id,
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  // Quick Add Category methods
  openQuickCategory(): void {
    this.quickCategoryName = '';
    this.showQuickCategoryModal.set(true);
  }

  closeQuickCategory(): void {
    this.showQuickCategoryModal.set(false);
  }

  saveQuickCategory(): void {
    if (!this.quickCategoryName.trim()) return;
    this.quickActionLoading.set(true);
    const headers = this.auth.buildHeaders();

    this.inventory.createCategory({ name: this.quickCategoryName.trim() }, headers).subscribe({
      next: (cat) => {
        // Update list & otomatis pilih kategori baru
        this.categories.update((list) => [...list, cat].sort((a, b) => a.name.localeCompare(b.name)));
        this.formModel.category_id = cat.id;
        this.quickActionLoading.set(false);
        this.showQuickCategoryModal.set(false);
        this.toast.success(`Kategori "${cat.name}" berhasil dibuat dan dipilih.`);
      },
      error: (err) => {
        this.quickActionLoading.set(false);
        this.toast.error(err.error?.detail || 'Gagal menambahkan kategori');
      },
    });
  }

  // Quick Add Unit methods
  openQuickUnit(): void {
    this.quickUnitName = '';
    this.quickUnitSymbol = '';
    this.showQuickUnitModal.set(true);
  }

  closeQuickUnit(): void {
    this.showQuickUnitModal.set(false);
  }

  saveQuickUnit(): void {
    if (!this.quickUnitName.trim() || !this.quickUnitSymbol.trim()) return;
    this.quickActionLoading.set(true);
    const headers = this.auth.buildHeaders();

    this.inventory
      .createUnit(
        { name: this.quickUnitName.trim(), symbol: this.quickUnitSymbol.trim() },
        headers
      )
      .subscribe({
        next: (un) => {
          // Update list & otomatis pilih satuan baru
          this.units.update((list) => [...list, un].sort((a, b) => a.name.localeCompare(b.name)));
          this.formModel.unit_id = un.id;
          this.quickActionLoading.set(false);
          this.showQuickUnitModal.set(false);
          this.toast.success(`Satuan "${un.name} (${un.symbol})" berhasil dibuat.`);
        },
        error: (err) => {
          this.quickActionLoading.set(false);
          this.toast.error(err.error?.detail || 'Gagal menambahkan satuan');
        },
      });
  }

  onSubmit(): void {
    const headers = this.auth.buildHeaders();
    const payload = {
      sku: this.formModel.sku.trim(),
      name: this.formModel.name.trim(),
      cost_price: Number(this.formModel.cost_price),
      selling_price: Number(this.formModel.selling_price),
      min_stock: Number(this.formModel.min_stock),
      is_active: true,
      category_id: this.formModel.category_id || null,
      unit_id: this.formModel.unit_id,
    };

    if (this.editing() && this.editProductId) {
      this.inventory.updateProduct(this.editProductId, payload, headers).subscribe({
        next: () => {
          this.showModal.set(false);
          this.fetchData();
          this.toast.success('Perubahan produk berhasil disimpan');
        },
        error: (err) => this.toast.error(err.error?.detail || 'Gagal mengubah produk'),
      });
    } else {
      this.inventory.createProduct(payload, headers).subscribe({
        next: () => {
          this.showModal.set(false);
          this.fetchData();
          this.toast.success('Produk baru berhasil ditambahkan');
        },
        error: (err) => this.toast.error(err.error?.detail || 'Gagal menambah produk'),
      });
    }
  }

  deactivate(p: ProductResponse): void {
    this.productToDelete.set(p);
    this.showConfirmDelete.set(true);
  }

  cancelDelete(): void {
    if (this.deleteLoading()) return;
    this.showConfirmDelete.set(false);
    this.productToDelete.set(null);
  }

  confirmDeactivate(): void {
    const p = this.productToDelete();
    if (!p) return;

    this.deleteLoading.set(true);
    const headers = this.auth.buildHeaders();
    this.inventory.deactivateProduct(p.id, headers).subscribe({
      next: () => {
        this.deleteLoading.set(false);
        this.showConfirmDelete.set(false);
        this.productToDelete.set(null);
        this.fetchData();
        this.toast.success(`Produk "${p.name}" berhasil dinonaktifkan.`);
      },
      error: (err) => {
        this.deleteLoading.set(false);
        this.showConfirmDelete.set(false);
        this.productToDelete.set(null);
        this.toast.error(err.error?.detail || 'Gagal menonaktifkan produk');
      },
    });
  }

  openScanner(target: 'search' | 'sku'): void {
    this.scannerTarget = target;
    this.showScanner.set(true);
  }

  closeScanner(): void {
    this.showScanner.set(false);
  }

  handleBarcodeScanned(code: string): void {
    if (this.scannerTarget === 'sku') {
      this.formModel.sku = code;
      this.toast.success(`Barcode berhasil dipindai: ${code}`);
    } else {
      this.searchTerm = code;
      this.applyFilter();
      this.toast.info(`Mencari produk barcode: ${code}`);
    }
  }

  private showToast(msg: string): void {
    this.toast.info(msg);
  }
}
