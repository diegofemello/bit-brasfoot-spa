import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-career-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Carreira do Manager</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (feedback()) {
          <p class="text-sm" [class.text-emerald-300]="!feedbackError()" [class.text-rose-300]="feedbackError()">
            {{ feedback() }}
          </p>
        }

        @if (overview()) {
          <div class="grid gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:grid-cols-4">
            <div>
              <p class="text-xs text-slate-400">Manager</p>
              <p class="font-semibold">{{ overview()?.managerName }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400">Status</p>
              <p class="font-semibold">{{ overview()?.status }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400">Reputação</p>
              <p class="font-semibold">{{ overview()?.reputation }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400">Clube atual</p>
              <p class="font-semibold">{{ overview()?.currentClub?.name || 'Sem clube' }}</p>
            </div>
          </div>
        }

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-lg font-semibold">Histórico</h2>
            <div class="space-y-2 text-sm">
              @for (item of history(); track item.clubId + item.fromDate) {
                <div class="rounded bg-slate-950 px-3 py-2">
                  <p class="font-semibold">{{ item.clubName }}</p>
                  <p class="text-slate-400">{{ item.countryName }} • {{ item.leagueName }}</p>
                  <p class="text-xs text-slate-500">{{ item.role }} • desde {{ item.fromDate | date:'dd/MM/yyyy' }}</p>
                </div>
              }
              @if (history().length === 0) {
                <p class="text-sm text-slate-500">Sem histórico disponível.</p>
              }
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-lg font-semibold">Propostas de emprego</h2>
            <div class="space-y-2 text-sm">
              @for (offer of offers(); track offer.id) {
                <div class="rounded bg-slate-950 px-3 py-2">
                  <p class="font-semibold">{{ offer.clubName }}</p>
                  <p class="text-slate-400">{{ offer.countryName }} • {{ offer.leagueName }}</p>
                  <p class="text-xs text-slate-500">Projeto {{ offer.projectScore }} • Salário {{ formatCurrency(offer.monthlySalaryOffer) }}/mês</p>
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
    </main>
  `,
})
export class CareerPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly overview = signal<CareerOverview | null>(null);
  readonly history = signal<CareerHistoryItem[]>([]);
  readonly offers = signal<JobOffer[]>([]);
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
      next: (data) => this.overview.set(data),
    });

    this.api.get<{ history: CareerHistoryItem[] }>(`career/save/${saveId}/history`).subscribe({
      next: (data) => this.history.set(data.history),
    });

    this.api
      .get<PaginatedResult<JobOffer>>(`career/save/${saveId}/offers`, { saveGameId: saveId, page: 1, limit: 10 })
      .subscribe({
        next: (data) => this.offers.set(data.data),
      });
  }

  acceptOffer(clubId: string) {
    const saveId = this.gameState.selectedSaveGameId();
    if (!saveId) return;

    this.api.post<{ message: string }>(`career/save/${saveId}/offers/${clubId}/accept`, {}).subscribe({
      next: (result) => {
        this.feedback.set(result.message);
        this.feedbackError.set(false);
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
}
