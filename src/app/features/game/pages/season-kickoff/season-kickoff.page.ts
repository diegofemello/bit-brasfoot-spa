import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface SaveGameDetail {
  id: string;
  name: string;
  currentDate: string;
  currentSeasonYear: number;
  club: {
    id: string;
    name: string;
    league: {
      name: string;
      country: {
        name: string;
      };
    };
  } | null;
}

interface SaveCompetition {
  seasonId: string;
  competitionName: string;
  currentRound: number;
  totalRounds: number;
  status: 'ongoing' | 'finished';
}

@Component({
  selector: 'app-season-kickoff-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <section class="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Início da Nova Temporada</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Dashboard</a>
        </div>

        @if (save()) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p class="text-sm text-slate-400">Save</p>
            <h2 class="text-xl font-semibold">{{ save()?.name }}</h2>
            <p class="mt-1 text-sm">
              Temporada <span class="font-semibold text-emerald-300">{{ save()?.currentSeasonYear }}</span>
              • Data atual {{ save()?.currentDate }}
            </p>
            @if (save()?.club) {
              <p class="mt-2 text-sm text-slate-300">
                Clube: {{ save()?.club?.name }} • {{ save()?.club?.league?.name }} ({{ save()?.club?.league?.country?.name }})
              </p>
            }
          </div>
        }

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 class="mb-3 text-lg font-semibold">Competições ativas da temporada</h3>
          <div class="grid gap-2">
            @for (item of competitions(); track item.seasonId) {
              <div class="rounded bg-slate-950 px-3 py-2 text-sm">
                <p class="font-semibold">{{ item.competitionName }}</p>
                <p class="text-xs text-slate-400">
                  Rodada {{ item.currentRound }}/{{ item.totalRounds }} • {{ item.status === 'ongoing' ? 'Em andamento' : 'Finalizada' }}
                </p>
              </div>
            }
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a routerLink="/competitions" class="rounded border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400">Ver Competições</a>
          <a routerLink="/season-summary" class="rounded border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400">Ver Resumo</a>
          <a routerLink="/contracts" class="rounded border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400">Renovar Contratos</a>
          <a routerLink="/youth-academy" class="rounded border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400">Categorias de Base</a>
        </div>
      </section>
    </main>
  `,
})
export class SeasonKickoffPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);

  readonly save = signal<SaveGameDetail | null>(null);
  readonly competitions = signal<SaveCompetition[]>([]);

  ngOnInit() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) return;

    this.api.get<SaveGameDetail>(`save-games/${saveGameId}`).subscribe({
      next: (response) => this.save.set(response),
    });

    this.api.get<SaveCompetition[]>(`competitions/save/${saveGameId}`).subscribe({
      next: (response) => this.competitions.set(response),
    });
  }
}
