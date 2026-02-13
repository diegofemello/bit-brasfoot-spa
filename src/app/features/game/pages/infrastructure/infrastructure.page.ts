import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface InfrastructureState {
  trainingLevel: number;
  youthLevel: number;
  medicalLevel: number;
  stadiumLevel: number;
}

@Component({
  selector: 'app-infrastructure-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-10">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Infraestrutura</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (infra()) {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h2 class="text-sm text-slate-400">Centro de Treino</h2>
              <p class="mt-2 text-xl font-bold">Nível {{ infra()?.trainingLevel }}</p>
              <button
                type="button"
                (click)="upgrade('training')"
                class="mt-3 rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Melhorar
              </button>
            </article>

            <article class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h2 class="text-sm text-slate-400">Base</h2>
              <p class="mt-2 text-xl font-bold">Nível {{ infra()?.youthLevel }}</p>
              <button
                type="button"
                (click)="upgrade('youth')"
                class="mt-3 rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Melhorar
              </button>
            </article>

            <article class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h2 class="text-sm text-slate-400">Departamento Médico</h2>
              <p class="mt-2 text-xl font-bold">Nível {{ infra()?.medicalLevel }}</p>
              <button
                type="button"
                (click)="upgrade('medical')"
                class="mt-3 rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Melhorar
              </button>
            </article>

            <article class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h2 class="text-sm text-slate-400">Estádio</h2>
              <p class="mt-2 text-xl font-bold">Nível {{ infra()?.stadiumLevel }}</p>
              <button
                type="button"
                (click)="upgrade('stadium')"
                class="mt-3 rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Melhorar
              </button>
            </article>
          </div>
        }

        @if (message()) {
          <div class="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {{ message() }}
          </div>
        }

        @if (error()) {
          <div class="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {{ error() }}
          </div>
        }
      </section>
    </main>
  `,
})
export class InfrastructurePage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly infra = signal<InfrastructureState | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.apiService.get<InfrastructureState>(`infrastructures/save/${saveGameId}`).subscribe({
      next: (infra) => this.infra.set(infra),
    });
  }

  upgrade(type: 'training' | 'youth' | 'medical' | 'stadium') {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) return;

    this.error.set(null);
    this.message.set(null);

    this.apiService
      .post<{
        upgradeCost: number;
        remainingBalance: number;
      }>('infrastructures/upgrade', {
        saveGameId,
        type,
      })
      .subscribe({
        next: (result) => {
          this.message.set(
            `Upgrade concluído (${type}). Custo: ${this.formatCurrency(result.upgradeCost)} • Saldo: ${this.formatCurrency(result.remainingBalance)}`,
          );
          this.load();
        },
        error: (err) => {
          this.error.set(err?.error?.error?.message?.[0] ?? 'Não foi possível realizar upgrade.');
        },
      });
  }

  formatCurrency(value: number) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${Math.round(value / 1000)}K`;
  }
}
