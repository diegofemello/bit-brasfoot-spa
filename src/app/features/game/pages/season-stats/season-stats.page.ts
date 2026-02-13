import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface SeasonStatsResponse {
  seasonYear: number;
  competition: { name: string };
  progress: { playedFixtures: number; totalFixtures: number };
  topScorers: Array<{ position: number; playerName: string; clubName: string; goals: number }>;
  topAssists: Array<{ position: number; playerName: string; clubName: string; assists: number }>;
  tableLeaders: Array<{
    position: number;
    clubName: string;
    points: number;
    played: number;
    goalDifference: number;
  }>;
}

@Component({
  selector: 'app-season-stats-page',
  imports: [CommonModule],
  template: `
    <main class="text-slate-100">
      <section class="flex flex-col gap-5">
        <div
          class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
        >
          <div>
            <h1 class="text-2xl font-bold">Estatísticas da Temporada</h1>
            <p class="text-xs text-slate-400">
              Números gerais da liga: gols, desempenho ofensivo e defesa.
            </p>
          </div>
        </div>

        @if (stats()) {
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p class="text-xs text-slate-400">Competição</p>
              <p class="text-lg font-semibold">{{ stats()?.competition?.name }}</p>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p class="text-xs text-slate-400">Temporada</p>
              <p class="text-lg font-semibold">{{ stats()?.seasonYear }}</p>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p class="text-xs text-slate-400">Partidas</p>
              <p class="text-lg font-semibold">
                {{ stats()?.progress?.playedFixtures }}/{{ stats()?.progress?.totalFixtures }}
              </p>
            </div>
          </div>

          <div class="grid gap-4 xl:grid-cols-3">
            <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 class="mb-3 text-sm font-semibold uppercase text-slate-300">Artilharia</h2>
              <div class="space-y-2 text-sm">
                @for (item of stats()?.topScorers ?? []; track item.playerName) {
                  <div class="rounded bg-slate-950 px-3 py-2">
                    <p class="font-semibold">{{ item.position }}º {{ item.playerName }}</p>
                    <p class="text-xs text-slate-400">
                      {{ item.clubName }} • {{ item.goals }} gols
                    </p>
                  </div>
                }
              </div>
            </article>

            <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 class="mb-3 text-sm font-semibold uppercase text-slate-300">Assistências</h2>
              <div class="space-y-2 text-sm">
                @for (item of stats()?.topAssists ?? []; track item.playerName) {
                  <div class="rounded bg-slate-950 px-3 py-2">
                    <p class="font-semibold">{{ item.position }}º {{ item.playerName }}</p>
                    <p class="text-xs text-slate-400">
                      {{ item.clubName }} • {{ item.assists }} assistências
                    </p>
                  </div>
                }
              </div>
            </article>

            <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 class="mb-3 text-sm font-semibold uppercase text-slate-300">Líderes da Tabela</h2>
              <div class="space-y-2 text-sm">
                @for (item of stats()?.tableLeaders ?? []; track item.clubName) {
                  <div class="rounded bg-slate-950 px-3 py-2">
                    <p class="font-semibold">{{ item.position }}º {{ item.clubName }}</p>
                    <p class="text-xs text-slate-400">
                      {{ item.points }} pts • {{ item.played }}j • SG {{ item.goalDifference }}
                    </p>
                  </div>
                }
              </div>
            </article>
          </div>
        }
      </section>
    </main>
  `,
})
export class SeasonStatsPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly stats = signal<SeasonStatsResponse | null>(null);

  ngOnInit() {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.api.get<SeasonStatsResponse>(`stats/save/${saveId}/season`).subscribe({
      next: (response) => this.stats.set(response),
    });
  }
}
