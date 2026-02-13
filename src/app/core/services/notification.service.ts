import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationSignal = signal<AppNotification | null>(null);
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  readonly notification = this.notificationSignal.asReadonly();

  show(type: AppNotification['type'], message: string) {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }

    this.notificationSignal.set({ type, message });

    this.clearTimer = setTimeout(() => {
      this.notificationSignal.set(null);
      this.clearTimer = null;
    }, 4500);
  }

  clear() {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
    this.notificationSignal.set(null);
  }
}
