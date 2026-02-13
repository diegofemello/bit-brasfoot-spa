import { Component, input } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div
      class="fixed bottom-4 right-4 rounded-md border px-4 py-3 text-sm"
      [class.hidden]="!message()"
      [class.border-emerald-400]="type() === 'success'"
      [class.border-rose-400]="type() === 'error'"
      [class.border-sky-400]="type() === 'info'"
      [class.bg-slate-900]="true"
      [class.text-slate-100]="true"
    >
      {{ message() }}
    </div>
  `,
})
export class ToastComponent {
  readonly message = input<string | null>(null);
  readonly type = input<'success' | 'error' | 'info'>('info');
}
