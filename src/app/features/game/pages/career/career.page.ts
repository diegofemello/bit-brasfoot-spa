import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PaginatedResult } from '../../../../core/models/paginated-result.model';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface CareerOverview {
  saveId: string;
  managerName: string;
  currentSeasonYear: number;
  currentDate: string;
  currentClub: {
    id: string;
    name: string;
    league?: { name: string; country?: { name: string } };
  } | null;
  reputation: number;
  status: 'em-atividade' | 'sem-clube';
}

interface CareerHistoryItem {
  clubId: string;
  clubName: string;
  countryName: string | null;
  leagueName: string | null;
  fromDate: string;
  toDate: string | null;
  role: string;
}

interface JobOffer {
  id: string;
  clubId: string;
  clubName: string;
  countryName: string;
  leagueName: string;
  projectScore: number;
  monthlySalaryOffer: number;
  rationale: string;
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

interface ChampionsHistoryResponse {
  champions: Array<{
    seasonYear: number;
    competitionName: string;
    championClubId: string;
    championClubName: string;
  }>;
  titleRanking: Array<{
    clubId: string;
    clubName: string;
    titles: number;
  }>;
}

@Component({
  selector: 'app-career-page',
  imports: [CommonModule],
  template: `
    <section class="flex flex-col gap-6">
      <div class="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
        <h1 class="text-2xl font-bold">Dashboard de Carreira</h1>
        <p class="text-xs text-slate-400">
          Histórico do técnico, reputação e mercado de oportunidades.
        </p>
      </div>

      @if (feedback()) {
        <p
          class="text-sm"
          [class.text-emerald-300]="!feedbackError()"
          [class.text-rose-300]="feedbackError()"
        >
          {{ feedback() }}
        </p>
      }

      @if (overview()) {
        <div class="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-4">
          <div class="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <p class="text-xs text-slate-400">Manager</p>
            <p class="font-semibold text-slate-100">{{ overview()?.managerName }}</p>
          </div>
          <div class="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <p class="text-xs text-slate-400">Status</p>
            <p class="font-semibold text-slate-100">{{ overview()?.status }}</p>
          </div>
          <div class="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <p class="text-xs text-slate-400">Reputação</p>
            <p class="font-semibold text-slate-100">{{ overview()?.reputation }}</p>
          </div>
          <div class="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <p class="text-xs text-slate-400">Clube atual</p>
            <p class="font-semibold text-slate-100">
              {{ overview()?.currentClub?.name || 'Sem clube' }}
            </p>
          </div>
        </div>
      }

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 lg:col-span-2">
          <h2 class="mb-3 text-lg font-semibold">Timeline da carreira</h2>
          <div class="space-y-3">
            @for (item of history(); track item.clubId + item.fromDate) {
              <div class="relative rounded bg-slate-950 px-3 py-2 pl-6 text-sm">
                <span class="absolute left-2 top-4 h-2 w-2 rounded-full bg-emerald-400"></span>
                <p class="font-semibold">{{ item.clubName }}</p>
                <p class="text-slate-400">{{ item.countryName }} • {{ item.leagueName }}</p>
                <p class="text-xs text-slate-500">
                  {{ item.role }} • {{ item.fromDate | date: 'dd/MM/yyyy' }}
                  @if (item.toDate) {
                    até {{ item.toDate | date: 'dd/MM/yyyy' }}
                  } @else {
                    • Atual
                  }
                </p>
              </div>
            }
            @if (history().length === 0) {
              <p class="text-sm text-slate-500">Sem histórico disponível.</p>
            }
          </div>
        </div>

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 class="mb-3 text-lg font-semibold">Troféus</h2>
          <div class="space-y-3 text-sm">
            <div class="rounded bg-slate-950 px-3 py-2">
              <p class="text-xs text-slate-400">Títulos em clubes da sua carreira</p>
              <p class="text-xl font-bold text-amber-300">{{ managedClubsTitlesCount() }}</p>
            </div>

            <div class="rounded bg-slate-950 px-3 py-2">
              <p class="text-xs text-slate-400">Clube mais vencedor no save</p>
              <p class="font-semibold">{{ topChampionClubLabel() }}</p>
            </div>

            <div>
              <p class="mb-1 text-xs text-slate-400">Últimos títulos</p>
              <div class="space-y-1">
                @for (
                  title of recentChampions();
                  track title.seasonYear + title.competitionName + title.championClubId
                ) {
                  <div class="rounded bg-slate-950 px-2 py-1 text-xs">
                    {{ title.seasonYear }} • {{ title.competitionName }} —
                    {{ title.championClubName }}
                  </div>
                }
                @if (recentChampions().length === 0) {
                  <p class="text-xs text-slate-500">Nenhum título registrado ainda.</p>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <p class="text-xs text-slate-500">Sem propostas automáticas para seu clube atual.</p>
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
              <p class="text-xs text-slate-500">
                Sem notícias recentes de negociações entre clubes da IA.
              </p>
            }
          </div>
        </div>

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 class="mb-2 text-sm font-semibold text-slate-300">Mercado de empregos</h3>
          <p class="text-xs text-slate-400">Ofertas atuais: {{ offers().length }}</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-1">
        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 class="mb-3 text-lg font-semibold">Propostas de emprego</h2>
          <div class="space-y-2 text-sm">
            @for (offer of offers(); track offer.id) {
              <div class="rounded bg-slate-950 px-3 py-2">
                <p class="font-semibold">{{ offer.clubName }}</p>
                <p class="text-slate-400">{{ offer.countryName }} • {{ offer.leagueName }}</p>
                <p class="text-xs text-slate-500">
                  Projeto {{ offer.projectScore }} • Salário
                  {{ formatCurrency(offer.monthlySalaryOffer) }}/mês
                </p>
                <p class="mt-1 text-xs text-slate-500">{{ offer.rationale }}</p>
                <button
                  type="button"
                  (click)="acceptOffer(offer.clubId)"
                  class="mt-2 rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Aceitar proposta
                </button>
              </div>
            }
            @if (offers().length === 0) {
              <p class="text-sm text-slate-500">Sem propostas no momento.</p>
            }
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 class="mb-2 text-lg font-semibold">Ações</h2>
        <button
          type="button"
          (click)="resign()"
          class="rounded bg-rose-600 px-3 py-1 text-sm font-semibold hover:bg-rose-500"
        >
          Pedir demissão
        </button>
      </div>
    </section>
  `,
})
export class CareerPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly overview = signal<CareerOverview | null>(null);
  readonly history = signal<CareerHistoryItem[]>([]);
  readonly offers = signal<JobOffer[]>([]);
  readonly incomingAutoProposals = signal<TransferProposalNotification[]>([]);
  readonly transferNews = signal<TransferNews[]>([]);
  readonly champions = signal<ChampionsHistoryResponse['champions']>([]);
  readonly titleRanking = signal<ChampionsHistoryResponse['titleRanking']>([]);
  readonly feedback = signal<string | null>(null);
  readonly feedbackError = signal(false);

