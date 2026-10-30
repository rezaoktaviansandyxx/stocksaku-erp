import { Component, signal, OnInit,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import type { CategoryResponse, ProductResponse, UnitResponse, WarehouseResponse } from '../../core/models/inventory.model';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="products-page">
      <div class="header">
        <h1>Produk</h1>
        <button class="btn-primary" (click)="openModal()">+ Tambah Produk</button>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <input
          type="text"
          placeholder="Cari produk..."
          [(ngModel)]="searchTerm"
          (ngModelChange)="applyFilter()"
        />
      </div>

      <!-- Products Table -->
      @if (loading()) {
        <p>Memuat...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (products().length === 0) {
        <p class="empty">Tidak ada produk.</p>
      } @else {
        <table class="product-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nama</th>
              <th>Harga Beli</th>
              <th>Harga Jual</th>
              <th>Stok Min</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            @for (p of paginatedProducts(); track p.id) {
              <tr>
                <td>{{ p.sku }}</td>
                <td>{{ p.name }}</td>
                <td>Rp {{ p.cost_price }}</td>
                <td>Rp {{ p.selling_price }}</td>
                <td>{{ p.min_stock }}</td>
                <td>
                  <span [class.active]="p.is_active" [class.inactive]="!p.is_active">
                    {{ p.is_active ? 'Aktif' : 'Non-aktif' }}
                  </span>
                </td>
                <td>
                  <button class="btn-small" (click)="openEdit(p)">Edit</button>
                  <button class="btn-small btn-danger" (click)="deactivate(p)">Hapus</button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="pagination" *ngIf="totalPages() > 1">
          <button (click)="prevPage()" [disabled]="currentPage() === 1">‹</button>
          <span>Halaman {{ currentPage() }} dari {{ totalPages() }}</span>
          <button (click)="nextPage()" [disabled]="currentPage() === totalPages()">›</button>
        </div>
      }

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>{{ editing() ? 'Edit' : 'Tambah' }} Produk</h2>

            <form (ngSubmit)="onSubmit()" #form="ngForm">
              <label>
                SKU
                <input type="text" [(ngModel)]="formModel.sku" name="sku" required />
              </label>

              <label>
                Nama
                <input type="text" [(ngModel)]="formModel.name" name="name" required />
              </label>

              <label>
                Harga Beli
                <input type="number" step="0.01" [(ngModel)]="formModel.cost_price" name="cost_price" required />
              </label>

              <label>
                Harga Jual
                <input type="number" step="0.01" [(ngModel)]="formModel.selling_price" name="selling_price" required />
              </label>

              <label>
                Stok Minimum
                <input type="number" step="0.001" [(ngModel)]="formModel.min_stock" name="min_stock" />
              </label>

              <label>
                Kategori
                <select [(ngModel)]="formModel.category_id" name="category_id">
                  <option [ngValue]="null">Pilih kategori (opsional)</option>
                  @for (c of categories(); track c.id) {
                    <option [ngValue]="c.id">{{ c.name }}</option>
                  }
                </select>
              </label>

              <label>
                Satuan
                <select [(ngModel)]="formModel.unit_id" name="unit_id" required>
                  <option [ngValue]="0">Pilih satuan</option>
                  @for (u of units(); track u.id) {
                    <option [ngValue]="u.id">{{ u.name }} ({{ u.symbol }})</option>
                  }
                </select>
              </label>

              <div class="modal-actions">
                <button type="button" (click)="closeModal()">Batal</button>
                <button type="submit" [disabled]="form.invalid" class="btn-primary">
                  {{ editing() ? 'Simpan' : 'Tambah' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .products-page { padding: 1.5rem; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .search-bar input { padding: 0.5rem; width: 240px; border: 1px solid #ddd; border-radius: 4px; }
    .product-table { width: 100%; border-collapse: collapse; }
    .product-table th, .product-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #eee; }
    .product-table th { background: #f8f9fa; }
    .active { color: #27ae60; font-weight: 600; }
    .inactive { color: #e74c3c; font-weight: 600; }
    .btn-primary { background: #3498db; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    .btn-small { padding: 0.25rem 0.5rem; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.25rem; }
    .btn-danger { background: #e74c3c; color: #fff; }
    .pagination { display: flex; align-items: center; gap: 1rem; justify-content: center; margin-top: 1rem; }
    .empty { color: #7f8c8d; margin-top: 1rem; }
    .error { color: #e74c3c; }
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: #fff; padding: 1.5rem; border-radius: 8px; min-width: 400px; max-width: 90vw; }
    .modal label { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
    .modal input, .modal select { padding: 0.5rem; margin-top: 0.25rem; border: 1px solid #ddd; border-radius: 4px; }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
  `],
})
export class Products implements OnInit {
  private auth = inject(AuthService);
  private inventory = inject(InventoryService);

  loading = signal(true);
  error = signal<string | null>(null);
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  units = signal<UnitResponse[]>([]);

  searchTerm = '';
  currentPage = signal(1);
  pageSize = 20;

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
      next: (un) => this.units.set(un),
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

  onSubmit(): void {
    const headers = this.auth.buildHeaders();
    const payload = {
      sku: this.formModel.sku,
      name: this.formModel.name,
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
        },
        error: (err) => this.error.set(err.error?.detail || 'Gagal mengubah produk'),
      });
    } else {
      this.inventory.createProduct(payload, headers).subscribe({
        next: () => {
          this.showModal.set(false);
          this.fetchData();
        },
        error: (err) => this.error.set(err.error?.detail || 'Gagal menambah produk'),
      });
    }
  }

  deactivate(p: ProductResponse): void {
    if (!confirm(`Nonaktifkan produk "${p.name}"?`)) return;
    const headers = this.auth.buildHeaders();
    this.inventory.deactivateProduct(p.id, headers).subscribe({
      next: () => this.fetchData(),
      error: (err) => this.error.set(err.error?.detail || 'Gagal menonaktifkan'),
    });
  }
}
