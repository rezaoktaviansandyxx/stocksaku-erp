import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import type { WarehouseResponse } from '../../core/models/inventory.model';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouses.html',
  styleUrl: './warehouses.scss',
})
export class Warehouses implements OnInit {
  private auth = inject(AuthService);
  private inventory = inject(InventoryService);

  loading = signal(true);
  submitting = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  warehouses = signal<WarehouseResponse[]>([]);
  searchTerm = signal('');

  // Modal State
  showModal = signal(false);
  editing = signal(false);
  editingId: number | null = null;
  formName = '';
  formIsActive = true;
  modalError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.loading.set(true);
    const headers = this.auth.buildHeaders();
    // active_only=false to show all warehouses (both active and inactive)
    this.inventory.listWarehouses({ active_only: false }, headers).subscribe({
      next: (list) => {
        this.warehouses.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Gagal memuat data gudang');
        this.loading.set(false);
      },
    });
  }

  filteredWarehouses(): WarehouseResponse[] {
    const search = this.searchTerm().trim().toLowerCase();
    if (!search) return this.warehouses();
    return this.warehouses().filter((w) => w.name.toLowerCase().includes(search));
  }

  openAddModal(): void {
    this.editing.set(false);
    this.editingId = null;
    this.formName = '';
    this.formIsActive = true;
    this.modalError.set(null);
    this.showModal.set(true);
  }

  openEditModal(warehouse: WarehouseResponse): void {
    this.editing.set(true);
    this.editingId = warehouse.id;
    this.formName = warehouse.name;
    this.formIsActive = warehouse.is_active;
    this.modalError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.formName = '';
    this.modalError.set(null);
  }

  onSubmit(): void {
    const name = this.formName.trim();
    if (!name) {
      this.modalError.set('Nama gudang harus diisi.');
      return;
    }

    const headers = this.auth.buildHeaders();
    this.submitting.set(true);
    this.modalError.set(null);

    if (this.editing() && this.editingId) {
      this.inventory
        .updateWarehouse(
          this.editingId,
          { name, is_active: this.formIsActive },
          headers
        )
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.closeModal();
            this.successMessage.set('Data gudang berhasil diperbarui.');
            this.loadWarehouses();
            setTimeout(() => this.successMessage.set(null), 3000);
          },
          error: (err) => {
            this.submitting.set(false);
            this.modalError.set(err.error?.detail || 'Gagal memperbarui gudang');
          },
        });
    } else {
      this.inventory
        .createWarehouse({ name, is_active: this.formIsActive }, headers)
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.closeModal();
            this.successMessage.set('Gudang baru berhasil ditambahkan.');
            this.loadWarehouses();
            setTimeout(() => this.successMessage.set(null), 3000);
          },
          error: (err) => {
            this.submitting.set(false);
            this.modalError.set(err.error?.detail || 'Gagal menambahkan gudang');
          },
        });
    }
  }

  toggleWarehouseStatus(warehouse: WarehouseResponse): void {
    const newStatus = !warehouse.is_active;
    const actionText = newStatus ? 'mengaktifkan' : 'menonaktifkan';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} gudang "${warehouse.name}"?`)) {
      return;
    }

    const headers = this.auth.buildHeaders();
    this.inventory
      .updateWarehouse(warehouse.id, { is_active: newStatus }, headers)
      .subscribe({
        next: () => {
          this.successMessage.set(
            `Gudang "${warehouse.name}" berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.`
          );
          this.loadWarehouses();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.error.set(err.error?.detail || 'Gagal mengubah status gudang');
        },
      });
  }
}
