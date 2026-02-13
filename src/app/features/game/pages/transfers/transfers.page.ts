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
  position: string;
  overall: number;
  value: number;
  clubId: string | null;
}

interface Club {
  id: string;
  name: string;
}

interface TransferListing {
  id: string;
  playerId: string;
  askingPrice: number;
  isLoanAvailable: boolean;
  isFreeAgent: boolean;
  player: Player;
  club: Club | null;
}

interface TransferProposal {
  id: string;
  type: 'purchase' | 'sale' | 'loan' | 'swap' | 'release';
  amount: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'canceled';
  responseNote: string | null;
  player: Player;
  fromClub: Club | null;
  toClub: Club | null;
}

@Component({
  selector: 'app-transfers-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Mercado de Transferências</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        <div class="grid gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:grid-cols-5">
          <input
            type="text"
            [value]="searchName()"
            (input)="searchName.set($any($event.target).value)"
            placeholder="Nome"
            class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
          />
          <select
            [value]="positionFilter()"
            (change)="positionFilter.set($any($event.target).value)"
            class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
          >
            <option value="">Posição</option>
            @for (position of positions; track position) {
              <option [value]="position">{{ position }}</option>
            }
          </select>
          <input
            type="number"
            [value]="minOverall()"
            (input)="minOverall.set(+$any($event.target).value || 1)"
            placeholder="OVR mínimo"
            class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
          />
          <input
            type="number"
            [value]="maxValue()"
            (input)="maxValue.set(+$any($event.target).value || 999999999)"
            placeholder="Valor máx"
            class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
          />
          <button
            type="button"
            (click)="loadAll()"
            class="rounded bg-emerald-500 px-2 py-1 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Filtrar
          </button>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-lg font-semibold">Jogadores disponíveis</h2>
            <div class="grid gap-2">
              @for (listing of marketListings(); track listing.id) {
                <div class="rounded bg-slate-950 p-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-semibold">{{ listing.player.name }}</p>
                      <p class="text-xs text-slate-400">
                        {{ listing.player.position }} • OVR {{ listing.player.overall }} •
                        {{ listing.club?.name || 'Sem clube' }}
                      </p>
                    </div>
                    <p class="text-sm font-bold">{{ formatCurrency(listing.askingPrice) }}</p>
                  </div>

                  <div class="mt-2 flex flex-wrap gap-2">
                    @if (listing.club?.id !== selectedClubId()) {
                      <button
                        type="button"
                        (click)="openProposal(listing, 'purchase')"
                        class="rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                      >
                        Propor compra
                      </button>
                      @if (listing.isLoanAvailable) {
                        <button
                          type="button"
                          (click)="openProposal(listing, 'loan')"
                          class="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
                        >
                          Propor empréstimo
                        </button>
                      }
                    }
                    @if (listing.club?.id === selectedClubId()) {
                      <button
                        type="button"
                        (click)="removeListing(listing.id)"
                        class="rounded bg-rose-600 px-2 py-1 text-xs hover:bg-rose-500"
                      >
                        Remover da lista
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-lg font-semibold">Jogadores livres</h2>
            <div class="grid gap-2">
              @for (listing of freeAgents(); track listing.id) {
                <div class="rounded bg-slate-950 p-3">
                  <p class="font-semibold">{{ listing.player.name }}</p>
                  <p class="text-xs text-slate-400">
                    {{ listing.player.position }} • OVR {{ listing.player.overall }}
                  </p>
                  <button
                    type="button"
                    (click)="openProposal(listing, 'purchase')"
                    class="mt-2 rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    Assinar jogador
                  </button>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-2 text-sm font-semibold text-slate-300">Negociações enviadas</h3>
            <div class="grid gap-2">
              @for (proposal of sentProposals(); track proposal.id) {
                <div class="rounded bg-slate-950 px-2 py-1 text-xs">
                  {{ proposal.player.name }} • {{ proposal.type }} •
                  <span [class]="statusClass(proposal.status)">{{ proposal.status }}</span>
                </div>
              }
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-2 text-sm font-semibold text-slate-300">Negociações recebidas</h3>
            <div class="grid gap-2">
              @for (proposal of receivedProposals(); track proposal.id) {
                <div class="rounded bg-slate-950 px-2 py-1 text-xs">
                  {{ proposal.player.name }} • {{ proposal.type }} •
                  <span [class]="statusClass(proposal.status)">{{ proposal.status }}</span>
                  <div class="mt-1 flex gap-1">
                    <button
                      type="button"
                      (click)="respond(proposal.id, 'accept')"
                      class="rounded bg-emerald-500 px-2 py-0.5 text-slate-950"
                    >
                      Aceitar
                    </button>
                    <button
                      type="button"
                      (click)="respond(proposal.id, 'reject')"
                      class="rounded bg-rose-600 px-2 py-0.5"
                    >
                      Rejeitar
                    </button>
                    <button
                      type="button"
                      (click)="respond(proposal.id, 'counter')"
                      class="rounded bg-slate-700 px-2 py-0.5"
                    >
                      Contraproposta
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-2 text-sm font-semibold text-slate-300">Histórico</h3>
            <div class="grid gap-2">
              @for (proposal of historyProposals(); track proposal.id) {
                <div class="rounded bg-slate-950 px-2 py-1 text-xs">
                  {{ proposal.player.name }} •
                  <span [class]="statusClass(proposal.status)">{{ proposal.status }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 class="mb-3 text-sm font-semibold text-slate-300">Colocar jogador na lista</h3>
          <div class="grid gap-2 sm:grid-cols-4">
            <select
              [value]="selectedPlayerToList()"
              (change)="selectedPlayerToList.set($any($event.target).value)"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="">Selecione um jogador</option>
              @for (player of myPlayers(); track player.id) {
                <option [value]="player.id">{{ player.name }} ({{ player.position }})</option>
              }
            </select>
            <input
              type="number"
              [value]="listPrice()"
              (input)="listPrice.set(+$any($event.target).value || 1)"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
              placeholder="Preço"
            />
            <label class="flex items-center gap-2 text-xs">
              <input type="checkbox" [checked]="listLoan()" (change)="listLoan.set($any($event.target).checked)" />
              Disponível para empréstimo
            </label>
            <button
              type="button"
              (click)="createListing()"
              class="rounded bg-emerald-500 px-2 py-1 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Colocar na lista
            </button>
          </div>
        </div>

        @if (proposalTarget()) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="text-sm font-semibold text-slate-300">Nova proposta</h3>
            <p class="mt-1 text-xs text-slate-400">{{ proposalTarget()?.player?.name }}</p>
            <div class="mt-2 grid gap-2 sm:grid-cols-4">
              <select
                [value]="proposalType()"
                (change)="proposalType.set($any($event.target).value)"
                class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
              >
                <option value="purchase">Compra</option>
                <option value="loan">Empréstimo</option>
                <option value="swap">Troca</option>
              </select>
              <input
                type="number"
                [value]="proposalAmount()"
                (input)="proposalAmount.set(+$any($event.target).value || 0)"
                class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
                placeholder="Valor"
              />
              <input
                type="text"
                [value]="proposalNote()"
                (input)="proposalNote.set($any($event.target).value)"
                class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
                placeholder="Detalhes"
              />
              <button
                type="button"
                (click)="submitProposal()"
                class="rounded bg-emerald-500 px-2 py-1 font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Enviar proposta
              </button>
            </div>
          </div>
        }

        @if (feedback()) {
          <p class="text-sm" [class.text-emerald-300]="!feedbackError()" [class.text-rose-300]="feedbackError()">
            {{ feedback() }}
          </p>
        }
      </section>
    </main>
  `,
})
export class TransfersPage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly selectedSaveGameId = this.gameState.selectedSaveGameId;
  readonly selectedClubId = this.gameState.selectedClubId;

  readonly searchName = signal('');
  readonly positionFilter = signal('');
  readonly minOverall = signal(1);
  readonly maxValue = signal(999999999);
  readonly positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

  readonly marketListings = signal<TransferListing[]>([]);
  readonly freeAgents = signal<TransferListing[]>([]);
  readonly sentProposals = signal<TransferProposal[]>([]);
  readonly receivedProposals = signal<TransferProposal[]>([]);
  readonly historyProposals = signal<TransferProposal[]>([]);
  readonly myPlayers = signal<Player[]>([]);

  readonly selectedPlayerToList = signal('');
  readonly listPrice = signal(1000000);
  readonly listLoan = signal(false);

  readonly proposalTarget = signal<TransferListing | null>(null);
  readonly proposalType = signal<'purchase' | 'loan' | 'swap' | 'release'>('purchase');
  readonly proposalAmount = signal(1000000);
  readonly proposalNote = signal('');

  readonly feedback = signal<string | null>(null);
  readonly feedbackError = signal(false);

  readonly managedClubId = computed(() => this.selectedClubId() ?? null);

  ngOnInit() {
    if (!this.selectedSaveGameId() || !this.selectedClubId()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.loadAll();
  }

  loadAll() {
    this.loadMarket();
    this.loadFreeAgents();
    this.loadProposals();
    this.loadMyPlayers();
  }

  private loadMarket() {
    this.apiService
      .get<PaginatedResult<TransferListing>>('transfers/market', {
        saveGameId: this.selectedSaveGameId()!,
        page: 1,
        limit: 50,
        name: this.searchName(),
        position: this.positionFilter(),
        minOverall: this.minOverall(),
        maxValue: this.maxValue(),
      })
      .subscribe({
        next: (result) => this.marketListings.set(result.data),
      });
  }

  private loadFreeAgents() {
    this.apiService
      .get<PaginatedResult<TransferListing>>('transfers/free-agents', {
        saveGameId: this.selectedSaveGameId()!,
        page: 1,
        limit: 30,
      })
      .subscribe({
        next: (result) => this.freeAgents.set(result.data),
      });
  }

  private loadProposals() {
    this.apiService
      .get<PaginatedResult<TransferProposal>>('transfers/proposals', {
        saveGameId: this.selectedSaveGameId()!,
        scope: 'sent',
        page: 1,
        limit: 20,
      })
      .subscribe({ next: (result) => this.sentProposals.set(result.data) });

    this.apiService
      .get<PaginatedResult<TransferProposal>>('transfers/proposals', {
        saveGameId: this.selectedSaveGameId()!,
        scope: 'received',
        page: 1,
        limit: 20,
      })
      .subscribe({ next: (result) => this.receivedProposals.set(result.data) });

    this.apiService
      .get<PaginatedResult<TransferProposal>>('transfers/proposals', {
        saveGameId: this.selectedSaveGameId()!,
        scope: 'history',
        page: 1,
        limit: 20,
      })
      .subscribe({ next: (result) => this.historyProposals.set(result.data) });
  }

  private loadMyPlayers() {
    this.apiService
      .get<PaginatedResult<Player>>(`players/club/${this.selectedClubId()}`, {
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (result) => this.myPlayers.set(result.data),
      });
  }

  createListing() {
    if (!this.selectedPlayerToList()) return;

    this.apiService
      .post('transfers/listings', {
        saveGameId: this.selectedSaveGameId(),
        playerId: this.selectedPlayerToList(),
        askingPrice: this.listPrice(),
        isLoanAvailable: this.listLoan(),
      })
      .subscribe({
        next: () => {
          this.setFeedback('Jogador colocado na lista de transferências.', false);
          this.loadAll();
        },
        error: (err) => {
          this.setFeedback(this.extractErrorMessage(err, 'Falha ao criar listagem.'), true);
        },
      });
  }

  removeListing(listingId: string) {
    this.apiService.delete(`transfers/listings/${listingId}`).subscribe({
      next: () => {
        this.setFeedback('Listagem removida.', false);
        this.loadAll();
      },
      error: () => this.setFeedback('Falha ao remover listagem.', true),
    });
  }

  openProposal(listing: TransferListing, type: 'purchase' | 'loan' | 'swap' | 'release') {
    this.proposalTarget.set(listing);
    this.proposalType.set(type);
    this.proposalAmount.set(listing.askingPrice || 0);
    this.proposalNote.set('');
  }

  submitProposal() {
    const target = this.proposalTarget();
    if (!target) return;

    this.apiService
      .post<TransferProposal>('transfers/proposals', {
        saveGameId: this.selectedSaveGameId(),
        playerId: target.playerId,
        fromClubId: target.club?.id,
        toClubId: this.managedClubId(),
        type: this.proposalType(),
        amount: this.proposalAmount(),
        note: this.proposalNote(),
      })
      .subscribe({
        next: () => {
          this.proposalTarget.set(null);
          this.setFeedback('Proposta enviada com sucesso.', false);
          this.loadAll();
        },
        error: (err) => {
          this.setFeedback(this.extractErrorMessage(err, 'Não foi possível enviar proposta.'), true);
        },
      });
  }

  respond(proposalId: string, action: 'accept' | 'reject' | 'counter') {
    this.apiService
      .patch(`transfers/proposals/${proposalId}/respond`, {
        action,
        counterAmount: action === 'counter' ? 1500000 : undefined,
      })
      .subscribe({
        next: () => {
          this.setFeedback(`Proposta ${action === 'accept' ? 'aceita' : action === 'reject' ? 'rejeitada' : 'contraproposta enviada'}.`, false);
          this.loadAll();
        },
        error: (err) => this.setFeedback(this.extractErrorMessage(err, 'Falha ao responder proposta.'), true),
      });
  }

  statusClass(status: TransferProposal['status']) {
    if (status === 'accepted') return 'text-emerald-400';
    if (status === 'rejected' || status === 'canceled') return 'text-rose-400';
    if (status === 'countered') return 'text-yellow-400';
    return 'text-sky-400';
  }

  formatCurrency(value: number) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${Math.round(value / 1000)}K`;
  }

  private setFeedback(message: string, isError: boolean) {
    this.feedback.set(message);
    this.feedbackError.set(isError);
  }

  private extractErrorMessage(err: unknown, fallback: string) {
    const message = (err as { error?: { error?: { message?: string | string[] } } })?.error?.error?.message;
    if (Array.isArray(message) && message.length > 0) {
      return message[0];
    }
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    return fallback;
  }
}
