import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly activeRequestsSignal = signal(0);

  readonly isLoading = computed(() => this.activeRequestsSignal() > 0);

  start() {
    this.activeRequestsSignal.update((value) => value + 1);
  }

  stop() {
    this.activeRequestsSignal.update((value) => (value > 0 ? value - 1 : 0));
  }
}
