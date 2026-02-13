import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface ContractPlayer {
  id: string;
  name: string;
  age: number;
  position: string;
  overall: number;
  salary: number;
  contractYearsRemaining: number;
}

interface ExpiringContractsResponse {
  saveId: string;
  players: ContractPlayer[];
}

@Component({
  selector: 'app-contracts-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <section class="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Renovação de Contratos</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (feedback()) {
          <p class="text-sm" [class.text-rose-300]="feedbackError()" [class.text-emerald-300]="!feedbackError()">
            {{ feedback() }}
          </p>
        }

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-semibold">Contratos a vencer (<= 1 ano)</h2>
            <button
              type="button"
              (click)="loadExpiring()"
              class="rounded bg-slate-700 px-3 py-1 text-sm font-semibold hover:bg-slate-600"
            >
              Atualizar
            </button>
          </div>

          @if (players().length === 0) {
            <p class="text-sm text-slate-400">Nenhum contrato crítico no momento.</p>
          }

          <div class="grid gap-2">
            @for (player of players(); track player.id) {
              <div class="flex items-center justify-between rounded bg-slate-950 px-3 py-2 text-sm">
                <div>
                  <p class="font-semibold">{{ player.name }}</p>
                  <p class="text-xs text-slate-400">
                    {{ player.position }} • {{ player.age }} anos • OVR {{ player.overall }} • {{ player.contractYearsRemaining }} ano(s)
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <p class="text-xs text-slate-400">Salário: {{ formatCurrency(player.salary) }}</p>
                  <button
                    type="button"
                    (click)="renew(player.id)"
                    class="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    Renovar
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    </main>
  `,
})
export class ContractsPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);

  readonly players = signal<ContractPlayer[]>([]);
  readonly feedback = signal<string | null>(null);
  readonly feedbackError = signal(false);

  ngOnInit() {
    this.loadExpiring();
  }

  loadExpiring() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) {
      this.setFeedback('Nenhum save ativo selecionado.', true);
      return;
    }

    this.api.get<ExpiringContractsResponse>(`seasons/save/${saveGameId}/contracts/expiring`).subscribe({
      next: (response) => this.players.set(response.players),
      error: () => this.setFeedback('Falha ao carregar contratos.', true),
    });
  }

  renew(playerId: string) {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) return;

    this.api.post<{ message: string }>(`seasons/save/${saveGameId}/contracts/${playerId}/renew`, {}).subscribe({
      next: (response) => {
        this.setFeedback(response.message, false);
        this.loadExpiring();
      },
      error: (err) => this.setFeedback(this.extractErrorMessage(err, 'Falha ao renovar contrato.'), true),
    });
  }

  formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
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
