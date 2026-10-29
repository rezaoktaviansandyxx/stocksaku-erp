import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import type { OrganizationResponse } from '../../core/models/auth.model';

@Component({
  selector: 'app-org-list',
  standalone: true,
  template: `
    <div class="org-page">
      <h2>Pilih Organisasi</h2>
      <p *ngIf="loading()">Memuat organisasi...</p>
      <p *ngIf="!loading() && orgs().length === 0" class="empty">
        Anda belum memiliki organisasi.
      </p>
      <p *ngIf="error()" class="error">{{ error() }}</p>

      <div *ngFor="let org of orgs()" class="org-item">
        <button (click)="select(org.slug)">{{ org.name }}</button>
        <small>{{ org.slug }}</small>
      </div>

      <button routerLink="/orgs/create" class="secondary">Buat Organisasi Baru</button>
    </div>
  `,
  styles: [`
    .org-page { max-width: 480px; margin: 4rem auto; padding: 1rem; }
    .org-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .org-item button { width: 100%; padding: 1rem; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .org-item small { color: #7f8c8d; }
    .empty { color: #7f8c8d; }
    .error { color: #e74c3c; }
    .secondary { background: #95a5a6; }
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
