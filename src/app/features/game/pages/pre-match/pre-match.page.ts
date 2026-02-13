import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';

interface Fixture {
  id: string;
  matchDate: string;
  status: 'scheduled' | 'played';
  homeScore: number | null;
  awayScore: number | null;
  homeClub: { id: string; name: string };
  awayClub: { id: string; name: string };
}

interface ClubPlayersResponse {
  data: Array<{ id: string; name: string; overall: number; position: string }>;
}

interface MatchPlan {
  homeMentality: 'defensive' | 'balanced' | 'attacking';
  awayMentality: 'defensive' | 'balanced' | 'attacking';
  homeTempo: 'low' | 'normal' | 'high';
  awayTempo: 'low' | 'normal' | 'high';
}

@Component({
  selector: 'app-pre-match-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <section class="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Pré-jogo</h1>
          <a routerLink="/competitions" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (fixture()) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p class="text-sm text-slate-400">{{ fixture()?.matchDate }}</p>
            <h2 class="text-xl font-semibold">{{ fixture()?.homeClub?.name }} x {{ fixture()?.awayClub?.name }}</h2>
            @if (fixture()?.status === 'played') {
              <p class="mt-2 text-sm text-emerald-300">Partida já simulada: {{ fixture()?.homeScore }} x {{ fixture()?.awayScore }}</p>
            }
          </div>
        }

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-2 text-lg font-semibold">{{ fixture()?.homeClub?.name }}</h3>
            <label class="mb-2 block text-xs text-slate-400">Mentalidade</label>
            <select
              [value]="plan().homeMentality"
              (change)="updatePlan('homeMentality', $any($event.target).value)"
              class="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            >
              <option value="defensive">Defensiva</option>
              <option value="balanced">Equilibrada</option>
              <option value="attacking">Ofensiva</option>
            </select>

            <label class="mb-2 block text-xs text-slate-400">Ritmo</label>
            <select
              [value]="plan().homeTempo"
              (change)="updatePlan('homeTempo', $any($event.target).value)"
              class="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            >
              <option value="low">Baixo</option>
              <option value="normal">Normal</option>
              <option value="high">Alto</option>
            </select>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-2 text-lg font-semibold">{{ fixture()?.awayClub?.name }}</h3>
            <label class="mb-2 block text-xs text-slate-400">Mentalidade</label>
            <select
              [value]="plan().awayMentality"
              (change)="updatePlan('awayMentality', $any($event.target).value)"
              class="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            >
              <option value="defensive">Defensiva</option>
              <option value="balanced">Equilibrada</option>
              <option value="attacking">Ofensiva</option>
            </select>

            <label class="mb-2 block text-xs text-slate-400">Ritmo</label>
            <select
              [value]="plan().awayTempo"
              (change)="updatePlan('awayTempo', $any($event.target).value)"
              class="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            >
              <option value="low">Baixo</option>
              <option value="normal">Normal</option>
              <option value="high">Alto</option>
            </select>
          </div>
        </div>

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 class="text-lg font-semibold">Previsão de confronto</h3>
          <p class="mt-2 text-sm text-slate-300">Força média: {{ homeStrength() }} x {{ awayStrength() }}</p>
          <p class="mt-1 text-sm text-emerald-300">{{ prediction() }}</p>
        </div>

        @if (message()) {
          <p class="text-sm" [class.text-rose-300]="isError()" [class.text-emerald-300]="!isError()">{{ message() }}</p>
        }

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            (click)="simulateNow()"
            [disabled]="simulating() || fixture()?.status === 'played'"
            class="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Simular agora
          </button>
          <a
            [routerLink]="['/match-day', fixtureId()]"
            class="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Ir para dia de jogo
          </a>
        </div>
      </section>
    </main>
  `,
})
export class PreMatchPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly fixture = signal<Fixture | null>(null);
  readonly homeStrength = signal(0);
  readonly awayStrength = signal(0);
  readonly simulating = signal(false);
  readonly message = signal<string | null>(null);
  readonly isError = signal(false);
  readonly fixtureId = signal<string>('');

  readonly plan = signal<MatchPlan>({
    homeMentality: 'balanced',
    awayMentality: 'balanced',
    homeTempo: 'normal',
    awayTempo: 'normal',
  });

  ngOnInit() {
    const fixtureId = this.route.snapshot.paramMap.get('fixtureId');
    if (!fixtureId) {
      void this.router.navigateByUrl('/competitions');
      return;
    }

    this.fixtureId.set(fixtureId);
    this.loadPlan(fixtureId);
    this.loadFixture(fixtureId);
  }

  updatePlan<K extends keyof MatchPlan>(key: K, value: MatchPlan[K]) {
    const next = {
      ...this.plan(),
      [key]: value,
    };
    this.plan.set(next);
    window.localStorage.setItem(this.planKey(this.fixtureId()), JSON.stringify(next));
  }

  prediction() {
    const diff = this.homeStrength() - this.awayStrength();
    if (diff > 4) return 'Mandante chega como favorito.';
    if (diff < -4) return 'Visitante chega como favorito.';
    return 'Confronto equilibrado, jogo aberto.';
  }

  simulateNow() {
    const fixtureId = this.fixtureId();
    if (!fixtureId) return;

    this.simulating.set(true);
    this.api.post(`matches/fixtures/${fixtureId}/simulate`, {}).subscribe({
      next: () => {
        this.message.set('Partida simulada. Redirecionando para o dia de jogo...');
        this.isError.set(false);
        this.simulating.set(false);
        void this.router.navigate(['/match-day', fixtureId]);
      },
      error: () => {
        this.message.set('Falha ao simular a partida.');
        this.isError.set(true);
        this.simulating.set(false);
      },
    });
  }

  private loadFixture(fixtureId: string) {
    this.api.get<Fixture>(`competitions/fixtures/${fixtureId}`).subscribe({
      next: (fixture) => {
        this.fixture.set(fixture);
        this.loadClubStrengths(fixture.homeClub.id, fixture.awayClub.id);
      },
      error: () => {
        this.message.set('Falha ao carregar dados do pré-jogo.');
        this.isError.set(true);
      },
    });
  }

  private loadClubStrengths(homeClubId: string, awayClubId: string) {
    this.api.get<ClubPlayersResponse>(`players/club/${homeClubId}`, { page: 1, limit: 18 }).subscribe({
      next: (response) => this.homeStrength.set(this.averageOverall(response.data)),
    });

    this.api.get<ClubPlayersResponse>(`players/club/${awayClubId}`, { page: 1, limit: 18 }).subscribe({
      next: (response) => this.awayStrength.set(this.averageOverall(response.data)),
    });
  }

  private averageOverall(players: Array<{ overall: number }>) {
    if (players.length === 0) return 0;
    const total = players.reduce((sum, player) => sum + player.overall, 0);
    return Math.round(total / players.length);
  }

  private loadPlan(fixtureId: string) {
    const raw = window.localStorage.getItem(this.planKey(fixtureId));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as MatchPlan;
      this.plan.set(parsed);
    } catch {
      this.plan.set({
        homeMentality: 'balanced',
        awayMentality: 'balanced',
        homeTempo: 'normal',
        awayTempo: 'normal',
      });
    }
  }

  private planKey(fixtureId: string) {
    return `bitfoot.matchplan.${fixtureId}`;
  }
}
