import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface SaveCompetition {
  seasonId: string;
  competitionId: string;
  competitionName: string;
  competitionType: 'league' | 'cup' | 'continental';
  seasonYear: number;
  currentRound: number;
  totalRounds: number;
  status: 'ongoing' | 'finished';
}

interface Standing {
  id: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  groupName?: string | null;
  club: {
    id: string;
    name: string;
  };
}

interface Fixture {
  id: string;
  round: number;
  matchDate: string;
  status: 'scheduled' | 'played';
  stage: 'league' | 'group' | 'knockout';
  groupName?: string | null;
  knockoutRound?: 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final' | null;
  homeScore: number | null;
  awayScore: number | null;
  homeClub: {
    id: string;
    name: string;
  };
  awayClub: {
    id: string;
    name: string;
  };
}

interface FixtureResponse {
  data: Fixture[];
  availableRounds: number[];
}

interface GroupStanding {
  groupName: string;
  table: Standing[];
}

interface KnockoutStage {
  round: string;
  matches: Fixture[];
}

interface TopScorer {
  playerId: string;
  name: string;
  clubId: string | null;
  clubName: string;
  goals: number;
}

interface SimulatedRoundResponse {
  seasonId: string;
  round: number;
  currentRound: number;
  status: 'ongoing' | 'finished';
  matchesSimulated: number;
}

interface AdvanceDayResponse {
  saveId: string;
  currentDate: string;
  seasonYear: number;
}

interface AdvanceToNextMatchResponse {
  saveId: string;
  currentDate: string;
  nextFixture: {
    fixtureId: string;
    seasonId: string;
    matchDate: string;
    round: number;
  } | null;
  message?: string;
}

