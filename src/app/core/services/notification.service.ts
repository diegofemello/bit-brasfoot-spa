import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationSignal = signal<AppNotification | null>(null);

  readonly notification = this.notificationSignal.asReadonly();

  show(type: AppNotification['type'], message: string) {
    this.notificationSignal.set({ type, message });
  }

  clear() {
    this.notificationSignal.set(null);
  }
}
