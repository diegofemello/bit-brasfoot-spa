import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaginatedResult } from '../../../../core/models/paginated-result.model';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface SaveGameItem {
  id: string;
  name: string;
  currentSeasonYear: number;
  currentDate: string;
}

@Component({
  selector: 'app-load-game-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <div class="flex items-center justify-between gap-4">
          <h1 class="text-3xl font-bold">Carregar jogo</h1>
          <a routerLink="/menu" class="text-sm text-emerald-300 hover:text-emerald-200"
            >Voltar ao menu</a
          >
        </div>

        <button
          type="button"
          (click)="load()"
          class="w-fit rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
        >
          Atualizar lista
        </button>

        @if (saveGames().length === 0) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-300">
            Nenhum save encontrado. Crie um novo jogo para começar.
          </div>
        }

        <div class="grid gap-3">
          @for (save of saveGames(); track save.id) {
            <button
              type="button"
              (click)="selectSave(save.id)"
              class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-left hover:border-emerald-400"
            >
              <div class="font-semibold">{{ save.name }}</div>
              <div class="text-sm text-slate-400">
                Temporada {{ save.currentSeasonYear }} • Data {{ save.currentDate }}
              </div>
            </button>
          }
        </div>

        @if (selectedSaveGameId()) {
          <p class="text-sm text-emerald-300">Save selecionado: {{ selectedSaveGameId() }}</p>
        }
      </section>
    </main>
  `,
})
export class LoadGamePage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly saveGames = signal<SaveGameItem[]>([]);
  readonly selectedSaveGameId = this.gameState.selectedSaveGameId;

  ngOnInit() {
    this.load();
  }

  load() {
    this.apiService
      .get<PaginatedResult<SaveGameItem>>('save-games', { page: 1, limit: 20 })
      .subscribe({
        next: (result) => this.saveGames.set(result.data),
        error: () => this.saveGames.set([]),
      });
  }

  selectSave(saveGameId: string) {
    this.gameState.selectSaveGame(saveGameId);
    this.gameState.clearPendingSaveName();
    void this.router.navigateByUrl('/dashboard');
  }
}