  ngOnInit() {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) {
      void this.router.navigateByUrl('/menu');
      return;
    }

    this.loadAll(saveId);
  }

  private loadAll(saveId: string) {
    this.api.get<CareerOverview>(`career/save/${saveId}`).subscribe({
      next: (data) => {
        this.overview.set(data);
        if (data.currentClub) {
          this.loadAiNotifications(saveId);
        } else {
          this.incomingAutoProposals.set([]);
        }
      },
    });

    this.api.get<{ history: CareerHistoryItem[] }>(`career/save/${saveId}/history`).subscribe({
      next: (data) => this.history.set(data.history),
    });

    this.api
      .get<
        PaginatedResult<JobOffer>
      >(`career/save/${saveId}/offers`, { saveGameId: saveId, page: 1, limit: 10 })
      .subscribe({
        next: (data) => this.offers.set(data.data),
      });

    this.loadTransferNews(saveId);

    this.api.getSilently<ChampionsHistoryResponse>(`stats/save/${saveId}/champions`).subscribe({
      next: (data) => {
        this.champions.set(data.champions);
        this.titleRanking.set(data.titleRanking);
      },
      error: () => {
        this.champions.set([]);
        this.titleRanking.set([]);
      },
    });
  }

  loadAiNotifications(saveGameId: string) {
    this.api
      .get<PaginatedResult<TransferProposalNotification>>('transfers/proposals', {
        saveGameId,
        scope: 'received',
        page: 1,
        limit: 20,
      })
      .subscribe({
        next: (result) => this.incomingAutoProposals.set(result.data),
      });
  }

  loadTransferNews(saveGameId: string) {
    this.api
      .get<PaginatedResult<TransferNews>>('transfers/ai/news', {
        saveGameId,
        page: 1,
        limit: 8,
      })
      .subscribe({
        next: (result) => this.transferNews.set(result.data),
      });
  }

  acceptOffer(clubId: string) {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) return;

    this.api
      .post<{ message: string }>(`career/save/${saveId}/offers/${clubId}/accept`, {})
      .subscribe({
        next: (result) => {
          this.feedback.set(result.message);
          this.feedbackError.set(false);
          this.gameState.selectClub(clubId);
          this.loadAll(saveId);
        },
        error: () => {
          this.feedback.set('Não foi possível aceitar a proposta agora.');
          this.feedbackError.set(true);
        },
      });
  }

  resign() {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) return;

    this.api.post<{ message: string }>(`career/save/${saveId}/resign`, {}).subscribe({
      next: (result) => {
        this.feedback.set(result.message);
        this.feedbackError.set(false);
        this.gameState.clearSelectedClub();
        this.loadAll(saveId);
      },
      error: () => {
        this.feedback.set('Não foi possível pedir demissão agora.');
        this.feedbackError.set(true);
      },
    });
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('pt-BR');
  }

  managedClubsTitlesCount() {
    const historyClubIds = new Set(this.history().map((item) => item.clubId));
    return this.champions().filter((item) => historyClubIds.has(item.championClubId)).length;
  }

  topChampionClubLabel() {
    const top = this.titleRanking()[0];
    if (!top) {
      return 'Sem registros';
    }

    return `${top.clubName} (${top.titles})`;
  }

  recentChampions() {
    return [...this.champions()].sort((a, b) => b.seasonYear - a.seasonYear).slice(0, 4);
  }
}
