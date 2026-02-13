import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface SidebarItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <aside class="w-56 border-r border-slate-800 bg-slate-900 p-4 text-slate-200">
      <nav class="flex flex-col gap-2">
        @for (item of items(); track item.path) {
          <a [routerLink]="item.path" class="rounded px-3 py-2 text-sm hover:bg-slate-800">
            {{ item.label }}
          </a>
        }
      </nav>
    </aside>
  `,
})
export class SidebarComponent {
  readonly items = input<SidebarItem[]>([]);
}
