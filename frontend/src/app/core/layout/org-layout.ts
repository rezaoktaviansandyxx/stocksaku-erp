import { Component, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ConfirmDialog, AppIconComponent } from '@shared/components';

@Component({
  selector: 'app-org-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ConfirmDialog, AppIconComponent],
  templateUrl: './org-layout.html',
  styleUrl: './org-layout.scss',
})
export class OrgLayout {
  showLogoutConfirm = signal(false);
  logoutLoading = signal(false);

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  openLogoutConfirm(): void {
    this.showLogoutConfirm.set(true);
  }

  cancelLogout(): void {
    this.showLogoutConfirm.set(false);
  }

  logout(): void {
    this.openLogoutConfirm();
  }

  confirmLogout(): void {
    this.logoutLoading.set(true);
    this.auth.logout();
    this.showLogoutConfirm.set(false);
    this.logoutLoading.set(false);
    this.router.navigate(['/login']);
  }
}
