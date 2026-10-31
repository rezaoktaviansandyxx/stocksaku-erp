import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { AuthService } from '../../core/services/auth.service';
import { SupplierService } from '../../core/services/supplier.service';
import { CustomerService } from '../../core/services/customer.service';
import type {
  SupplierCreate,
  SupplierResponse,
  SupplierUpdate,
} from '../../core/models/supplier.model';
import type {
  CustomerCreate,
  CustomerResponse,
  CustomerUpdate,
} from '../../core/models/customer.model';

interface PartnerForm {
  name: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog],
  templateUrl: './partners.html',
  styleUrl: './partners.scss',
})
export class Partners implements OnInit {
  private auth = inject(AuthService);
  private supplierService = inject(SupplierService);
  private customerService = inject(CustomerService);

  activeTab = signal<'suppliers' | 'customers'>('suppliers');
  loading = signal(false);
  actionLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  suppliers = signal<SupplierResponse[]>([]);
  customers = signal<CustomerResponse[]>([]);

  searchTerm = '';

  // Modal State
  showModal = signal(false);
  editingId: number | null = null;
  formModel: PartnerForm = {
    name: '',
    phone: '',
    email: '',
  };

  // Confirm Delete Dialog State
  showConfirmDelete = signal(false);
  deleteLoading = signal(false);
  deleteTargetId: number | null = null;
  deleteTargetName = '';
  deleteTargetType: 'supplier' | 'customer' = 'supplier';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const headers = this.auth.buildHeaders();
    this.loading.set(true);
    this.errorMessage.set(null);

    const search = this.searchTerm.trim() || undefined;

    this.supplierService.listSuppliers({ search }, headers).subscribe({
      next: (data) => {
        this.suppliers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Gagal memuat daftar supplier');
        this.loading.set(false);
      },
    });

    this.customerService.listCustomers({ search }, headers).subscribe({
      next: (data) => {
        this.customers.set(data);
      },
      error: () => {},
    });
  }

  onSearch(): void {
    this.loadData();
  }

  openAddModal(): void {
    this.editingId = null;
    this.formModel = {
      name: '',
      phone: '',
      email: '',
    };
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEditSupplier(item: SupplierResponse): void {
    this.editingId = item.id;
    this.formModel = {
      name: item.name,
      phone: item.phone || '',
      email: item.email || '',
    };
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEditCustomer(item: CustomerResponse): void {
    this.editingId = item.id;
    this.formModel = {
      name: item.name,
      phone: item.phone || '',
      email: item.email || '',
    };
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingId = null;
  }

  savePartner(): void {
    if (!this.formModel.name.trim()) {
      this.errorMessage.set('Nama tidak boleh kosong');
      return;
    }

    const headers = this.auth.buildHeaders();
    this.actionLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      name: this.formModel.name.trim(),
      phone: this.formModel.phone.trim() || null,
      email: this.formModel.email.trim() || null,
    };

    if (this.activeTab() === 'suppliers') {
      if (this.editingId) {
        this.supplierService.updateSupplier(this.editingId, payload, headers).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.closeModal();
            this.triggerSuccess('Supplier berhasil diperbarui');
            this.loadData();
          },
          error: (err) => {
            this.actionLoading.set(false);
            this.errorMessage.set(err.error?.detail || 'Gagal memperbarui supplier');
          },
        });
      } else {
        this.supplierService.createSupplier(payload, headers).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.closeModal();
            this.triggerSuccess('Supplier berhasil ditambahkan');
            this.loadData();
          },
          error: (err) => {
            this.actionLoading.set(false);
            this.errorMessage.set(err.error?.detail || 'Gagal menambahkan supplier');
          },
        });
      }
    } else {
      if (this.editingId) {
        this.customerService.updateCustomer(this.editingId, payload, headers).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.closeModal();
            this.triggerSuccess('Pelanggan berhasil diperbarui');
            this.loadData();
          },
          error: (err) => {
            this.actionLoading.set(false);
            this.errorMessage.set(err.error?.detail || 'Gagal memperbarui pelanggan');
          },
        });
      } else {
        this.customerService.createCustomer(payload, headers).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.closeModal();
            this.triggerSuccess('Pelanggan berhasil ditambahkan');
            this.loadData();
          },
          error: (err) => {
            this.actionLoading.set(false);
            this.errorMessage.set(err.error?.detail || 'Gagal menambahkan pelanggan');
          },
        });
      }
    }
  }

  confirmDeleteSupplier(item: SupplierResponse): void {
    this.deleteTargetId = item.id;
    this.deleteTargetName = item.name;
    this.deleteTargetType = 'supplier';
    this.showConfirmDelete.set(true);
  }

  confirmDeleteCustomer(item: CustomerResponse): void {
    this.deleteTargetId = item.id;
    this.deleteTargetName = item.name;
    this.deleteTargetType = 'customer';
    this.showConfirmDelete.set(true);
  }

  executeDelete(): void {
    if (!this.deleteTargetId) return;

    const headers = this.auth.buildHeaders();
    this.deleteLoading.set(true);

    if (this.deleteTargetType === 'supplier') {
      this.supplierService.deleteSupplier(this.deleteTargetId, headers).subscribe({
        next: () => {
          this.deleteLoading.set(false);
          this.showConfirmDelete.set(false);
          this.triggerSuccess(`Supplier "${this.deleteTargetName}" berhasil dihapus`);
          this.loadData();
        },
        error: (err) => {
          this.deleteLoading.set(false);
          this.showConfirmDelete.set(false);
          this.errorMessage.set(err.error?.detail || 'Gagal menghapus supplier');
        },
      });
    } else {
      this.customerService.deleteCustomer(this.deleteTargetId, headers).subscribe({
        next: () => {
          this.deleteLoading.set(false);
          this.showConfirmDelete.set(false);
          this.triggerSuccess(`Pelanggan "${this.deleteTargetName}" berhasil dihapus`);
          this.loadData();
        },
        error: (err) => {
          this.deleteLoading.set(false);
          this.showConfirmDelete.set(false);
          this.errorMessage.set(err.error?.detail || 'Gagal menghapus pelanggan');
        },
      });
    }
  }

  private triggerSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