@Component({
  selector: 'app-competitions-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Competições</h1>
          <a routerLink="/dashboard" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (feedback()) {
          <p class="text-sm" [class.text-emerald-300]="!feedbackError()" [class.text-rose-300]="feedbackError()">
            {{ feedback() }}
          </p>
        }

        <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-semibold">Competições do save</h2>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="advanceToNextMatch()"
                [disabled]="advancingDay()"
                class="rounded bg-sky-500 px-3 py-1 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Até próximo jogo
              </button>
              <button
                type="button"
                (click)="advanceDay()"
                [disabled]="advancingDay()"
                class="rounded bg-slate-600 px-3 py-1 text-sm font-semibold text-slate-100 hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Avançar dia
              </button>
              <button
                type="button"
                (click)="advanceSeason()"
                [disabled]="advancingSeason()"
                class="rounded bg-indigo-500 px-3 py-1 text-sm font-semibold text-slate-100 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Avançar temporada
              </button>
              <a
                routerLink="/season-summary"
                class="rounded bg-violet-500 px-3 py-1 text-sm font-semibold text-slate-100 hover:bg-violet-400"
              >
                Ver resumo
              </a>
              <button
                type="button"
                (click)="setupCompetitions()"
                [disabled]="settingUpCompetitions()"
                class="rounded bg-emerald-500 px-3 py-1 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Gerar calendário
              </button>
            </div>
          </div>

          <div class="grid gap-2">
            @for (competition of competitions(); track competition.seasonId) {
              <button
                type="button"
                (click)="selectSeason(competition.seasonId)"
                class="rounded border px-3 py-2 text-left"
                [class.border-emerald-400]="selectedSeasonId() === competition.seasonId"
                [class.border-slate-700]="selectedSeasonId() !== competition.seasonId"
              >
                <p class="font-semibold">{{ competition.competitionName }}</p>
                <p class="text-xs text-slate-400">
                  Temporada {{ competition.seasonYear }} • Rodada {{ competition.currentRound }}/{{ competition.totalRounds }}
                </p>
              </button>
            }
            @if (competitions().length === 0) {
              <p class="text-sm text-slate-400">Nenhuma competição gerada para este save.</p>
            }
          </div>
        </div>

        @if (selectedCompetition()) {
          <div class="grid gap-6 lg:grid-cols-3">
            @if (selectedCompetition()?.competitionType === 'league') {
              <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 lg:col-span-2">
                <h3 class="mb-3 text-lg font-semibold">Tabela de classificação</h3>
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[760px] border-collapse text-sm">
                    <thead class="text-left text-xs text-slate-400">
                      <tr>
                        <th class="border-b border-slate-800 px-2 py-2">#</th>
                        <th class="border-b border-slate-800 px-2 py-2">Clube</th>
                        <th class="border-b border-slate-800 px-2 py-2">PTS</th>
                        <th class="border-b border-slate-800 px-2 py-2">J</th>
                        <th class="border-b border-slate-800 px-2 py-2">V</th>
                        <th class="border-b border-slate-800 px-2 py-2">E</th>
                        <th class="border-b border-slate-800 px-2 py-2">D</th>
                        <th class="border-b border-slate-800 px-2 py-2">GP</th>
                        <th class="border-b border-slate-800 px-2 py-2">GC</th>
                        <th class="border-b border-slate-800 px-2 py-2">SG</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of standings(); track item.id) {
                        <tr class="odd:bg-slate-950/60" [class.bg-emerald-500/10]="item.position <= 4" [class.bg-rose-500/10]="item.position > standings().length - 2">
                          <td class="px-2 py-2">{{ item.position }}</td>
                          <td class="px-2 py-2">{{ item.club.name }}</td>
                          <td class="px-2 py-2 font-semibold">{{ item.points }}</td>
                          <td class="px-2 py-2">{{ item.played }}</td>
                          <td class="px-2 py-2">{{ item.wins }}</td>
                          <td class="px-2 py-2">{{ item.draws }}</td>
                          <td class="px-2 py-2">{{ item.losses }}</td>
                          <td class="px-2 py-2">{{ item.goalsFor }}</td>
                          <td class="px-2 py-2">{{ item.goalsAgainst }}</td>
                          <td class="px-2 py-2">{{ item.goalDifference }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            } @else {
              <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 lg:col-span-2">
                <h3 class="mb-3 text-lg font-semibold">Fase de grupos</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                  @for (group of groupStandings(); track group.groupName) {
                    <div class="rounded border border-slate-800 bg-slate-950 p-3">
                      <p class="mb-2 text-sm font-semibold text-emerald-300">{{ group.groupName }}</p>
                      <table class="w-full border-collapse text-xs">
                        <thead class="text-left text-slate-400">
                          <tr>
                            <th class="px-1 py-1">#</th>
                            <th class="px-1 py-1">Clube</th>
                            <th class="px-1 py-1">PTS</th>
                            <th class="px-1 py-1">SG</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (item of group.table; track item.id) {
                            <tr [class.bg-emerald-500/10]="item.position <= 2">
                              <td class="px-1 py-1">{{ item.position }}</td>
                              <td class="px-1 py-1">{{ item.club.name }}</td>
                              <td class="px-1 py-1">{{ item.points }}</td>
                              <td class="px-1 py-1">{{ item.goalDifference }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 class="mb-3 text-lg font-semibold">Artilharia</h3>
              <div class="grid gap-2">
                @for (item of topScorers(); track item.playerId) {
                  <div class="rounded bg-slate-950 px-3 py-2 text-sm">
                    <p class="font-semibold">{{ item.name }}</p>
                    <p class="text-xs text-slate-400">{{ item.clubName }}</p>
                    <p class="text-xs text-emerald-300">{{ item.goals }} gols</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-lg font-semibold">Calendário de jogos</h3>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="simulateCurrentRound()"
                  [disabled]="simulatingRound() || !selectedCompetition() || selectedCompetition()?.status === 'finished'"
                  class="rounded bg-emerald-500 px-3 py-1 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Simular rodada
                </button>
                <select
                  [value]="selectedRound()"
                  (change)="changeRound(+$any($event.target).value)"
                  class="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                >
                  @for (round of rounds(); track round) {
                    <option [value]="round">Rodada {{ round }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="grid gap-2">
              @for (fixture of fixtures(); track fixture.id) {
                <div class="flex items-center justify-between rounded bg-slate-950 px-3 py-2 text-sm">
                  <div class="text-xs text-slate-400">{{ fixture.matchDate }}</div>
                  <div class="font-semibold">{{ fixture.homeClub.name }} x {{ fixture.awayClub.name }}</div>
                  <div class="flex items-center gap-3">
                    @if (fixture.status === 'scheduled') {
                      <a [routerLink]="['/pre-match', fixture.id]" class="text-xs text-sky-300 hover:text-sky-200">
                        Pré-jogo
                      </a>
                    }
                    <a [routerLink]="['/match-day', fixture.id]" class="text-xs text-emerald-300 hover:text-emerald-200">
                      Dia de jogo
                    </a>
                    <div class="text-xs" [class.text-slate-400]="fixture.status === 'scheduled'" [class.text-emerald-300]="fixture.status === 'played'">
                      {{ fixture.status === 'scheduled' ? 'Agendado' : (fixture.homeScore + ' x ' + fixture.awayScore) }}
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          @if (knockoutStages().length > 0) {
            <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 class="mb-3 text-lg font-semibold">Chave mata-mata</h3>
              <div class="grid gap-3">
                @for (stage of knockoutStages(); track stage.round) {
                  <div class="rounded border border-slate-800 bg-slate-950 p-3">
                    <p class="mb-2 text-sm font-semibold text-emerald-300">{{ formatKnockoutRound(stage.round) }}</p>
                    <div class="grid gap-2">
                      @for (match of stage.matches; track match.id) {
                        <div class="flex items-center justify-between rounded bg-slate-900 px-3 py-2 text-sm">
                          <span>{{ match.homeClub.name }} x {{ match.awayClub.name }}</span>
                          <span class="text-xs text-slate-400">{{ match.matchDate }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
      </section>
    </main>
  `,
})
export class CompetitionsPage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly competitions = signal<SaveCompetition[]>([]);
  readonly selectedSeasonId = signal<string | null>(null);
  readonly standings = signal<Standing[]>([]);
  readonly fixtures = signal<Fixture[]>([]);
  readonly groupStandings = signal<GroupStanding[]>([]);
  readonly knockoutStages = signal<KnockoutStage[]>([]);
  readonly rounds = signal<number[]>([]);
  readonly selectedRound = signal<number>(1);
  readonly topScorers = signal<TopScorer[]>([]);
  readonly simulatingRound = signal(false);
  readonly settingUpCompetitions = signal(false);
  readonly advancingSeason = signal(false);
  readonly advancingDay = signal(false);

  readonly feedback = signal<string | null>(null);
  readonly feedbackError = signal(false);

  readonly selectedCompetition = computed(() =>
    this.competitions().find((competition) => competition.seasonId === this.selectedSeasonId()) ?? null,
  );

  ngOnInit() {
    if (!this.gameState.selectedSaveGameId()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.loadCompetitions();
  }

  loadCompetitions(preferredSeasonId?: string) {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) return;

    this.apiService.get<SaveCompetition[]>(`competitions/save/${saveGameId}`).subscribe({
      next: (competitions) => {
        this.competitions.set(competitions);
        const selectedSeasonId =
          preferredSeasonId && competitions.some((item) => item.seasonId === preferredSeasonId)
            ? preferredSeasonId
            : competitions[0]?.seasonId ?? null;

        this.selectedSeasonId.set(selectedSeasonId);
        if (selectedSeasonId) {
          this.loadSeasonData(selectedSeasonId);
        }
      },
      error: () => this.setFeedback('Falha ao carregar competições.', true),
    });
  }

  setupCompetitions() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) return;

    this.settingUpCompetitions.set(true);

    this.apiService.post<SaveCompetition[]>(`competitions/save/${saveGameId}/setup`, {}).subscribe({
      next: () => {
        this.setFeedback('Calendário e competição gerados com sucesso.', false);
        this.loadCompetitions();
        this.settingUpCompetitions.set(false);
      },
      error: (err) => {
        this.setFeedback(this.extractErrorMessage(err, 'Falha ao gerar calendário.'), true);
        this.settingUpCompetitions.set(false);
      },
    });
  }

  simulateCurrentRound() {
    const season = this.selectedCompetition();
    if (!season) {
      return;
    }

    this.simulatingRound.set(true);

    this.apiService
      .post<SimulatedRoundResponse>(`competitions/seasons/${season.seasonId}/simulate-round`, {
        round: season.currentRound,
      })
      .subscribe({
        next: (response) => {
          this.setFeedback(
            `Rodada ${response.round} simulada (${response.matchesSimulated} partidas).`,
            false,
          );
          this.loadCompetitions(season.seasonId);
          this.simulatingRound.set(false);
        },
        error: (err) => {
          this.setFeedback(this.extractErrorMessage(err, 'Falha ao simular rodada.'), true);
          this.simulatingRound.set(false);
        },
      });
  }

  advanceSeason() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) {
      return;
    }

    this.advancingSeason.set(true);

    this.apiService.post(`seasons/save/${saveGameId}/advance`, {}).subscribe({
      next: () => {
        this.setFeedback('Nova temporada iniciada com sucesso.', false);
        this.loadCompetitions();
        this.advancingSeason.set(false);
        void this.router.navigateByUrl('/season-kickoff');
      },
      error: (err) => {
        this.setFeedback(this.extractErrorMessage(err, 'Falha ao avançar temporada.'), true);
        this.advancingSeason.set(false);
      },
    });
  }

  advanceDay() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) return;

    this.advancingDay.set(true);
    this.apiService.post<AdvanceDayResponse>(`seasons/save/${saveGameId}/advance-day`, {}).subscribe({
      next: (response) => {
        this.setFeedback(`Data avançada para ${response.currentDate}.`, false);
        this.loadCompetitions(this.selectedSeasonId() ?? undefined);
        this.advancingDay.set(false);
      },
      error: (err) => {
        this.setFeedback(this.extractErrorMessage(err, 'Falha ao avançar dia.'), true);
        this.advancingDay.set(false);
      },
    });
  }

  advanceToNextMatch() {
    const saveGameId = this.gameState.selectedSaveGameId();
    if (!saveGameId) return;

    this.advancingDay.set(true);
    this.apiService
      .post<AdvanceToNextMatchResponse>(`seasons/save/${saveGameId}/advance-to-next-match`, {})
      .subscribe({
        next: (response) => {
          if (response.nextFixture) {
            this.setFeedback(
              `Data avançada para ${response.currentDate} (Rodada ${response.nextFixture.round}).`,
              false,
            );
          } else {
            this.setFeedback(response.message ?? 'Não há próximo jogo agendado.', false);
          }
          this.loadCompetitions(response.nextFixture?.seasonId ?? this.selectedSeasonId() ?? undefined);
          this.advancingDay.set(false);
        },
        error: (err) => {
          this.setFeedback(this.extractErrorMessage(err, 'Falha ao avançar até o próximo jogo.'), true);
          this.advancingDay.set(false);
        },
      });
  }

  selectSeason(seasonId: string) {
    this.selectedSeasonId.set(seasonId);
    this.loadSeasonData(seasonId);
  }

  changeRound(round: number) {
    this.selectedRound.set(round);
    const seasonId = this.selectedSeasonId();
    if (!seasonId) return;

    this.loadFixtures(seasonId, round);
  }

  private loadSeasonData(seasonId: string) {
    const competition = this.competitions().find((item) => item.seasonId === seasonId);

    if (competition?.competitionType === 'league') {
      this.loadStandings(seasonId);
      this.groupStandings.set([]);
      this.knockoutStages.set([]);
    } else {
      this.standings.set([]);
      this.loadGroupStandings(seasonId);
      this.loadKnockout(seasonId);
    }

    this.loadFixtures(seasonId);
    this.loadTopScorers(seasonId);
  }

  private loadStandings(seasonId: string) {
    this.apiService.get<Standing[]>(`competitions/seasons/${seasonId}/standings`).subscribe({
      next: (standings) => this.standings.set(standings),
      error: () => this.setFeedback('Falha ao carregar classificação.', true),
    });
  }

  private loadGroupStandings(seasonId: string) {
    this.apiService.get<GroupStanding[]>(`competitions/seasons/${seasonId}/group-standings`).subscribe({
      next: (groups) => this.groupStandings.set(groups),
      error: () => this.setFeedback('Falha ao carregar fase de grupos.', true),
    });
  }

  private loadKnockout(seasonId: string) {
    this.apiService.get<KnockoutStage[]>(`competitions/seasons/${seasonId}/knockout`).subscribe({
      next: (stages) => this.knockoutStages.set(stages),
      error: () => this.setFeedback('Falha ao carregar chave mata-mata.', true),
    });
  }

  private loadFixtures(seasonId: string, round?: number) {
    const stage =
      this.selectedCompetition()?.competitionType === 'league'
        ? 'league'
        : this.selectedCompetition()?.competitionType === 'continental'
          ? 'group'
          : 'knockout';

    this.apiService
      .get<FixtureResponse>(`competitions/seasons/${seasonId}/fixtures`, {
        round: round ?? this.selectedRound(),
        stage,
      })
      .subscribe({
        next: (response) => {
          this.fixtures.set(response.data);
          this.rounds.set(response.availableRounds);

          if (!round && response.availableRounds.length > 0) {
            const firstRound = response.availableRounds[0];
            this.selectedRound.set(firstRound);
            this.loadFixtures(seasonId, firstRound);
          }
        },
        error: () => this.setFeedback('Falha ao carregar calendário.', true),
      });
  }

  private loadTopScorers(seasonId: string) {
    this.apiService
      .get<TopScorer[]>(`competitions/seasons/${seasonId}/top-scorers`, {
        limit: 10,
      })
      .subscribe({
        next: (topScorers) => this.topScorers.set(topScorers),
        error: () => this.setFeedback('Falha ao carregar artilharia.', true),
      });
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

  formatKnockoutRound(value: string) {
    if (value === 'round_of_16') return 'Oitavas de final';
    if (value === 'quarterfinal') return 'Quartas de final';
    if (value === 'semifinal') return 'Semifinal';
    if (value === 'final') return 'Final';
    return 'Mata-mata';
  }
}
