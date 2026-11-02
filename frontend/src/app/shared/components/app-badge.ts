import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [class]="'badge-' + variant" [class.dot-indicator]="withDot">
      @if (withDot) {
        <span class="dot"></span>
      }
      <ng-content />
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
    }

    .badge-success {
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .badge-warning {
      background-color: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .badge-danger {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .badge-info {
      background-color: #f0f9ff;
      color: #075985;
      border: 1px solid #bae6fd;
    }

    .badge-neutral {
      background-color: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
  `]
})
export class AppBadgeComponent {
  @Input() variant: BadgeVariant = 'neutral';
  @Input() withDot: boolean = false;
}
