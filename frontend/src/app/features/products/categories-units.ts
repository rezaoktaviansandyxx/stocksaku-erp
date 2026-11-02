import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialog } from '@shared/components';
import { AuthService } from '@core/services';
import { InventoryService } from '@core/services';
import type { CategoryResponse, UnitResponse } from '@core/models';

@Component({
  selector: 'app-categories-units',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog],
  templateUrl: './categories-units.html',
  styleUrl: './categories-units.scss',
})
export class CategoriesUnits implements OnInit {
  private auth = inject(AuthService);
  private inventory = inject(InventoryService);

  activeTab = signal<'categories' | 'units'>('categories');
  loading = signal(false);
  actionLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  categories = signal<CategoryResponse[]>([]);
  units = signal<UnitResponse[]>([]);

  // Category quick modal
  showCategoryModal = signal(false);
  categoryName = '';

  // Unit quick modal
  showUnitModal = signal(false);
  unitName = '';
  unitSymbol = '';

  // Generic Confirm Delete Modal
  showConfirmDelete = signal(false);
  deleteLoading = signal(false);
  deleteType: 'category' | 'unit' | null = null;
  targetCategory: CategoryResponse | null = null;
  targetUnit: UnitResponse | null = null;
  confirmTitle = 'Konfirmasi Hapus';
  confirmMessage = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const headers = this.auth.buildHeaders();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.inventory.listCategories({}, headers).subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Gagal memuat kategori');
        this.loading.set(false);
      },
    });

    this.inventory.listUnits({}, headers).subscribe({
      next: (un) => this.units.set(un),
      error: () => {},
    });
  }

  openAddCategory(): void {
    this.categoryName = '';
    this.errorMessage.set(null);
    this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void {
    this.showCategoryModal.set(false);
  }

  saveCategory(): void {
    if (!this.categoryName.trim()) return;
    this.actionLoading.set(true);
    const headers = this.auth.buildHeaders();

    this.inventory.createCategory({ name: this.categoryName.trim() }, headers).subscribe({
      next: (created) => {
        this.categories.update((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
        this.actionLoading.set(false);
        this.showCategoryModal.set(false);
        this.showToast(`Kategori "${created.name}" berhasil ditambahkan`);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Gagal menyimpan kategori');
      },
    });
  }

  deleteCategory(cat: CategoryResponse): void {
    this.deleteType = 'category';
    this.targetCategory = cat;
    this.confirmTitle = 'Hapus Kategori';
    this.confirmMessage = `Apakah Anda yakin ingin menghapus kategori "${cat.name}"? Pastikan tidak ada produk yang menggunakan kategori ini.`;
    this.showConfirmDelete.set(true);
  }

  deleteUnit(u: UnitResponse): void {
    this.deleteType = 'unit';
    this.targetUnit = u;
    this.confirmTitle = 'Hapus Satuan';
    this.confirmMessage = `Apakah Anda yakin ingin menghapus satuan "${u.name} (${u.symbol})"? Pastikan tidak ada produk yang menggunakan satuan ini.`;
    this.showConfirmDelete.set(true);
  }

  openAddUnit(): void {
    this.unitName = '';
    this.unitSymbol = '';
    this.errorMessage.set(null);
    this.showUnitModal.set(true);
  }

  closeUnitModal(): void {
    this.showUnitModal.set(false);
  }

  saveUnit(): void {
    if (!this.unitName.trim() || !this.unitSymbol.trim()) return;
    this.actionLoading.set(true);
    const headers = this.auth.buildHeaders();

    this.inventory
      .createUnit({ name: this.unitName.trim(), symbol: this.unitSymbol.trim() }, headers)
      .subscribe({
        next: (created) => {
          this.units.update((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
          this.actionLoading.set(false);
          this.showUnitModal.set(false);
          this.showToast(`Satuan "${created.name} (${created.symbol})" berhasil ditambahkan`);
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.errorMessage.set(err.error?.detail || 'Gagal menyimpan satuan');
        },
      });
  }

  cancelDelete(): void {
    if (this.deleteLoading()) return;
    this.showConfirmDelete.set(false);
    this.deleteType = null;
    this.targetCategory = null;
    this.targetUnit = null;
  }

  confirmDelete(): void {
    const headers = this.auth.buildHeaders();
    this.deleteLoading.set(true);

    if (this.deleteType === 'category' && this.targetCategory) {
      const cat = this.targetCategory;
      this.inventory.deleteCategory(cat.id, headers).subscribe({
        next: () => {
          this.deleteLoading.set(false);
          this.showConfirmDelete.set(false);
          this.categories.update((list) => list.filter((c) => c.id !== cat.id));
          this.showToast(`Kategori "${cat.name}" berhasil dihapus`);
          this.targetCategory = null;
        },
        error: (err) => {
          this.deleteLoading.set(false);
          this.showConfirmDelete.set(false);
          this.errorMessage.set(err.error?.detail || 'Gagal menghapus kategori. Kategori mungkin masih digunakan oleh produk.');
          this.targetCategory = null;
        },
      });
    } else if (this.deleteType === 'unit' && this.targetUnit) {
      const u = this.targetUnit;
      this.inventory.deleteUnit(u.id, headers).subscribe({
        next: () => {
          this.deleteLoading.set(false);
          this.showConfirmDelete.set(false);
          this.units.update((list) => list.filter((item) => item.id !== u.id));
          this.showToast(`Satuan "${u.name}" berhasil dihapus`);
          this.targetUnit = null;
        },
        error: (err) => {
          this.deleteLoading.set(false);
          this.showConfirmDelete.set(false);
          this.errorMessage.set(err.error?.detail || 'Gagal menghapus satuan. Satuan mungkin masih digunakan oleh produk.');
          this.targetUnit = null;
        },
      });
    }
  }

  private showToast(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 3500);
  }
}
