import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services';
import type { OrganizationResponse } from '@core/models';

@Component({
  selector: 'app-org-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="org-container">
      <div class="org-card">
        <div class="org-header">
          <div class="icon-circle">🏢</div>
          <h2>Pilih Organisasi</h2>
          <p class="subtitle">Pilih organisasi untuk masuk ke workspace inventaris Anda</p>
        </div>

        <div *ngIf="loading()" class="state-loading">
          <div class="spinner"></div>
          <p>Memuat daftar organisasi...</p>
        </div>

        <div *ngIf="error()" class="alert-error">
          <span>⚠️</span>
          <span>{{ error() }}</span>
        </div>

        <div *ngIf="!loading() && orgs().length === 0" class="empty-state">
          <div class="empty-icon">📂</div>
          <p class="empty-title">Belum Ada Organisasi</p>
          <p class="empty-desc">Anda belum terhubung ke organisasi manapun. Buat organisasi baru untuk memulai.</p>
        </div>

        <div *ngIf="!loading() && orgs().length > 0" class="org-list">
          <div
            *ngFor="let org of orgs()"
            class="org-item"
            (click)="select(org.slug)"
          >
            <div class="org-avatar">
              {{ org.name.charAt(0).toUpperCase() }}
            </div>
            <div class="org-info">
              <span class="org-name">{{ org.name }}</span>
              <span class="org-slug">{{ org.slug }}</span>
            </div>
            <div class="org-arrow">➔</div>
          </div>
        </div>

        <div class="actions">
          <button routerLink="/orgs/create" class="btn-create">
            <span class="plus-icon">+</span> Buat Organisasi Baru
          </button>
        </div>
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
      max-width: 520px;
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

    .state-loading {
      text-align: center;
      padding: 2rem 0;
      color: #64748b;

      .spinner {
        width: 32px;
        height: 32px;
        margin: 0 auto 0.75rem;
        border: 3px solid #e2e8f0;
        border-top-color: #0284c7;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
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
      margin-bottom: 1.25rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px dashed #cbd5e1;
      margin-bottom: 1.5rem;

      .empty-icon {
        font-size: 2.25rem;
        margin-bottom: 0.5rem;
      }

      .empty-title {
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 0.25rem;
      }

      .empty-desc {
        font-size: 0.85rem;
        color: #64748b;
        margin: 0;
      }
    }

    .org-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }

    .org-item {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        border-color: #0284c7;
        background: #f0f9ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.1);

        .org-arrow {
          color: #0284c7;
          transform: translateX(3px);
        }
      }

      .org-avatar {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        font-weight: 700;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        margin-right: 1rem;
        flex-shrink: 0;
      }

      .org-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;

        .org-name {
          font-weight: 600;
          font-size: 1rem;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .org-slug {
          font-size: 0.8rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .org-arrow {
        color: #94a3b8;
        font-size: 1.1rem;
        font-weight: bold;
        transition: all 0.2s ease;
        margin-left: 0.75rem;
      }
    }

    .actions {
      .btn-create {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.85rem;
        background: #f8fafc;
        border: 1.5px dashed #cbd5e1;
        border-radius: 10px;
        color: #0f172a;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #ffffff;
          border-color: #0284c7;
          color: #0284c7;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);
        }

        .plus-icon {
          font-size: 1.2rem;
          font-weight: 700;
        }
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class OrgList {
  orgs = signal<OrganizationResponse[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    this.auth.getMyOrganizations().subscribe({
      next: (orgs) => {
        this.orgs.set(orgs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Gagal memuat organisasi');
        this.loading.set(false);
      },
    });
  }

  select(slug: string): void {
    this.auth.setActiveOrg(slug);
    this.router.navigate(['/dashboard']);
  }
}
