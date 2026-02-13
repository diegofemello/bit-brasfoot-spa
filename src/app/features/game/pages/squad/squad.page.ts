import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaginatedResult } from '../../../../core/models/paginated-result.model';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: string;
  overall: number;
  potential: number;
  value: number;
  salary: number;
}

@Component({
  selector: 'app-squad-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-10">
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-2xl font-bold">Elenco</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200"
            >Voltar</a
          >
        </div>

        <div class="grid gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:grid-cols-4">
          <input
            type="text"
            [value]="searchName()"
            (input)="searchName.set($any($event.target).value)"
            placeholder="Buscar nome"
            class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <select
            [value]="positionFilter()"
            (change)="positionFilter.set($any($event.target).value)"
            class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="">Todas posições</option>
            @for (position of positions; track position) {
              <option [value]="position">{{ position }}</option>
            }
          </select>
          <select
            [value]="sortBy()"
            (change)="sortBy.set($any($event.target).value)"
            class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="overall">Ordenar por Overall</option>
            <option value="potential">Ordenar por Potencial</option>
            <option value="age">Ordenar por Idade</option>
            <option value="value">Ordenar por Valor</option>
          </select>
          <button
            type="button"
            (click)="load()"
            class="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Aplicar
          </button>
        </div>

        <div class="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <table class="min-w-full divide-y divide-slate-800">
            <thead class="bg-slate-950">
              <tr>
                <th class="px-3 py-2 text-left text-xs text-slate-400">Nome</th>
                <th class="px-3 py-2 text-left text-xs text-slate-400">Pos</th>
                <th class="px-3 py-2 text-left text-xs text-slate-400">Idade</th>
                <th class="px-3 py-2 text-left text-xs text-slate-400">OVR</th>
                <th class="px-3 py-2 text-left text-xs text-slate-400">POT</th>
                <th class="px-3 py-2 text-left text-xs text-slate-400">Valor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              @for (player of players(); track player.id) {
                <tr
                  class="cursor-pointer hover:bg-slate-800/40"
                  (click)="openPlayer(player.id)"
                >
                  <td class="px-3 py-2 text-sm">{{ player.name }}</td>
                  <td class="px-3 py-2 text-sm">{{ player.position }}</td>
                  <td class="px-3 py-2 text-sm">{{ player.age }}</td>
                  <td class="px-3 py-2 text-sm">{{ player.overall }}</td>
                  <td class="px-3 py-2 text-sm">{{ player.potential }}</td>
                  <td class="px-3 py-2 text-sm">{{ formatCurrency(player.value) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (players().length === 0) {
          <p class="text-sm text-slate-400">Nenhum jogador encontrado para os filtros atuais.</p>
        }

        @if (averageOverall()) {
          <p class="text-sm text-slate-300">Overall médio filtrado: {{ averageOverall() }}</p>
        }
      </section>
    </main>
  `,
})
export class SquadPage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly players = signal<Player[]>([]);
  readonly searchName = signal('');
  readonly positionFilter = signal('');
  readonly sortBy = signal<'overall' | 'potential' | 'age' | 'value'>('overall');
  readonly positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

  readonly averageOverall = computed(() => {
    if (this.players().length === 0) return 0;
    const sum = this.players().reduce((acc, player) => acc + player.overall, 0);
    return Math.round(sum / this.players().length);
  });

  ngOnInit() {
    this.load();
  }

  load() {
    const clubId = this.gameState.selectedClubId();
    if (!clubId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.apiService
      .get<PaginatedResult<Player>>('players', {
        page: 1,
        limit: 100,
        clubId,
        name: this.searchName() || '',
        position: this.positionFilter() || '',
        sortBy: this.sortBy(),
        sortOrder: 'DESC',
      })
      .subscribe({
        next: (result) => this.players.set(result.data),
      });
  }

  openPlayer(playerId: string) {
    void this.router.navigate(['/players', playerId]);
  }

  formatCurrency(value: number) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${Math.round(value / 1000)}K`;
  }
}
