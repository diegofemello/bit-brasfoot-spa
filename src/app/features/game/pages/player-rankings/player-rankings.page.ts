import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface RankingPlayer {
  position: number;
  name: string;
  clubName: string;
  overall: number;
  potential: number;
  value: number;
}

interface RankingsResponse {
  rankings: {
    byOverall: RankingPlayer[];
    byPotential: RankingPlayer[];
    byMarketValue: RankingPlayer[];
  };
}

@Component({
  selector: 'app-player-rankings-page',
  imports: [CommonModule],
  template: `
    <main class="text-slate-100">
      <section class="flex flex-col gap-5">
        <div
          class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
        >
          <div>
            <h1 class="text-2xl font-bold">Rankings Globais</h1>
            <p class="text-xs text-slate-400">
              Top jogadores por overall, potencial e valor de mercado.
            </p>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-sm font-semibold uppercase text-slate-300">Overall</h2>
            <div class="space-y-2 text-sm">
              @for (item of rankings()?.rankings?.byOverall ?? []; track item.name) {
                <div class="rounded bg-slate-950 px-3 py-2">
                  <p class="font-semibold">{{ item.position }}º {{ item.name }}</p>
                  <p class="text-xs text-slate-400">{{ item.clubName }} • OVR {{ item.overall }}</p>
                </div>
              }
            </div>
          </article>

          <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-sm font-semibold uppercase text-slate-300">Potencial</h2>
            <div class="space-y-2 text-sm">
              @for (item of rankings()?.rankings?.byPotential ?? []; track item.name) {
                <div class="rounded bg-slate-950 px-3 py-2">
                  <p class="font-semibold">{{ item.position }}º {{ item.name }}</p>
                  <p class="text-xs text-slate-400">
                    {{ item.clubName }} • POT {{ item.potential }}
                  </p>
                </div>
              }
            </div>
          </article>

          <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-sm font-semibold uppercase text-slate-300">Valor de Mercado</h2>
            <div class="space-y-2 text-sm">
              @for (item of rankings()?.rankings?.byMarketValue ?? []; track item.name) {
                <div class="rounded bg-slate-950 px-3 py-2">
                  <p class="font-semibold">{{ item.position }}º {{ item.name }}</p>
                  <p class="text-xs text-slate-400">
                    {{ item.clubName }} • {{ formatCurrency(item.value) }}
                  </p>
                </div>
              }
            </div>
          </article>
        </div>
      </section>
    </main>
  `,
})
export class PlayerRankingsPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly rankings = signal<RankingsResponse | null>(null);

  ngOnInit() {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.api.get<RankingsResponse>(`stats/save/${saveId}/rankings`).subscribe({
      next: (response) => this.rankings.set(response),
    });
  }

  formatCurrency(value: number) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${Math.round(value / 1000)}K`;
  }
}
