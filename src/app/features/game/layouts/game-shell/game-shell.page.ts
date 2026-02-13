import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface SaveGameSummary {
  id: string;
  name: string;
  currentDate: string;
  currentSeasonYear: number;
}

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-game-shell-page',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <aside
        class="fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-slate-800 bg-slate-900 p-3 transition-all duration-200"
        [class.w-[280px]]="!isCollapsed()"
        [class.w-[88px]]="isCollapsed()"
      >
        <div
          class="mb-4 flex items-center"
          [class.justify-between]="!isCollapsed()"
          [class.justify-center]="isCollapsed()"
        >
          @if (!isCollapsed()) {
            <h1 class="text-sm font-bold uppercase tracking-wide text-slate-300">BitFoot</h1>
          }
          <button
            type="button"
            (click)="toggleSidebar()"
            class="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            [attr.title]="isCollapsed() ? 'Expandir menu' : 'Colapsar menu'"
          >
            {{ isCollapsed() ? '»' : '«' }}
          </button>
        </div>
        <div class="mb-3 border-t border-slate-800"></div>

        @for (group of navGroups; track group.title) {
          @if (!isCollapsed()) {
            <h2 class="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {{ group.title }}
            </h2>
          }
          <div class="mb-4 flex flex-col gap-1 text-sm">
            @for (item of group.items; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-slate-800 text-emerald-300"
                class="flex rounded py-2 hover:bg-slate-800"
                [class.justify-center]="isCollapsed()"
                [class.px-2]="isCollapsed()"
                [class.gap-0]="isCollapsed()"
                [class.items-center]="isCollapsed()"
                [class.items-start]="!isCollapsed()"
                [class.gap-3]="!isCollapsed()"
                [class.px-3]="!isCollapsed()"
                [attr.title]="item.label"
              >
                <span
                  class="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-[11px] font-bold text-slate-200"
                >
                  {{ item.icon }}
                </span>
                @if (!isCollapsed()) {
                  <span>{{ item.label }}</span>
                }
              </a>
            }
          </div>
        }

        <div class="mt-auto border-t border-slate-800 pt-3">
          @if (!isCollapsed()) {
            <p class="text-xs text-slate-400">{{ saveGame()?.name || 'Sem save' }}</p>
            <p class="text-xs text-slate-500">
              {{ saveGame()?.currentDate }} • T{{ saveGame()?.currentSeasonYear }}
            </p>
          }
          @if (isCollapsed()) {
            <p class="text-center text-xs text-slate-400" title="Save atual">🎮</p>
          }
        </div>
      </aside>

      <!-- <header
        class="fixed right-0 top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur"
        [style.left.px]="isCollapsed() ? 88 : 280"
      >
        <div class="px-6 py-4">
          <h2 class="text-lg font-bold">{{ saveGame()?.name || 'BitFoot' }}</h2>
          @if (saveGame()) {
            <p class="text-sm text-slate-400">{{ saveGame()?.currentDate }} • Temporada {{ saveGame()?.currentSeasonYear }}</p>
          }
        </div>
      </header> -->

      <section
        class="game-content-host min-h-screen px-6 pb-8 pt-4 transition-all duration-200"
        [style.marginLeft.px]="isCollapsed() ? 88 : 280"
      >
        <section>
          <router-outlet />
        </section>
      </section>
    </main>
  `,
  styles: [
    `
      :host ::ng-deep .game-content-host > section > * > main,
      :host ::ng-deep .game-content-host > section > main {
        min-height: auto !important;
        background: transparent !important;
        padding: 0 !important;
      }

      :host ::ng-deep .game-content-host > section > * > main > section,
      :host ::ng-deep .game-content-host > section > main > section {
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `,
  ],
})
export class GameShellPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly saveGame = signal<SaveGameSummary | null>(null);
  readonly isCollapsed = signal(false);
  readonly navGroups: NavGroup[] = [
    {
      title: 'Gerenciamento do Time',
      items: [
        { label: 'Dashboard do Time', route: '/dashboard', icon: 'DT' },
        { label: 'Elenco', route: '/squad', icon: 'EL' },
        { label: 'Táticas', route: '/tactics', icon: 'TA' },
        { label: 'Finanças', route: '/finances', icon: 'FI' },
        { label: 'Infraestrutura', route: '/infrastructure', icon: 'IN' },
        { label: 'Transferências', route: '/transfers', icon: 'TR' },
        { label: 'Competições', route: '/competitions', icon: 'CO' },
        { label: 'Contratos', route: '/contracts', icon: 'CT' },
        { label: 'Categorias de Base', route: '/youth-academy', icon: 'CB' },
        { label: 'Resumo de Temporada', route: '/season-summary', icon: 'RT' },
      ],
    },
    {
      title: 'Carreira',
      items: [
        { label: 'Dashboard de Carreira', route: '/career', icon: 'CA' },
        { label: 'Estatísticas da Temporada', route: '/season-stats', icon: 'ET' },
        { label: 'Rankings de Jogadores', route: '/player-rankings', icon: 'RJ' },
        { label: 'Histórico de Campeões', route: '/champions-history', icon: 'HC' },
        { label: 'Recordes', route: '/records', icon: 'RC' },
      ],
    },
    {
      title: 'Configurações',
      items: [
        { label: 'Trocar Save', route: '/load-game', icon: 'SV' },
        { label: 'Sair para Menu', route: '/menu', icon: 'EX' },
      ],
    },
  ];

  toggleSidebar() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  ngOnInit() {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) {
      void this.router.navigateByUrl('/menu');
      return;
    }

    this.api.get<SaveGameSummary>(`save-games/${saveId}`).subscribe({
      next: (save) => this.saveGame.set(save),
      error: () => void this.router.navigateByUrl('/menu'),
    });
  }
}
