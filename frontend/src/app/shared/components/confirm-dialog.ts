import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="confirm-overlay" (click)="onBackdropClick($event)">
        <div class="confirm-modal" role="dialog" aria-modal="true">
          <div class="confirm-icon-wrapper" [class.danger]="variant === 'danger'" [class.warning]="variant === 'warning'" [class.info]="variant === 'info'" [class.success]="variant === 'success'">
            @if (variant === 'danger') {
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
              </svg>
            } @else if (variant === 'info') {
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            } @else if (variant === 'success') {
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            }
          </div>

          <div class="confirm-content">
            <h3 class="confirm-title">{{ title }}</h3>
            <p class="confirm-message">{{ message }}</p>
          </div>

          <div class="confirm-actions">
            @if (showCancel) {
              <button
                type="button"
                class="btn-confirm-cancel"
                (click)="onCancel()"
                [disabled]="loading"
              >
                {{ cancelText }}
              </button>
            }
            <button
              type="button"
              class="btn-confirm-action"
              [class.danger]="variant === 'danger'"
              [class.warning]="variant === 'warning'"
              [class.info]="variant === 'info'"
              [class.success]="variant === 'success'"
              (click)="onConfirm()"
              [disabled]="loading"
            >
              @if (loading) {
                <span class="spinner"></span>
                <span>Memproses...</span>
              } @else {
                <span>{{ confirmText }}</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
      animation: fadeIn 0.15s ease-out;
    }

    .confirm-modal {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 420px;
      padding: 1.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border: 1px solid #f1f5f9;
      animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .confirm-icon-wrapper {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .confirm-icon-wrapper.danger {
      background: #fee2e2;
      color: #ef4444;
    }

    .confirm-icon-wrapper.warning {
      background: #fef3c7;
      color: #d97706;
    }

    .confirm-icon-wrapper.info {
      background: #e0f2fe;
      color: #0284c7;
    }

    .confirm-icon-wrapper.success {
      background: #dcfce7;
      color: #16a34a;
    }

    .confirm-content {
      margin-bottom: 1.5rem;
    }

    .confirm-title {
      margin: 0 0 0.5rem 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
    }

    .confirm-message {
      margin: 0;
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      gap: 0.75rem;
      width: 100%;
    }

    .btn-confirm-cancel,
    .btn-confirm-action {
      flex: 1;
      padding: 0.625rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.15s ease;
    }

    .btn-confirm-cancel {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .btn-confirm-cancel:hover:not(:disabled) {
      background: #e2e8f0;
      color: #1e293b;
    }

    .btn-confirm-action.danger {
      background: #ef4444;
      color: #ffffff;
      border: 1px solid #dc2626;
    }

    .btn-confirm-action.danger:hover:not(:disabled) {
      background: #dc2626;
      border-color: #b91c1c;
      box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);
    }

    .btn-confirm-action.info {
      background: #2563eb;
      color: #ffffff;
      border: 1px solid #1d4ed8;
    }

    .btn-confirm-action.info:hover:not(:disabled) {
      background: #1d4ed8;
      border-color: #1e40af;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }

    .btn-confirm-action.warning {
      background: #d97706;
      color: #ffffff;
      border: 1px solid #b45309;
    }

    .btn-confirm-action.warning:hover:not(:disabled) {
      background: #b45309;
      border-color: #92400e;
      box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);
    }

    .btn-confirm-action.success {
      background: #16a34a;
      color: #ffffff;
      border: 1px solid #15803d;
    }

    .btn-confirm-action.success:hover:not(:disabled) {
      background: #15803d;
      border-color: #166534;
      box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);
    }

    .btn-confirm-cancel:disabled,
    .btn-confirm-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.8s linear infinite;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ConfirmDialog {
  @Input() isOpen = false;
  @Input() title = 'Konfirmasi Hapus';
  @Input() message = 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.';
  @Input() confirmText = 'Ya, Hapus';
  @Input() cancelText = 'Batal';
  @Input() showCancel = true;
  @Input() variant: 'danger' | 'warning' | 'info' | 'success' = 'danger';
  @Input() loading = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    if (!this.loading) {
      this.confirmed.emit();
    }
  }

  onCancel(): void {
    if (!this.loading) {
      this.cancelled.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.loading) {
      this.onCancel();
    }
  }
}
