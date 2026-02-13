import { Component, input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="border-b border-slate-800 bg-slate-900 px-6 py-4 text-slate-100">
      <h1 class="text-lg font-bold">{{ title() }}</h1>
    </header>
  `,
})
export class HeaderComponent {
  readonly title = input('BitFoot');
}
