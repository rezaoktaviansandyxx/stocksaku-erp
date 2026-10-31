import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import type {
  CategoryResponse,
  ProductResponse,
  UnitResponse,
} from '../../core/models/inventory.model';

interface ProductForm {
  sku: string;
  name: string;
  cost_price: string;
  selling_price: string;
  min_stock: string;
  category_id: number | null;
  unit_id: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit {
  private auth = inject(AuthService);
  private inventory = inject(InventoryService);

  loading = signal(true);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  units = signal<UnitResponse[]>([]);

  searchTerm = '';
  currentPage = signal(1);
  pageSize = 15;

  // Main Product Modal
  showModal = signal(false);
  editing = signal(false);
  formModel: ProductForm = {
    sku: '',
    name: '',
    cost_price: '0',
    selling_price: '0',
    min_stock: '0',
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

  paginatedProducts(): ProductResponse[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.products().slice(start, end);
  }

  totalPages(): number {
    return Math.ceil(this.products().length / this.pageSize) || 1;
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.set(this.currentPage() - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.set(this.currentPage() + 1);
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
      cost_price: '0',
      selling_price: '0',
      min_stock: '0',
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
      cost_price: String(p.cost_price),
      selling_price: String(p.selling_price),
      min_stock: String(p.min_stock),
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
        this.showToast(`Kategori "${cat.name}" berhasil dibuat dan dipilih.`);
      },
      error: (err) => {
        this.quickActionLoading.set(false);
        this.error.set(err.error?.detail || 'Gagal menambahkan kategori');
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
          this.showToast(`Satuan "${un.name} (${un.symbol})" berhasil dibuat dan dipilih.`);
        },
        error: (err) => {
          this.quickActionLoading.set(false);
          this.error.set(err.error?.detail || 'Gagal menambahkan satuan');
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
          this.showToast('Perubahan produk berhasil disimpan');
        },
        error: (err) => this.error.set(err.error?.detail || 'Gagal mengubah produk'),
      });
    } else {
      this.inventory.createProduct(payload, headers).subscribe({
        next: () => {
          this.showModal.set(false);
          this.fetchData();
          this.showToast('Produk baru berhasil ditambahkan');
        },
        error: (err) => this.error.set(err.error?.detail || 'Gagal menambah produk'),
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
        this.showToast(`Produk "${p.name}" dinonaktifkan.`);
      },
      error: (err) => {
        this.deleteLoading.set(false);
        this.showConfirmDelete.set(false);
        this.productToDelete.set(null);
        this.error.set(err.error?.detail || 'Gagal menonaktifkan');
      },
    });
  }

  private showToast(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 3500);
  }
}
