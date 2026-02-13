import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';

interface PlayerStatsResponse {
  player: {
    id: string;
    name: string;
    age: number;
    nationality: string;
    position: string;
    overall: number;
    potential: number;
    value: number;
    salary: number;
  };
  summary: {
    averageRating: number;
    goals: number;
    assists: number;
    matches: number;
  };
  formHistory: Array<{ match: number; rating: number }>;
}

@Component({
  selector: 'app-player-detail-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-10">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Detalhes do Jogador</h1>
          <a routerLink="/squad" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (stats()) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 class="text-xl font-bold">{{ stats()?.player?.name }}</h2>
            <p class="text-sm text-slate-400">
              {{ stats()?.player?.position }} • {{ stats()?.player?.age }} anos •
              {{ stats()?.player?.nationality }}
            </p>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-lg bg-slate-950 px-3 py-2">
                <p class="text-xs text-slate-400">Overall</p>
                <p class="text-lg font-bold">{{ stats()?.player?.overall }}</p>
              </div>
              <div class="rounded-lg bg-slate-950 px-3 py-2">
                <p class="text-xs text-slate-400">Potencial</p>
                <p class="text-lg font-bold">{{ stats()?.player?.potential }}</p>
              </div>
              <div class="rounded-lg bg-slate-950 px-3 py-2">
                <p class="text-xs text-slate-400">Valor</p>
                <p class="text-lg font-bold">{{ formatCurrency(stats()?.player?.value || 0) }}</p>
              </div>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
              <p class="text-xs text-slate-400">Nota média</p>
              <p class="text-lg font-bold">{{ stats()?.summary?.averageRating?.toFixed(2) }}</p>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
              <p class="text-xs text-slate-400">Gols</p>
              <p class="text-lg font-bold">{{ stats()?.summary?.goals }}</p>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
              <p class="text-xs text-slate-400">Assistências</p>
              <p class="text-lg font-bold">{{ stats()?.summary?.assists }}</p>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
              <p class="text-xs text-slate-400">Partidas</p>
              <p class="text-lg font-bold">{{ stats()?.summary?.matches }}</p>
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-3 text-lg font-semibold">Histórico recente</h3>
            <div class="grid gap-2">
              @for (item of stats()?.formHistory || []; track item.match) {
                <div class="flex items-center justify-between rounded bg-slate-950 px-3 py-2 text-sm">
                  <span>Jogo {{ item.match }}</span>
                  <span>{{ item.rating.toFixed(1) }}</span>
                </div>
              }
            </div>
          </div>
        }
      </section>
    </main>
  `,
})
export class PlayerDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(ApiService);

  readonly stats = signal<PlayerStatsResponse | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.apiService.get<PlayerStatsResponse>(`players/${id}/stats`).subscribe({
      next: (stats) => this.stats.set(stats),
    });
  }

  formatCurrency(value: number) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${Math.round(value / 1000)}K`;
  }
}
