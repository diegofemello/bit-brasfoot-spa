import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface SeasonSummary {
  seasonYear: number;
  playersProcessed: number;
  retirees: number;
  retireeNames: string[];
  youthGenerated: number;
  youthRevealed: Array<{
    name: string;
    position: string;
    overall: number;
    potential: number;
  }>;
  endedContracts: string[];
  promotionRelegation: {
    promoted: string[];
    relegated: string[];
    note: string;
  };
}

interface LastSummaryResponse {
  saveId: string;
  summary: SeasonSummary | null;
}

@Component({
  selector: 'app-season-summary-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <section class="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Resumo de Fim de Temporada</h1>
          <a routerLink="/competitions" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (!summary()) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            Nenhum resumo disponível ainda. Avance uma temporada para gerar o relatório.
          </div>
        }

        @if (summary()) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 class="text-lg font-semibold">Temporada {{ summary()?.seasonYear }}</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <div class="rounded bg-slate-950 px-3 py-2 text-sm">
                <p class="text-slate-400">Jogadores processados</p>
                <p class="text-xl font-bold">{{ summary()?.playersProcessed }}</p>
              </div>
              <div class="rounded bg-slate-950 px-3 py-2 text-sm">
                <p class="text-slate-400">Aposentadorias</p>
                <p class="text-xl font-bold">{{ summary()?.retirees }}</p>
              </div>
              <div class="rounded bg-slate-950 px-3 py-2 text-sm">
                <p class="text-slate-400">Jovens gerados</p>
                <p class="text-xl font-bold text-emerald-300">{{ summary()?.youthGenerated }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-2 text-lg font-semibold">Promoção/Rebaixamento</h3>
            <p class="text-sm text-slate-300">{{ summary()?.promotionRelegation?.note }}</p>

            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <div class="rounded bg-slate-950 px-3 py-2 text-sm">
                <p class="mb-1 text-emerald-300">Promovidos</p>
                @if ((summary()?.promotionRelegation?.promoted?.length ?? 0) === 0) {
                  <p class="text-slate-400">Nenhum registro</p>
                }
                <div class="flex flex-wrap gap-1">
                  @for (club of summary()?.promotionRelegation?.promoted ?? []; track club) {
                    <span class="animate-pulse rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">{{ club }}</span>
                  }
                </div>
              </div>
              <div class="rounded bg-slate-950 px-3 py-2 text-sm">
                <p class="mb-1 text-rose-300">Rebaixados</p>
                @if ((summary()?.promotionRelegation?.relegated?.length ?? 0) === 0) {
                  <p class="text-slate-400">Nenhum registro</p>
                }
                <div class="flex flex-wrap gap-1">
                  @for (club of summary()?.promotionRelegation?.relegated ?? []; track club) {
                    <span class="animate-pulse rounded bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200">{{ club }}</span>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-4 lg:grid-cols-3">
            <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 class="mb-2 text-lg font-semibold">Aposentadorias</h3>
              @if ((summary()?.retireeNames?.length ?? 0) === 0) {
                <p class="text-sm text-slate-400">Nenhuma aposentadoria registrada.</p>
              }
              <div class="space-y-1 text-sm">
                @for (name of summary()?.retireeNames ?? []; track name) {
                  <p>{{ name }}</p>
                }
              </div>
            </div>

            <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 class="mb-2 text-lg font-semibold">Novos revelados</h3>
              @if ((summary()?.youthRevealed?.length ?? 0) === 0) {
                <p class="text-sm text-slate-400">Nenhum jovem revelado registrado.</p>
              }
              <div class="space-y-1 text-sm">
                @for (item of summary()?.youthRevealed ?? []; track item.name) {
                  <p>{{ item.name }} — {{ item.position }} (OVR {{ item.overall }} / POT {{ item.potential }})</p>
                }
              </div>
            </div>

            <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 class="mb-2 text-lg font-semibold">Fim de contratos</h3>
              @if ((summary()?.endedContracts?.length ?? 0) === 0) {
                <p class="text-sm text-slate-400">Nenhum contrato encerrado.</p>
              }
              <div class="space-y-1 text-sm">
                @for (name of summary()?.endedContracts ?? []; track name) {
                  <p>{{ name }}</p>
                }
              </div>
            </div>
          </div>
        }
      </section>
    </main>
  `,
})
export class SeasonSummaryPage {
  private readonly api = inject(ApiService);
  private readonly gameState = inject(GameStateService);

  readonly summary = signal<SeasonSummary | null>(null);

  ngOnInit() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) return;

    this.api.get<LastSummaryResponse>(`seasons/save/${saveGameId}/last-summary`).subscribe({
      next: (response) => this.summary.set(response.summary),
    });
  }
}
