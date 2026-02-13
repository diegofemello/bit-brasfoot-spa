import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="flex items-center gap-2 text-slate-300">
        <span
          class="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400"
        ></span>
        <span class="text-sm">{{ label() }}</span>
      </div>
    }
  `,
})
export class LoadingSpinnerComponent {
  readonly visible = input(false);
  readonly label = input('Carregando...');
}
