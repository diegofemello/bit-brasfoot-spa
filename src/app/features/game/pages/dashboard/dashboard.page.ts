import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaginatedResult } from '../../../../core/models/paginated-result.model';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';
import { NotificationService } from '../../../../core/services/notification.service';

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

interface TransferProposalNotification {
  id: string;
  type: 'purchase' | 'sale' | 'loan' | 'swap' | 'release';
  amount: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'canceled';
  player: { name: string };
  fromClub: { name: string } | null;
  toClub: { name: string } | null;
}

interface TransferNews {
  id: string;
  headline: string;
  status: 'accepted' | 'rejected' | 'countered';
  amount: number | null;
  updatedAt: string;
}

interface JobOffer {
  id: string;
  clubId: string;
  clubName: string;
  leagueName: string;
  countryName: string;
  stadiumName: string;
  budget: number;
  monthlySalaryOffer: number;
  projectScore: number;
  rationale: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <nav class="border-b border-slate-800 bg-slate-900">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-bold">{{ saveGame()?.name || 'BitFoot' }}</h1>
            @if (saveGame()) {
              <span class="text-sm text-slate-400">
                {{ saveGame()?.currentDate }} • Temporada {{ saveGame()?.currentSeasonYear }}
              </span>
            }
          </div>
          <div class="flex items-center gap-4">
            <a routerLink="/menu" class="text-sm text-slate-400 hover:text-slate-200">
              Menu Principal
            </a>
          </div>
        </div>
      </nav>

