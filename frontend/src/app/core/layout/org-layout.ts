import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-org-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './org-layout.html',
  styleUrl: './org-layout.scss',
})
export class OrgLayout {
  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  logout(): void {
    if (!confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      return;
    }
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
