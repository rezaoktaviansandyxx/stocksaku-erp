import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from './app-icon';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="pagination-container" *ngIf="totalItems > 0">
      <div class="pagination-info">
        <span>Menampilkan <strong>{{ startItem }}-{{ endItem }}</strong> dari <strong>{{ totalItems }}</strong> data</span>
        <div class="page-size-selector">
          <label for="pageSize">Per halaman:</label>
          <select id="pageSize" [ngModel]="pageSize" (ngModelChange)="onPageSizeChange($event)">
            <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }}</option>
          </select>
        </div>
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="page-btn"
          [disabled]="currentPage <= 1"
          (click)="changePage(currentPage - 1)"
          aria-label="Halaman Sebelumnya"
        >
          <app-icon name="chevron-left" [size]="16" />
        </button>

        <span class="page-current">
          Hal <strong>{{ currentPage }}</strong> / {{ totalPages }}
        </span>

        <button
          type="button"
          class="page-btn"
          [disabled]="currentPage >= totalPages"
          (click)="changePage(currentPage + 1)"
          aria-label="Halaman Selanjutnya"
        >
          <app-icon name="chevron-right" [size]="16" />
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pagination-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0.875rem 1.25rem;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      font-size: 0.875rem;
      color: #64748b;
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;

      strong {
        color: #1e293b;
        font-weight: 600;
      }
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      select {
        padding: 0.25rem 0.5rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.375rem;
        background: #ffffff;
        font-size: 0.8125rem;
        color: #1e293b;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: #0284c7;
        }
      }
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .page-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      background: #ffffff;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        border-color: #0284c7;
        color: #0284c7;
        background: #f0f9ff;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .page-current {
      font-size: 0.8125rem;
      color: #475569;
      padding: 0 0.5rem;

      strong {
        color: #0f172a;
      }
    }
  `]
})
export class PaginationComponent {
  @Input() totalItems: number = 0;
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get startItem(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(newSize: number | string) {
    const size = Number(newSize);
    if (size !== this.pageSize) {
      this.pageSizeChange.emit(size);
    }
  }
}