      <section class="mx-auto max-w-7xl px-6 py-8">
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
              routerLink="/select-club"
              class="mt-4 inline-block text-emerald-400 hover:text-emerald-300"
            >
              Selecionar Clube
            </a>
          </div>
        }

        @if (club()) {
          <div class="flex flex-col gap-6">
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-10">
              <a
                routerLink="/squad"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Elenco
              </a>
              <a
                routerLink="/tactics"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Táticas
              </a>
              <a
                routerLink="/finances"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Finanças
              </a>
              <a
                routerLink="/infrastructure"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Infraestrutura
              </a>
              <a
                routerLink="/transfers"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Transferências
              </a>
              <a
                routerLink="/competitions"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Competições
              </a>
              <a
                routerLink="/contracts"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Contratos
              </a>
              <a
                routerLink="/youth-academy"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Categorias de Base
              </a>
              <a
                routerLink="/season-summary"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Resumo de Temporada
              </a>
              <a
                routerLink="/load-game"
                class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold hover:border-emerald-400"
              >
                Trocar Save
              </a>
            </div>

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
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <p class="text-xs text-slate-400">Treino</p>
                  <p class="text-lg font-bold">Nível {{ infrastructure()?.trainingLevel }}</p>
                </div>
                <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <p class="text-xs text-slate-400">Base</p>
                  <p class="text-lg font-bold">Nível {{ infrastructure()?.youthLevel }}</p>
                </div>
                <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <p class="text-xs text-slate-400">Médico</p>
                  <p class="text-lg font-bold">Nível {{ infrastructure()?.medicalLevel }}</p>
                </div>
                <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <p class="text-xs text-slate-400">Estádio</p>
                  <p class="text-lg font-bold">Nível {{ infrastructure()?.stadiumLevel }}</p>
                </div>
              </div>
            }

            <div class="grid gap-4 lg:grid-cols-3">
              <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h3 class="mb-2 text-sm font-semibold text-slate-300">Propostas automáticas recebidas</h3>
                <p class="mb-2 text-xs text-slate-400">Pendentes: {{ incomingAutoProposals().length }}</p>
                <div class="space-y-2">
                  @for (proposal of incomingAutoProposals().slice(0, 5); track proposal.id) {
                    <div class="rounded bg-slate-950 px-3 py-2 text-xs">
                      <p class="font-semibold text-slate-200">{{ proposal.player.name }}</p>
                      <p class="text-slate-400">
                        {{ proposal.fromClub?.name || 'Clube IA' }} • {{ proposal.type }}
                        @if (proposal.amount) {
                          • {{ formatCurrency(proposal.amount) }}
                        }
                      </p>
                    </div>
                  }
                  @if (incomingAutoProposals().length === 0) {
                    <p class="text-xs text-slate-500">Sem novas propostas automáticas no momento.</p>
                  }
                </div>
              </div>

              <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h3 class="mb-2 text-sm font-semibold text-slate-300">Notícias de transferências (IA)</h3>
                <div class="space-y-2">
                  @for (news of transferNews(); track news.id) {
                    <div class="rounded bg-slate-950 px-3 py-2 text-xs">
                      <p class="text-slate-200">{{ news.headline }}</p>
                      <p class="text-slate-500">{{ formatDateTime(news.updatedAt) }}</p>
                    </div>
                  }
                  @if (transferNews().length === 0) {
                    <p class="text-xs text-slate-500">Sem notícias recentes de negociações entre clubes da IA.</p>
                  }
                </div>
              </div>

              <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h3 class="mb-2 text-sm font-semibold text-slate-300">Propostas de emprego</h3>
                <div class="space-y-2">
                  @for (offer of jobOffers(); track offer.id) {
                    <div class="rounded bg-slate-950 px-3 py-2 text-xs">
                      <p class="font-semibold text-slate-200">{{ offer.clubName }}</p>
                      <p class="text-slate-400">{{ offer.countryName }} • {{ offer.leagueName }}</p>
                      <p class="text-slate-500">
                        Projeto {{ offer.projectScore }} • Oferta {{ formatCurrency(offer.monthlySalaryOffer) }}/mês
                      </p>
                      <p class="mt-1 text-slate-500">{{ offer.rationale }}</p>
                    </div>
                  }
                  @if (jobOffers().length === 0) {
                    <p class="text-xs text-slate-500">Sem propostas de emprego no momento.</p>
                  }
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <h3 class="mb-4 text-xl font-bold">Elenco</h3>
              @if (players().length === 0) {
                <div class="text-center text-slate-400">Nenhum jogador no elenco.</div>
              }
              <div class="grid gap-2">
                @for (player of players(); track player.id) {
                  <div
                    class="flex items-center justify-between rounded-lg bg-slate-950 px-4 py-3 hover:bg-slate-900"
                  >
                    <div class="flex items-center gap-4">
                      <div
                        class="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800"
                      >
                        <span class="text-sm font-bold">{{ player.position }}</span>
                      </div>
                      <div>
                        <p class="font-semibold">{{ player.name }}</p>
                        <p class="text-sm text-slate-400">
                          {{ player.age }} anos • {{ player.nationality }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-6">
                      <div class="text-center">
                        <p class="text-xs text-slate-400">OVR</p>
                        <p
                          class="text-lg font-bold"
                          [class.text-emerald-400]="player.overall >= 80"
                          [class.text-yellow-400]="player.overall >= 70 && player.overall < 80"
                          [class.text-slate-400]="player.overall < 70"
                        >
                          {{ player.overall }}
                        </p>
                      </div>
                      <div class="text-center">
                        <p class="text-xs text-slate-400">POT</p>
                        <p class="text-lg font-bold text-slate-500">{{ player.potential }}</p>
                      </div>
                      <div class="text-right">
                        <p class="text-xs text-slate-400">Valor</p>
                        <p class="text-sm font-semibold">{{ formatCurrency(player.value) }}</p>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </section>
    </main>
  `,
})
export class DashboardPage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  readonly saveGame = signal<SaveGame | null>(null);
  readonly club = signal<Club | null>(null);
  readonly players = signal<Player[]>([]);
  readonly finance = signal<FinanceAccount | null>(null);
  readonly infrastructure = signal<InfrastructureState | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly incomingAutoProposals = signal<TransferProposalNotification[]>([]);
  readonly transferNews = signal<TransferNews[]>([]);
  readonly jobOffers = signal<JobOffer[]>([]);

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
        }

        this.loadFinance(save.id);
        this.loadInfrastructure(save.id);
        this.loadAiNotifications(save.id);
        this.loadTransferNews(save.id);
        this.loadJobOffers(save.id);
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

  loadAiNotifications(saveGameId: string) {
    this.apiService
      .get<PaginatedResult<TransferProposalNotification>>('transfers/proposals', {
        saveGameId,
        scope: 'sent',
        page: 1,
        limit: 20,
      })
      .subscribe({
        next: (result) => {
          const currentCount = result.data.length;
          const key = `bitfoot.autoProposals.${saveGameId}`;
          const previousCountRaw = window.localStorage.getItem(key);
          const previousCount = previousCountRaw ? Number(previousCountRaw) : 0;

          this.incomingAutoProposals.set(result.data);

          if (currentCount > previousCount) {
            const delta = currentCount - previousCount;
            this.notificationService.show(
              'info',
              `${delta} nova(s) proposta(s) automática(s) de clubes da IA recebida(s).`,
            );
          }

          window.localStorage.setItem(key, String(currentCount));
        },
      });
  }

  loadTransferNews(saveGameId: string) {
    this.apiService
      .get<PaginatedResult<TransferNews>>('transfers/ai/news', {
        saveGameId,
        page: 1,
        limit: 8,
      })
      .subscribe({
        next: (result) => this.transferNews.set(result.data),
      });
  }

  loadJobOffers(saveGameId: string) {
    this.apiService
      .get<PaginatedResult<JobOffer>>('transfers/ai/job-offers', {
        saveGameId,
        page: 1,
        limit: 5,
      })
      .subscribe({
        next: (result) => this.jobOffers.set(result.data),
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

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('pt-BR');
  }
}
