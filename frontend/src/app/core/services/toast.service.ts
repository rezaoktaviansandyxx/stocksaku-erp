import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 4000
    };

    this.toasts.update(current => [...current, newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newToast.duration);
    }
  }

  success(message: string, title: string = 'Berhasil') {
    this.show({ type: 'success', title, message });
  }

  error(message: string, title: string = 'Terjadi Kesalahan') {
    this.show({ type: 'error', title, message, duration: 5000 });
  }

  warning(message: string, title: string = 'Peringatan') {
    this.show({ type: 'warning', title, message });
  }

  info(message: string, title: string = 'Informasi') {
    this.show({ type: 'info', title, message });
  }

  dismiss(id: string) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
