import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './login.scss',
})
export class Register {
  error = signal<string | null>(null);
  loading = signal(false);

  registerForm = new FormBuilder().group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    full_name: ['', [Validators.required, Validators.minLength(1)]],
  });

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    this.auth.register(this.registerForm.value as { email: string; password: string; full_name: string }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Registrasi gagal');
      },
    });
  }
}
