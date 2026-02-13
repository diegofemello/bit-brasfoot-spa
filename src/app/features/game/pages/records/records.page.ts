import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface RecordsResponse {
  records: {
    biggestWin?: {
      score: string;
      winnerClubName: string;
      loserClubName: string;
      goalDifference: number;
    } | null;
    highestScoringMatch?: {
      score: string;
      homeClubName: string;
      awayClubName: string;
      totalGoals: number;
    } | null;
    bestLeagueCampaign?: {
      clubName: string;
      seasonYear: number;
      competitionName: string;
      points: number;
      wins: number;
      draws: number;
      losses: number;
      goalDifference: number;
    } | null;
    topScorerSeason?: {
      playerName: string;
      clubName: string;
      seasonYear: number;
      goals: number;
    } | null;
    mostTitledClub?: { clubName: string; titles: number } | null;
  };
}

@Component({
  selector: 'app-records-page',
  imports: [CommonModule],
  template: `
    <main class="text-slate-100">
      <section class="flex flex-col gap-5">
        <div
          class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
        >
          <div>
            <h1 class="text-2xl font-bold">Recordes</h1>
            <p class="text-xs text-slate-400">Maiores marcas acumuladas no save.</p>
          </div>
        </div>

        @if (records()) {
          <div class="grid gap-4 xl:grid-cols-2">
            <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 class="mb-2 text-sm font-semibold uppercase text-slate-300">Maior Vitória</h2>
              <p class="text-sm">
                {{ records()?.biggestWin?.winnerClubName }} {{ records()?.biggestWin?.score }}
                {{ records()?.biggestWin?.loserClubName }}
              </p>
              <p class="text-xs text-slate-400">
                Saldo: {{ records()?.biggestWin?.goalDifference }}
              </p>
            </article>

            <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 class="mb-2 text-sm font-semibold uppercase text-slate-300">
                Jogo com Mais Gols
              </h2>
              <p class="text-sm">
                {{ records()?.highestScoringMatch?.homeClubName }}
                {{ records()?.highestScoringMatch?.score }}
                {{ records()?.highestScoringMatch?.awayClubName }}
              </p>
              <p class="text-xs text-slate-400">
                Total de gols: {{ records()?.highestScoringMatch?.totalGoals }}
              </p>
            </article>

            <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 class="mb-2 text-sm font-semibold uppercase text-slate-300">
                Melhor Campanha de Liga
              </h2>
              <p class="text-sm">
                {{ records()?.bestLeagueCampaign?.clubName }} •
                {{ records()?.bestLeagueCampaign?.competitionName }}
                {{ records()?.bestLeagueCampaign?.seasonYear }}
              </p>
              <p class="text-xs text-slate-400">
                {{ records()?.bestLeagueCampaign?.points }} pts ({{
                  records()?.bestLeagueCampaign?.wins
                }}V {{ records()?.bestLeagueCampaign?.draws }}E
                {{ records()?.bestLeagueCampaign?.losses }}D)
              </p>
            </article>

            <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 class="mb-2 text-sm font-semibold uppercase text-slate-300">
                Artilheiro de Temporada
              </h2>
              <p class="text-sm">
                {{ records()?.topScorerSeason?.playerName }} ({{
                  records()?.topScorerSeason?.clubName
                }})
              </p>
              <p class="text-xs text-slate-400">
                {{ records()?.topScorerSeason?.goals }} gols •
                {{ records()?.topScorerSeason?.seasonYear }}
              </p>
            </article>

            <article class="rounded-xl border border-slate-800 bg-slate-900 p-4 xl:col-span-2">
              <h2 class="mb-2 text-sm font-semibold uppercase text-slate-300">
                Clube Mais Vencedor
              </h2>
              <p class="text-sm">{{ records()?.mostTitledClub?.clubName }}</p>
              <p class="text-xs text-slate-400">
                {{ records()?.mostTitledClub?.titles }} título(s)
              </p>
            </article>
          </div>
        }
      </section>
    </main>
  `,
})
export class RecordsPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly records = signal<RecordsResponse['records'] | null>(null);

  ngOnInit() {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.api.get<RecordsResponse>(`stats/save/${saveId}/records`).subscribe({
      next: (response) => this.records.set(response.records),
    });
  }
}
