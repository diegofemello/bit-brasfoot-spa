import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface ChampionsHistoryResponse {
  champions: Array<{
    seasonYear: number;
    competitionName: string;
    championClubName: string;
    source: 'table' | 'final';
  }>;
  titleRanking: Array<{ clubName: string; titles: number }>;
}

@Component({
  selector: 'app-champions-history-page',
  imports: [CommonModule],
  template: `
    <main class="text-slate-100">
      <section class="flex flex-col gap-5">
        <div
          class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
        >
          <div>
            <h1 class="text-2xl font-bold">Histórico de Campeões</h1>
            <p class="text-xs text-slate-400">
              Campeões por competição e ranking de títulos no save.
            </p>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-sm font-semibold uppercase text-slate-300">Campeões</h2>
            <div class="space-y-2 text-sm">
              @for (
                item of data()?.champions ?? [];
                track item.seasonYear + '-' + item.competitionName
              ) {
                <div class="rounded bg-slate-950 px-3 py-2">
                  <p class="font-semibold">{{ item.seasonYear }} • {{ item.competitionName }}</p>
                  <p class="text-xs text-slate-400">
                    {{ item.championClubName }} • {{ item.source === 'table' ? 'Tabela' : 'Final' }}
                  </p>
                </div>
              }
            </div>
          </article>

          <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-sm font-semibold uppercase text-slate-300">Ranking de Títulos</h2>
            <div class="space-y-2 text-sm">
              @for (item of data()?.titleRanking ?? []; track item.clubName) {
                <div class="rounded bg-slate-950 px-3 py-2">
                  <p class="font-semibold">{{ item.clubName }}</p>
                  <p class="text-xs text-slate-400">{{ item.titles }} título(s)</p>
                </div>
              }
            </div>
          </article>
        </div>
      </section>
    </main>
  `,
})
export class ChampionsHistoryPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly data = signal<ChampionsHistoryResponse | null>(null);

  ngOnInit() {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.api.get<ChampionsHistoryResponse>(`stats/save/${saveId}/champions`).subscribe({
      next: (response) => this.data.set(response),
    });
  }
}
