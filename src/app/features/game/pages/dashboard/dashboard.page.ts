import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaginatedResult } from '../../../../core/models/paginated-result.model';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface Club {
  id: string;
  name: string;
  abbreviation: string;
  stadiumName: string;
  stadiumCapacity: number;
  budget: number;
  league: {
    name: string;
    country: {
      name: string;
      flagEmoji: string;
    };
  };
}

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

interface SaveGame {
  id: string;
  name: string;
  currentDate: string;
  currentSeasonYear: number;
  club: Club | null;
}

interface FinanceAccount {
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

interface InfrastructureState {
  trainingLevel: number;
  youthLevel: number;
  medicalLevel: number;
  stadiumLevel: number;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="flex flex-col gap-6">
        <h2 class="text-2xl font-bold">Dashboard de Gerenciamento do Time</h2>
        @if (!saveGame()) {
          <div class="text-center">
            <p class="text-slate-400">Carregando...</p>
          </div>
        }

        @if (errorMessage()) {
          <div
            class="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-rose-200"
          >
            {{ errorMessage() }}
          </div>
        }

        @if (saveGame() && !saveGame()?.club) {
          <div class="text-center">
            <p class="text-slate-400">Nenhum clube associado a este save.</p>
            <a
              routerLink="/career"
              class="mt-4 inline-block text-emerald-400 hover:text-emerald-300"
            >
              Ir para dashboard de carreira
            </a>
          </div>
        }

        @if (club()) {
          <div class="flex flex-col gap-6">
              <div class="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-3">
                    <span class="text-3xl">{{ club()?.league?.country?.flagEmoji }}</span>
                    <div>
                      <h2 class="text-2xl font-bold">{{ club()?.name }}</h2>
                      <p class="text-sm text-slate-400">
                        {{ club()?.league?.country?.name }} • {{ club()?.league?.name }}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm text-slate-400">Orçamento</p>
                  <p class="text-2xl font-bold text-emerald-400">
                    {{ formatCurrency(club()?.budget || 0) }}
                  </p>
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-lg bg-slate-950 px-4 py-3">
                  <p class="text-sm text-slate-400">Estádio</p>
                  <p class="font-semibold">{{ club()?.stadiumName }}</p>
                  <p class="text-sm text-slate-500">
                    Capacidade: {{ (club()?.stadiumCapacity || 0).toLocaleString() }}
                  </p>
                </div>
                <div class="rounded-lg bg-slate-950 px-4 py-3">
                  <p class="text-sm text-slate-400">Elenco</p>
                  <p class="font-semibold">{{ players().length }} jogadores</p>
                  <p class="text-sm text-slate-500">
                    Overall médio: {{ calculateAverageOverall() }}
                  </p>
                </div>
              </div>
              </div>

              @if (finance()) {
                <div class="grid gap-4 sm:grid-cols-3">
                  <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                    <p class="text-xs text-slate-400">Saldo</p>
                    <p class="text-lg font-bold text-emerald-400">
                      {{ formatCurrency(finance()?.balance || 0) }}
                    </p>
                  </div>
                  <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                    <p class="text-xs text-slate-400">Receita mensal</p>
                    <p class="text-lg font-bold">{{ formatCurrency(finance()?.monthlyIncome || 0) }}</p>
                  </div>
                  <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                    <p class="text-xs text-slate-400">Despesas mensais</p>
                    <p class="text-lg font-bold">{{ formatCurrency(finance()?.monthlyExpense || 0) }}</p>
                  </div>
                </div>
              }

              @if (infrastructure()) {
                <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <h3 class="mb-3 text-sm font-semibold text-slate-300">Infraestrutura do Clube</h3>
                  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div class="rounded bg-slate-950 px-4 py-3">
                      <p class="text-xs text-slate-400">Treino</p>
                      <p class="text-lg font-bold">Nível {{ infrastructure()?.trainingLevel }}</p>
                    </div>
                    <div class="rounded bg-slate-950 px-4 py-3">
                      <p class="text-xs text-slate-400">Base</p>
                      <p class="text-lg font-bold">Nível {{ infrastructure()?.youthLevel }}</p>
                    </div>
                    <div class="rounded bg-slate-950 px-4 py-3">
                      <p class="text-xs text-slate-400">Médico</p>
                      <p class="text-lg font-bold">Nível {{ infrastructure()?.medicalLevel }}</p>
                    </div>
                    <div class="rounded bg-slate-950 px-4 py-3">
                      <p class="text-xs text-slate-400">Estádio</p>
                      <p class="text-lg font-bold">Nível {{ infrastructure()?.stadiumLevel }}</p>
                    </div>
                  </div>
                </div>
              }

              <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h3 class="mb-3 text-sm font-semibold text-slate-300">Acesso rápido do time</h3>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <a routerLink="/squad" class="rounded bg-slate-950 px-3 py-2 text-sm hover:bg-slate-800">Gerenciar Elenco</a>
                  <a routerLink="/tactics" class="rounded bg-slate-950 px-3 py-2 text-sm hover:bg-slate-800">Ajustar Táticas</a>
                  <a routerLink="/transfers" class="rounded bg-slate-950 px-3 py-2 text-sm hover:bg-slate-800">Mercado de Transferências</a>
                </div>
              </div>
          </div>
        }
    </section>
  `,
})
export class DashboardPage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly saveGame = signal<SaveGame | null>(null);
  readonly club = signal<Club | null>(null);
  readonly players = signal<Player[]>([]);
  readonly finance = signal<FinanceAccount | null>(null);
  readonly infrastructure = signal<InfrastructureState | null>(null);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) {
      void this.router.navigateByUrl('/menu');
      return;
    }

    this.loadSaveGame(saveGameId);
  }

  loadSaveGame(saveGameId: string) {
    this.apiService.get<SaveGame>(`save-games/${saveGameId}`).subscribe({
      next: (save) => {
        this.saveGame.set(save);
        if (save.club) {
          this.club.set(save.club);
          this.gameState.selectClub(save.club.id);
          this.loadPlayers(save.club.id);
        } else {
          this.club.set(null);
          this.players.set([]);
          this.gameState.clearSelectedClub();
        }

        this.loadFinance(save.id);
        this.loadInfrastructure(save.id);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar o save.');
      },
    });
  }

  loadPlayers(clubId: string) {
    this.apiService
      .get<PaginatedResult<Player>>(`players/club/${clubId}`, { page: 1, limit: 50 })
      .subscribe({
        next: (result) => this.players.set(result.data),
        error: () => {
          this.errorMessage.set('Erro ao carregar jogadores.');
        },
      });
  }

  loadFinance(saveGameId: string) {
    this.apiService.get<FinanceAccount>(`finances/save/${saveGameId}/account`).subscribe({
      next: (finance) => this.finance.set(finance),
    });
  }

  loadInfrastructure(saveGameId: string) {
    this.apiService.get<InfrastructureState>(`infrastructures/save/${saveGameId}`).subscribe({
      next: (infrastructure) => this.infrastructure.set(infrastructure),
    });
  }

  calculateAverageOverall(): number {
    const playerList = this.players();
    if (playerList.length === 0) return 0;
    const sum = playerList.reduce((acc, p) => acc + p.overall, 0);
    return Math.round(sum / playerList.length);
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  }

}
