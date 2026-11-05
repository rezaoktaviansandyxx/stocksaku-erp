import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AppIconComponent } from './app-icon';

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    @if (isOpen) {
      <div class="scanner-overlay" (click)="onBackdropClick($event)">
        <div class="scanner-modal" role="dialog" aria-modal="true">
          <div class="scanner-header">
            <div class="scanner-title-box">
              <span class="icon-pill">
                <app-icon name="camera" [size]="18" />
              </span>
              <div>
                <h3 class="scanner-title">{{ title }}</h3>
                <p class="scanner-subtitle">Arahkan barcode 1D ke dalam kotak kamera</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeScanner()" aria-label="Tutup">✕</button>
          </div>

          <div class="scanner-body">
            @if (errorMessage()) {
              <div class="scanner-error-banner">
                <app-icon name="alert-triangle" [size]="16" />
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <div class="reader-container">
              <div #scannerElement id="barcode-reader-viewport"></div>
              @if (isStarting()) {
                <div class="scanner-loading-overlay">
                  <div class="spinner"></div>
                  <span>Mengaktifkan kamera...</span>
                </div>
              }
            </div>

            <div class="scanner-instructions">
              <p>💡 Mendukung barcode 1D: CODE 128, EAN-13, EAN-8, UPC-A, UPC-E.</p>
            </div>
          </div>

          <div class="scanner-actions">
            <button type="button" class="btn-cancel" (click)="closeScanner()">
              Tutup
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .scanner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal-scanner, 3000);
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }

    .scanner-modal {
      background: #ffffff;
      border-radius: 1rem;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleUp 0.2s ease-out;
    }

    .scanner-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .scanner-title-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .icon-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 0.5rem;
      background: #eff6ff;
      color: #2563eb;
    }

    .scanner-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      color: #0f172a;
    }

    .scanner-subtitle {
      margin: 0.15rem 0 0 0;
      font-size: 0.75rem;
      color: #64748b;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
      border-radius: 0.25rem;
      transition: color 0.15s;
    }
    .btn-close:hover {
      color: #334155;
    }

    .scanner-body {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .scanner-error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      border-radius: 0.5rem;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.825rem;
    }

    .reader-container {
      position: relative;
      min-height: 280px;
      background: #000;
      border-radius: 0.75rem;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #barcode-reader-viewport {
      width: 100%;
    }

    .scanner-loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: #f8fafc;
      font-size: 0.875rem;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #38bdf8;
      animation: spin 0.8s linear infinite;
    }

    .scanner-instructions {
      font-size: 0.78rem;
      color: #64748b;
      text-align: center;
      margin: 0;
    }

    .scanner-actions {
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
    }

    .btn-cancel {
      padding: 0.55rem 1.25rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      background: #fff;
      font-weight: 500;
      font-size: 0.875rem;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-cancel:hover {
      background: #f8fafc;
      color: #1e293b;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class BarcodeScannerComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() title = 'Scan Barcode';
  @Output() scanned = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('scannerElement') scannerElement?: ElementRef;

  isStarting = signal(false);
  errorMessage = signal<string | null>(null);

  private html5QrCode: Html5Qrcode | null = null;
  private isScanning = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        setTimeout(() => this.startScanner(), 50);
      } else {
        this.stopScanner();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('scanner-overlay')) {
      this.closeScanner();
    }
  }

  closeScanner(): void {
    this.stopScanner();
    this.closed.emit();
  }

  private async startScanner(): Promise<void> {
    this.errorMessage.set(null);
    this.isStarting.set(true);

    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode('barcode-reader-viewport', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          verbose: false,
        });
      }

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 180 },
        aspectRatio: 1.333,
      };

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          this.handleScanSuccess(decodedText);
        },
        () => {
          // Frame scan error / nothing in frame, ignore silently
        }
      );

      this.isScanning = true;
      this.isStarting.set(false);
    } catch (err: unknown) {
      this.isStarting.set(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        this.errorMessage.set('Izin kamera ditolak. Berikan izin kamera di browser Anda.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        this.errorMessage.set('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        this.errorMessage.set(`Gagal mengaktifkan kamera: ${msg}`);
      }
    }
  }

  private handleScanSuccess(text: string): void {
    if (!text) return;
    
    // Play a gentle beep audio feedback if available
    this.playBeep();

    this.scanned.emit(text.trim());
    this.closeScanner();
  }

  private playBeep(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not permitted or supported, skip silently
    }
  }

  private async stopScanner(): Promise<void> {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      } finally {
        this.isScanning = false;
        this.html5QrCode = null;
      }
    }
  }
}
