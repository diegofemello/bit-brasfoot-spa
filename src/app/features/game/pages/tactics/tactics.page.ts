import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PaginatedResult } from '../../../../core/models/paginated-result.model';
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

interface SquadPlayer {
  id: string;
  name: string;
  position: string;
  overall: number;
}

type Slot = {
  key: string;
  label: string;
};

type FormationPreset = {
  rows: Slot[][];
};

@Component({
  selector: 'app-tactics-page',
  imports: [CommonModule],
  template: `
    <main class="text-slate-100">
      <section class="flex flex-col gap-6">
        <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <div>
            <h1 class="text-2xl font-bold">Editor de Táticas</h1>
            <p class="text-xs text-slate-400">Monte seu onze ideal e ajuste instruções do time.</p>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[320px,1fr]">
          <aside class="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Configuração</h2>

            <label class="mb-1 block text-xs text-slate-400">Formação</label>
            <select
              [value]="formation()"
              (change)="changeFormation($any($event.target).value)"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              @for (item of formations; track item) {
                <option [value]="item">{{ item }}</option>
              }
            </select>

            <div class="mt-4 grid gap-3">
              <div>
                <label class="mb-1 block text-xs text-slate-400">Mentalidade</label>
                <select
                  [value]="mentality()"
                  (change)="mentality.set($any($event.target).value)"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="defensive">Defensiva</option>
                  <option value="balanced">Equilibrada</option>
                  <option value="attacking">Ofensiva</option>
                </select>
              </div>

              <div>
                <label class="mb-1 block text-xs text-slate-400">Pressão</label>
                <select
                  [value]="pressing()"
                  (change)="pressing.set($any($event.target).value)"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>

              <div>
                <label class="mb-1 block text-xs text-slate-400">Ritmo</label>
                <select
                  [value]="tempo()"
                  (change)="tempo.set($any($event.target).value)"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="low">Lento</option>
                  <option value="normal">Normal</option>
                  <option value="high">Rápido</option>
                </select>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                <p class="text-[10px] uppercase text-slate-500">No campo</p>
                <p class="text-lg font-bold text-emerald-300">{{ lineupCount() }}</p>
              </div>
              <div class="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                <p class="text-[10px] uppercase text-slate-500">No banco</p>
                <p class="text-lg font-bold text-slate-200">{{ benchPlayers().length }}</p>
              </div>
            </div>

            <button
              type="button"
              (click)="saveTactic()"
              class="mt-4 w-full rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Salvar tática
            </button>

            @if (isLoadingPlayers()) {
              <p class="mt-3 text-xs text-slate-400">Carregando elenco...</p>
            }

            @if (message()) {
              <p class="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{{ message() }}</p>
            }
          </aside>

          <div class="space-y-4">
            <section class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p class="mb-3 text-sm text-slate-300">Campo (arraste jogadores para posições)</p>

              <div class="relative overflow-hidden rounded-xl border border-emerald-600/40 bg-gradient-to-b from-emerald-900/50 to-emerald-950/60 p-4">
                <div class="pointer-events-none absolute inset-4 rounded-lg border border-white/15"></div>
                <div class="pointer-events-none absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-white/15"></div>
                <div class="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"></div>

                <div class="relative z-10 space-y-2">
                  @for (row of currentFormationRows(); track $index) {
                    <div class="flex justify-center gap-2">
                      @for (slot of row; track slot.key) {
                        <div
                          class="group w-full max-w-[170px] rounded-lg border border-emerald-500/40 bg-slate-950/75 p-2 transition hover:border-emerald-300/70"
                          (dragover)="allowDrop($event)"
                          (drop)="dropOnSlot(slot.key, $event)"
                        >
                          <p class="text-[10px] uppercase tracking-wide text-slate-400">{{ slot.label }}</p>

                          @if (lineup()[slot.key]) {
                            <div
                              class="mt-2 cursor-move rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs"
                              draggable="true"
                              (dragstart)="dragFromSlot(slot.key, lineup()[slot.key], $event)"
                            >
                              <p class="font-semibold text-slate-100">{{ lineup()[slot.key] }}</p>
                            </div>
                          } @else {
                            <div class="mt-2 rounded-md border border-dashed border-slate-700 px-2 py-2 text-[11px] text-slate-500">
                              Solte um jogador aqui
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div class="mb-3 flex items-center justify-between">
                <p class="text-sm font-semibold text-slate-300">Banco de Reservas</p>
                <p class="text-xs text-slate-400">Arraste para o campo ou de volta para o banco</p>
              </div>

              <div
                class="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-2"
                (dragover)="allowDrop($event)"
                (drop)="dropToBench($event)"
              >
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  @for (player of benchPlayers(); track player.id) {
                    <div
                      class="cursor-move rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs transition hover:border-emerald-400/60"
                      draggable="true"
                      (dragstart)="dragFromBench(player.name, $event)"
                    >
                      <div class="mb-1 flex items-center gap-2">
                        <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                          {{ player.position }}
                        </span>
                        <p class="truncate font-semibold text-slate-100">{{ player.name }}</p>
                      </div>
                      <p class="text-[10px] text-slate-400">{{ positionLabel(player.position) }} • OVR {{ player.overall }}</p>
                    </div>
                  }
                </div>
              </div>
            </section>
          </div>
        </div>
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
  readonly players = signal<SquadPlayer[]>([]);
  readonly isLoadingPlayers = signal(false);
  readonly message = signal<string | null>(null);

  readonly formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
  readonly formationPresets: Record<string, FormationPreset> = {
    '4-3-3': {
      rows: [
        [{ key: 'ST', label: 'Atacante' }],
        [
          { key: 'LW', label: 'Ponta Esq.' },
          { key: 'RW', label: 'Ponta Dir.' },
        ],
        [
          { key: 'CM1', label: 'Meia Centro 1' },
          { key: 'CDM', label: 'Volante' },
          { key: 'CM2', label: 'Meia Centro 2' },
        ],
        [
          { key: 'LB', label: 'Lateral Esq.' },
          { key: 'CB1', label: 'Zagueiro 1' },
          { key: 'CB2', label: 'Zagueiro 2' },
          { key: 'RB', label: 'Lateral Dir.' },
        ],
        [{ key: 'GK', label: 'Goleiro' }],
      ],
    },
    '4-4-2': {
      rows: [
        [
          { key: 'ST1', label: 'Atacante 1' },
          { key: 'ST2', label: 'Atacante 2' },
        ],
        [
          { key: 'LM', label: 'Meio Esq.' },
          { key: 'CM1', label: 'Meia Centro 1' },
          { key: 'CM2', label: 'Meia Centro 2' },
          { key: 'RM', label: 'Meio Dir.' },
        ],
        [
          { key: 'LB', label: 'Lateral Esq.' },
          { key: 'CB1', label: 'Zagueiro 1' },
          { key: 'CB2', label: 'Zagueiro 2' },
          { key: 'RB', label: 'Lateral Dir.' },
        ],
        [{ key: 'GK', label: 'Goleiro' }],
      ],
    },
    '3-5-2': {
      rows: [
        [
          { key: 'ST1', label: 'Atacante 1' },
          { key: 'ST2', label: 'Atacante 2' },
        ],
        [
          { key: 'LW', label: 'Ala Esq.' },
          { key: 'CAM', label: 'Meia Ofensivo' },
          { key: 'RW', label: 'Ala Dir.' },
        ],
        [
          { key: 'CM1', label: 'Meia Centro 1' },
          { key: 'CM2', label: 'Meia Centro 2' },
        ],
        [
          { key: 'CB1', label: 'Zagueiro 1' },
          { key: 'CB2', label: 'Zagueiro 2' },
          { key: 'CB3', label: 'Zagueiro 3' },
        ],
        [{ key: 'GK', label: 'Goleiro' }],
      ],
    },
    '4-2-3-1': {
      rows: [
        [{ key: 'ST', label: 'Atacante' }],
        [
          { key: 'LW', label: 'Ponta Esq.' },
          { key: 'CAM', label: 'Meia Ofensivo' },
          { key: 'RW', label: 'Ponta Dir.' },
        ],
        [
          { key: 'CDM1', label: 'Volante 1' },
          { key: 'CDM2', label: 'Volante 2' },
        ],
        [
          { key: 'LB', label: 'Lateral Esq.' },
          { key: 'CB1', label: 'Zagueiro 1' },
          { key: 'CB2', label: 'Zagueiro 2' },
          { key: 'RB', label: 'Lateral Dir.' },
        ],
        [{ key: 'GK', label: 'Goleiro' }],
      ],
    },
  };

  readonly currentFormationRows = computed(() =>
    this.formationPresets[this.formation()]?.rows ?? this.formationPresets['4-3-3'].rows,
  );

  readonly currentSlotKeys = computed(() =>
    this.currentFormationRows()
      .flat()
      .map((slot) => slot.key),
  );

  readonly benchPlayers = computed(() => {
    const assignedNames = new Set(Object.values(this.lineup()));
    return this.players().filter((player) => !assignedNames.has(player.name));
  });

  readonly lineupCount = computed(() => Object.keys(this.lineup()).length);

  ngOnInit() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.saveGameId.set(saveGameId);

    const selectedClubId = this.gameState.selectedClubId();
    if (selectedClubId) {
      this.loadPlayers(selectedClubId);
    }

    this.apiService.get<TacticResponse>(`tactics/save/${saveGameId}`).subscribe({
      next: (tactic) => {
        this.tacticId.set(tactic.id);
        this.formation.set(tactic.formation);
        this.lineup.set(this.normalizeLineup(tactic.lineup ?? {}));
        this.mentality.set(tactic.instructions?.mentality ?? 'balanced');
        this.pressing.set(tactic.instructions?.pressing ?? 'medium');
        this.tempo.set(tactic.instructions?.tempo ?? 'normal');
      },
    });
  }

  loadPlayers(clubId: string) {
    this.isLoadingPlayers.set(true);
    this.apiService
      .get<PaginatedResult<SquadPlayer>>(`players/club/${clubId}`, { page: 1, limit: 80 })
      .subscribe({
        next: (result) => this.players.set(result.data),
        error: () => this.players.set([]),
        complete: () => this.isLoadingPlayers.set(false),
      });
  }

  normalizeLineup(lineup: Record<string, string>) {
    const allowed = new Set(this.currentSlotKeys());
    return Object.fromEntries(Object.entries(lineup).filter(([key]) => allowed.has(key)));
  }

  changeFormation(nextFormation: string) {
    this.formation.set(nextFormation);
    this.lineup.set(this.normalizeLineup(this.lineup()));
  }

  dragFromBench(name: string, event: DragEvent) {
    event.dataTransfer?.setData('text/plain', JSON.stringify({ name, fromSlot: null }));
  }

  dragFromSlot(fromSlot: string, name: string, event: DragEvent) {
    event.dataTransfer?.setData('text/plain', JSON.stringify({ name, fromSlot }));
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  dropOnSlot(slot: string, event: DragEvent) {
    event.preventDefault();
    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return;

    let parsed: { name: string; fromSlot: string | null };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const playerName = parsed.name;
    if (!playerName) return;

    const nextLineup = { ...this.lineup() };

    if (parsed.fromSlot && parsed.fromSlot === slot) {
      return;
    }

    const replaced = nextLineup[slot];

    if (parsed.fromSlot) {
      delete nextLineup[parsed.fromSlot];
      if (replaced) {
        nextLineup[parsed.fromSlot] = replaced;
      }
    } else {
      Object.keys(nextLineup).forEach((position) => {
        if (nextLineup[position] === playerName) {
          delete nextLineup[position];
        }
      });
    }

    nextLineup[slot] = playerName;
    this.lineup.set(nextLineup);
  }

  dropToBench(event: DragEvent) {
    event.preventDefault();
    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return;

    let parsed: { name: string; fromSlot: string | null };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed.fromSlot) {
      return;
    }

    const nextLineup = { ...this.lineup() };
    delete nextLineup[parsed.fromSlot];
    this.lineup.set(nextLineup);
  }

  saveTactic() {
    const body = {
      formation: this.formation(),
      lineup: this.normalizeLineup(this.lineup()),
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
