import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  error = signal<string | null>(null);
  loading = signal(false);

  loginForm = new FormBuilder().group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.loginForm.value as { email: string; password: string }).subscribe({
      next: () => {
        this.loading.set(false);
        if (this.auth.isOrgSelected()) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/orgs']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Login gagal');
      },
    });
  }
}
