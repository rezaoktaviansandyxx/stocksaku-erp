import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services';

@Component({
  selector: 'app-org-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="org-container">
      <div class="org-card">
        <div class="org-header">
          <div class="icon-circle">✨</div>
          <h2>Buat Organisasi Baru</h2>
          <p class="subtitle">Buat entitas bisnis baru untuk mengelola inventaris produk</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="org-form">
          <div *ngIf="error()" class="alert-error">
            <span>⚠️</span>
            <span>{{ error() }}</span>
          </div>

          <div class="form-group">
            <label for="orgName">Nama Organisasi</label>
            <input
              id="orgName"
              type="text"
              formControlName="name"
              placeholder="Contoh: Toko Berkah Mandiri"
              (input)="onNameChange()"
            />
            <small class="error-hint" *ngIf="f.name.invalid && f.name.touched">Nama diperlukan</small>
          </div>

          <div class="form-group">
            <label for="orgSlug">Slug Organisasi</label>
            <input
              id="orgSlug"
              type="text"
              formControlName="slug"
              placeholder="contoh: toko-berkah-mandiri"
            />
            <small class="helper-text">Hanya huruf kecil, angka, dan tanda hubung (-)</small>
            <small class="error-hint" *ngIf="f.slug.invalid && f.slug.touched">Format slug tidak valid</small>
          </div>

          <div class="form-actions">
            <button type="button" routerLink="/orgs" class="btn-cancel">Batal</button>
            <button type="submit" class="btn-submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Membuat...' : 'Buat Organisasi' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .org-container {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 2.5rem 1rem;
      min-height: calc(100vh - 120px);
    }

    .org-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
      width: 100%;
      max-width: 480px;
      padding: 2.5rem;
    }

    .org-header {
      text-align: center;
      margin-bottom: 2rem;

      .icon-circle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 50%;
        font-size: 1.75rem;
        margin-bottom: 1rem;
      }

      h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.02em;
      }

      .subtitle {
        margin: 0.5rem 0 0;
        font-size: 0.875rem;
        color: #64748b;
      }
    }

    .org-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #334155;
      }

      input {
        width: 100%;
        padding: 0.75rem 0.9rem;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.95rem;
        color: #1e293b;
        background-color: #f8fafc;
        transition: all 0.2s ease;
        box-sizing: border-box;

        &:focus {
          outline: none;
          border-color: #0284c7;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        &::placeholder {
          color: #94a3b8;
        }
      }

      .helper-text {
        color: #64748b;
        font-size: 0.75rem;
      }

      .error-hint {
        color: #ef4444;
        font-size: 0.75rem;
        font-weight: 500;
      }
    }

    .alert-error {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;

      .btn-cancel {
        flex: 1;
        padding: 0.8rem;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #475569;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
      }

      .btn-submit {
        flex: 2;
        padding: 0.8rem;
        background: #0284c7;
        border: none;
        border-radius: 8px;
        color: #ffffff;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);

        &:hover:not(:disabled) {
          background: #0369a1;
          transform: translateY(-1px);
        }

        &:disabled {
          background: #94a3b8;
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.75;
        }
      }
    }
  `],
})
export class OrgCreate {
  error = signal<string | null>(null);
  loading = signal(false);

  form = new FormBuilder().group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)]],
  });

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  get f() {
    return this.form.controls;
  }

  onNameChange(): void {
    const nameVal = this.form.get('name')?.value || '';
    if (!this.form.get('slug')?.dirty) {
      const generatedSlug = nameVal
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s-]+/g, '-');
      this.form.patchValue({ slug: generatedSlug });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    this.auth.createOrganization(this.form.value as { name: string; slug: string }).subscribe({
      next: (org) => {
        this.loading.set(false);
        this.auth.setActiveOrg(org.slug);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Gagal membuat organisasi');
      },
    });
  }
}
