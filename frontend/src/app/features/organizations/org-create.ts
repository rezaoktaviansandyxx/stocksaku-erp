import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-org-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-container">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
        <h2>Buat Organisasi</h2>
        <p *ngIf="error()" class="error">{{ error() }}</p>

        <label>
          Nama Organisasi
          <input type="text" formControlName="name" />
          <small *ngIf="f.name.invalid && f.name.touched">Nama diperlukan</small>
        </label>

        <label>
          Slug
          <input type="text" formControlName="slug" />
          <small>Lowercase, angka, dan tanda hubung</small>
          <small *ngIf="f.slug.invalid && f.slug.touched">Slug tidak valid</small>
        </label>

        <button type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Membuat...' : 'Buat' }}
        </button>
      </form>
    </div>
  `,
  styleUrls: ['../auth/login.scss'],
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
