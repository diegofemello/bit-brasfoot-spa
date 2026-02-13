import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface TacticResponse {
  id: string;
  saveGameId: string;
  formation: string;
  lineup: Record<string, string>;
  instructions: {
    mentality: 'defensive' | 'balanced' | 'attacking';
    pressing: 'low' | 'medium' | 'high';
    tempo: 'low' | 'normal' | 'high';
  };
}

@Component({
  selector: 'app-tactics-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-10">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Editor de Táticas</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <label class="mb-3 block text-sm text-slate-300">Formação</label>
            <select
              [value]="formation()"
              (change)="formation.set($any($event.target).value)"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            >
              @for (item of formations; track item) {
                <option [value]="item">{{ item }}</option>
              }
            </select>

            <div class="mt-4 grid gap-2">
              <label class="text-xs text-slate-400">Mentalidade</label>
              <select
                [value]="mentality()"
                (change)="mentality.set($any($event.target).value)"
                class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
              >
                <option value="defensive">Defensiva</option>
                <option value="balanced">Equilibrada</option>
                <option value="attacking">Ofensiva</option>
              </select>

              <label class="text-xs text-slate-400">Pressão</label>
              <select
                [value]="pressing()"
                (change)="pressing.set($any($event.target).value)"
                class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>

              <label class="text-xs text-slate-400">Ritmo</label>
              <select
                [value]="tempo()"
                (change)="tempo.set($any($event.target).value)"
                class="rounded border border-slate-700 bg-slate-950 px-2 py-1"
              >
                <option value="low">Lento</option>
                <option value="normal">Normal</option>
                <option value="high">Rápido</option>
              </select>
            </div>

            <button
              type="button"
              (click)="saveTactic()"
              class="mt-4 w-full rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Salvar tática
            </button>
          </div>

          <div class="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p class="mb-3 text-sm text-slate-300">Campo (arraste jogadores para posições)</p>
            <div class="grid grid-cols-4 gap-3 rounded-lg bg-emerald-900/30 p-3">
              @for (slot of fieldSlots; track slot) {
                <div
                  class="min-h-20 rounded border border-emerald-500/40 bg-slate-950/80 p-2"
                  (dragover)="allowDrop($event)"
                  (drop)="drop(slot, $event)"
                >
                  <p class="text-[10px] uppercase tracking-wide text-slate-400">{{ slot }}</p>
                  @if (lineup()[slot]) {
                    <div class="mt-2 rounded bg-slate-800 px-2 py-1 text-xs">{{ lineup()[slot] }}</div>
                  }
                </div>
              }
            </div>

            <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              @for (name of draggablePlayers; track name) {
                <div
                  class="cursor-move rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  draggable="true"
                  (dragstart)="drag(name, $event)"
                >
                  {{ name }}
                </div>
              }
            </div>
          </div>
        </div>

        @if (message()) {
          <p class="text-sm text-emerald-300">{{ message() }}</p>
        }
      </section>
    </main>
  `,
})
export class TacticsPage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly saveGameId = signal<string | null>(null);
  readonly tacticId = signal<string | null>(null);
  readonly formation = signal('4-3-3');
  readonly mentality = signal<'defensive' | 'balanced' | 'attacking'>('balanced');
  readonly pressing = signal<'low' | 'medium' | 'high'>('medium');
  readonly tempo = signal<'low' | 'normal' | 'high'>('normal');
  readonly lineup = signal<Record<string, string>>({});
  readonly message = signal<string | null>(null);

  readonly formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
  readonly fieldSlots = ['GK', 'LB', 'CB1', 'CB2', 'RB', 'CM1', 'CM2', 'CAM', 'LW', 'ST', 'RW'];
  readonly draggablePlayers = ['Jogador A', 'Jogador B', 'Jogador C', 'Jogador D', 'Jogador E', 'Jogador F'];

  ngOnInit() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.saveGameId.set(saveGameId);

    this.apiService.get<TacticResponse>(`tactics/save/${saveGameId}`).subscribe({
      next: (tactic) => {
        this.tacticId.set(tactic.id);
        this.formation.set(tactic.formation);
        this.lineup.set(tactic.lineup ?? {});
        this.mentality.set(tactic.instructions?.mentality ?? 'balanced');
        this.pressing.set(tactic.instructions?.pressing ?? 'medium');
        this.tempo.set(tactic.instructions?.tempo ?? 'normal');
      },
    });
  }

  drag(name: string, event: DragEvent) {
    event.dataTransfer?.setData('text/plain', name);
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  drop(slot: string, event: DragEvent) {
    event.preventDefault();
    const playerName = event.dataTransfer?.getData('text/plain');
    if (!playerName) return;

    const nextLineup = { ...this.lineup() };
    Object.keys(nextLineup).forEach((position) => {
      if (nextLineup[position] === playerName) {
        delete nextLineup[position];
      }
    });
    nextLineup[slot] = playerName;
    this.lineup.set(nextLineup);
  }

  saveTactic() {
    const body = {
      formation: this.formation(),
      lineup: this.lineup(),
      mentality: this.mentality(),
      pressing: this.pressing(),
      tempo: this.tempo(),
    };

    const tacticId = this.tacticId();
    if (tacticId) {
      this.apiService.patch<TacticResponse>(`tactics/${tacticId}`, body).subscribe({
        next: () => this.message.set('Tática salva com sucesso.'),
        error: () => this.message.set('Não foi possível salvar a tática.'),
      });
      return;
    }

    const saveGameId = this.saveGameId();
    if (!saveGameId) {
      this.message.set('Save não encontrado para salvar tática.');
      return;
    }

    this.apiService
      .post<TacticResponse>('tactics', {
        saveGameId,
        ...body,
      })
      .subscribe({
        next: (tactic) => {
          this.tacticId.set(tactic.id);
          this.message.set('Tática salva com sucesso.');
        },
        error: () => this.message.set('Não foi possível salvar a tática.'),
      });
  }
}
