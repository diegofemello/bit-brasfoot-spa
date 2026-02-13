import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './core/services/loading.service';
import { NotificationService } from './core/services/notification.service';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingSpinnerComponent, ToastComponent],
  template: `
    <router-outlet />

    <div class="fixed right-4 top-4 z-50">
      <app-loading-spinner [visible]="loadingService.isLoading()" />
    </div>

    <app-toast
      [message]="notificationService.notification()?.message ?? null"
      [type]="notificationService.notification()?.type ?? 'info'"
    />
  `,
})
export class App {
  readonly loadingService = inject(LoadingService);
  readonly notificationService = inject(NotificationService);
}
