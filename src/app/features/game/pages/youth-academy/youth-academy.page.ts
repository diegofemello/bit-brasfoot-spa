import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface YouthPlayer {
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

interface YouthListResponse {
  saveId: string;
  players: YouthPlayer[];
}

@Component({
  selector: 'app-youth-academy-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="text-slate-100">
      <section class="flex flex-col gap-5">
        <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <div>
            <h1 class="text-2xl font-bold">Categorias de Base</h1>
            <p class="text-xs text-slate-400">Gerencie jovens do clube e promova talentos para o elenco principal.</p>
          </div>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (feedback()) {
          <p
            class="rounded-lg border px-3 py-2 text-sm"
            [class.border-rose-500/30]="feedbackError()"
            [class.bg-rose-500/10]="feedbackError()"
            [class.text-rose-300]="feedbackError()"
            [class.border-emerald-500/30]="!feedbackError()"
            [class.bg-emerald-500/10]="!feedbackError()"
            [class.text-emerald-300]="!feedbackError()"
          >
            {{ feedback() }}
          </p>
        }

        <div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-semibold">Jovens disponíveis</h2>
            <button
              type="button"
              (click)="loadYouth()"
              [disabled]="isLoading()"
              class="rounded bg-slate-700 px-3 py-1 text-sm font-semibold hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isLoading() ? 'Atualizando...' : 'Atualizar' }}
            </button>
          </div>

          @if (!hasActiveClub()) {
            <p class="text-sm text-amber-300">
              Você está sem clube no momento. Aceite uma proposta em Carreira para acessar a base.
            </p>
          }

          @if (players().length === 0) {
            <p class="text-sm text-slate-400">Nenhum jogador elegível na base.</p>
          }

          <div class="grid gap-2">
            @for (player of players(); track player.id) {
              <div class="flex items-center justify-between rounded bg-slate-950 px-3 py-2 text-sm">
                <div>
                  <p class="font-semibold">{{ player.name }}</p>
                  <p class="text-xs text-slate-400">
                    {{ positionLabel(player.position) }} • {{ player.age }} anos • OVR {{ player.overall }} / POT {{ player.potential }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="promote(player.id)"
                    [disabled]="isLoading() || !hasActiveClub()"
                    class="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Promover
                  </button>
                  <button
                    type="button"
                    (click)="release(player.id)"
                    [disabled]="isLoading() || !hasActiveClub()"
                    class="rounded bg-rose-500 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Dispensar
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
export class YouthAcademyPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);

  readonly players = signal<YouthPlayer[]>([]);
  readonly feedback = signal<string | null>(null);
  readonly feedbackError = signal(false);
  readonly isLoading = signal(false);
  readonly hasActiveClub = computed(() => Boolean(this.gameState.selectedClubId()));

  ngOnInit() {
    this.loadYouth();
  }

  loadYouth() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) {
      this.players.set([]);
      this.setFeedback('Nenhum save ativo selecionado.', true);
      return;
    }

    if (!this.hasActiveClub()) {
      this.players.set([]);
      this.setFeedback('Você está sem clube. Aceite uma proposta para gerenciar categorias de base.', true);
      return;
    }

    this.isLoading.set(true);

    this.api.get<YouthListResponse>(`seasons/save/${saveGameId}/youth`).subscribe({
      next: (response) => {
        this.players.set(response.players);
        this.setFeedback('', false);
      },
      error: () => this.setFeedback('Falha ao carregar jogadores da base.', true),
      complete: () => this.isLoading.set(false),
    });
  }

  promote(playerId: string) {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId || !this.hasActiveClub()) {
      return;
    }

    this.isLoading.set(true);

    this.api.post<{ message: string }>(`seasons/save/${saveGameId}/youth/${playerId}/promote`, {}).subscribe({
      next: (response) => {
        this.setFeedback(response.message, false);
        this.loadYouth();
      },
      error: (err) => this.setFeedback(this.extractErrorMessage(err, 'Falha ao promover jogador.'), true),
      complete: () => this.isLoading.set(false),
    });
  }

  release(playerId: string) {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId || !this.hasActiveClub()) {
      return;
    }

    this.isLoading.set(true);

    this.api.delete<{ message: string }>(`seasons/save/${saveGameId}/youth/${playerId}`).subscribe({
      next: (response) => {
        this.setFeedback(response.message, false);
        this.loadYouth();
      },
      error: (err) => this.setFeedback(this.extractErrorMessage(err, 'Falha ao dispensar jogador.'), true),
      complete: () => this.isLoading.set(false),
    });
  }

  private setFeedback(message: string, isError: boolean) {
    this.feedback.set(message.length > 0 ? message : null);
    this.feedbackError.set(isError);
  }

  private extractErrorMessage(err: unknown, fallback: string) {
    const response = (err as { error?: { message?: string | string[]; error?: { message?: string | string[] } } })
      ?.error;
    const candidates = [response?.message, response?.error?.message];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate[0];
      }
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }

    return fallback;
  }

  positionLabel(position: string) {
    const labels: Record<string, string> = {
      GK: 'Goleiro',
      LB: 'Lateral Esq.',
      RB: 'Lateral Dir.',
      CB: 'Zagueiro',
      CDM: 'Volante',
      CM: 'Meia',
      CAM: 'Meia Ofensivo',
      LW: 'Ponta Esq.',
      RW: 'Ponta Dir.',
      ST: 'Atacante',
    };

    return labels[position] ?? position;
  }
}
