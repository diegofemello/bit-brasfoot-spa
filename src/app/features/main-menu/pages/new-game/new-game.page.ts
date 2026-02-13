import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface UserResponse {
  id: string;
  managerName: string;
}

@Component({
  selector: 'app-new-game-page',
  imports: [CommonModule],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
        <h1 class="text-3xl font-bold">Novo jogo</h1>
        <p class="text-slate-300">Cria manager e save inicial sem autenticação.</p>

        <label class="flex flex-col gap-2">
          <span class="text-sm text-slate-300">Nome do manager</span>
          <input
            #managerNameInput
            type="text"
            class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400"
            placeholder="Ex: Diego"
          />
        </label>

        <label class="flex flex-col gap-2">
          <span class="text-sm text-slate-300">Nome do save</span>
          <input
            #saveNameInput
            type="text"
            class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400"
            placeholder="Ex: Carreira Brasil"
          />
        </label>

        <button
          type="button"
          (click)="create(managerNameInput.value, saveNameInput.value)"
          [disabled]="isLoading()"
          class="rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isLoading() ? 'Criando...' : 'Criar e continuar' }}
        </button>

        @if (errorMessage()) {
          <p
            class="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          >
            {{ errorMessage() }}
          </p>
        }
      </section>
    </main>
  `,
})
export class NewGamePage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  create(managerName: string, saveName: string) {
    if (!managerName.trim() || !saveName.trim()) {
      this.errorMessage.set('Preencha nome do manager e nome do save.');
      return;
    }

    this.gameState.clearActiveSaveContext();
    this.gameState.clearPendingSaveName();

    this.errorMessage.set(null);
    this.isLoading.set(true);

    // TODO: Na Fase 1, com autenticação, não será necessário criar User aqui
    // O userId virá do token de acesso automaticamente no backend
    this.apiService.post<UserResponse>('users', { managerName: managerName.trim() }).subscribe({
      next: (user) => {
        this.gameState.selectUser(user.id);
        this.gameState.setPendingSaveName(saveName.trim());
        void this.router.navigateByUrl('/select-club');
      },
      error: () => {
        this.errorMessage.set('Não foi possível criar o manager.');
        this.isLoading.set(false);
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }
}
