import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-mini-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mini-chart-card">
      <div class="chart-header">
        <h3 class="chart-title">{{ title }}</h3>
        <span class="chart-subtitle" *ngIf="subtitle">{{ subtitle }}</span>
      </div>
      
      <div class="chart-body">
        @if (data.length === 0) {
          <div class="chart-empty">Tidak ada data untuk ditampilkan</div>
        } @else {
          <div class="bars-container">
            @for (item of computedData(); track item.label) {
              <div class="bar-col">
                <div class="bar-value-tooltip">{{ item.value | number:'1.0-0' }}</div>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    [style.height.%]="item.percent"
                    [style.background-color]="item.color || defaultColor"
                  ></div>
                </div>
                <span class="bar-label" [title]="item.label">{{ item.label }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .mini-chart-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .chart-header {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .chart-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .chart-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
    }
    .chart-body {
      min-height: 170px;
      display: flex;
      align-items: flex-end;
    }
    .chart-empty {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .bars-container {
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      gap: 1rem;
      width: 100%;
      height: 140px;
      padding-top: 1.5rem;
    }
    .bar-col {
      flex: 1;
      max-width: 90px;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      position: relative;
      cursor: pointer;

      &:hover .bar-value-tooltip {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .bar-value-tooltip {
      position: absolute;
      top: -1.6rem;
      background: #1e293b;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      opacity: 0;
      transform: translateY(4px);
      transition: all 0.15s ease;
      pointer-events: none;
      white-space: nowrap;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    .bar-track {
      width: 100%;
      max-width: 44px;
      height: 100%;
      background: #f1f5f9;
      border-radius: 0.375rem 0.375rem 0 0;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }
    .bar-fill {
      width: 100%;
      border-radius: 0.375rem 0.375rem 0 0;
      transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      min-height: 4px;
    }
    .bar-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: #475569;
      margin-top: 0.6rem;
      white-space: nowrap;
      text-align: center;
      width: 100%;
    }
  `]
})
export class MiniBarChartComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() data: ChartDataPoint[] = [];
  @Input() defaultColor: string = '#0284c7';

  computedData = computed(() => {
    if (!this.data || this.data.length === 0) return [];
    const maxVal = Math.max(...this.data.map(d => d.value), 1);
    return this.data.map(d => ({
      ...d,
      percent: Math.round((d.value / maxVal) * 100)
    }));
  });
}
