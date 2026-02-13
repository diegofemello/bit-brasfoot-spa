import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { LiveTactic, MatchLiveSocketService } from '../../../../core/services/match-live-socket.service';

interface Fixture {
  id: string;
  matchDate: string;
  status: 'scheduled' | 'played';
  homeScore: number | null;
  awayScore: number | null;
  homeClub: { id: string; name: string };
  awayClub: { id: string; name: string };
}

interface MatchDetail {
  match: {
    id: string;
    homeScore: number;
    awayScore: number;
    homePossession: number;
    awayPossession: number;
    homeShots: number;
    awayShots: number;
  };
  timeline: Array<{ minute: number; homeScore: number; awayScore: number; commentary: string }>;
  events: Array<{ minute: number; description: string }>;
  ratings: Array<{ rating: number; player: { name: string } }>;
}

type TeamSide = 'home' | 'away';
type PlayPhase = 'neutral' | 'attack-home' | 'attack-away' | 'set-piece' | 'goal';

@Component({
  selector: 'app-match-day-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <section class="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Dia de Jogo</h1>
          <a routerLink="/competitions" class="text-sm text-emerald-300 hover:text-emerald-200">Voltar</a>
        </div>

        @if (fixture()) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p class="text-sm text-slate-400">{{ fixture()?.matchDate }}</p>
            <h2 class="mt-1 text-xl font-semibold">
              {{ fixture()?.homeClub?.name }} x {{ fixture()?.awayClub?.name }}
            </h2>

            @if (detail()) {
              <p class="mt-2 text-lg font-bold text-emerald-300">
                {{ currentHomeScore() }} x {{ currentAwayScore() }}
              </p>
              <p class="text-xs text-slate-400">Minuto {{ visibleMinute() }} / 90</p>
            }

            @if (fixture()?.status === 'scheduled') {
              <button
                type="button"
                (click)="simulate()"
                [disabled]="simulating() || isPlaying()"
                class="mt-3 rounded bg-emerald-500 px-3 py-1 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Iniciar transmissão ao vivo
              </button>
            }
          </div>
        }

        @if (message()) {
          <p class="text-sm" [class.text-rose-300]="isError()" [class.text-emerald-300]="!isError()">{{ message() }}</p>
        }

        @if (detail()) {
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-3 text-lg font-semibold">Partida ao vivo — Animação 2D</h3>
            <div class="rounded border border-slate-800 bg-emerald-950/20 p-3">
              <div class="relative h-48 overflow-hidden rounded border border-emerald-700/40 bg-emerald-900/20">
                <div class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-emerald-400/40"></div>
                <div class="absolute left-6 top-1/2 h-16 w-8 -translate-y-1/2 border border-emerald-400/50"></div>
                <div class="absolute right-6 top-1/2 h-16 w-8 -translate-y-1/2 border border-emerald-400/50"></div>
                <div class="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/40"></div>

                @for (marker of homeMarkers(); track $index) {
                  <div
                    class="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300"
                    [style.left.%]="marker.x"
                    [style.top.%]="marker.y"
                    [style.transition]="markerTransitionStyle()"
                  ></div>
                }

                @for (marker of awayMarkers(); track $index) {
                  <div
                    class="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300"
                    [style.left.%]="marker.x"
                    [style.top.%]="marker.y"
                    [style.transition]="markerTransitionStyle()"
                  ></div>
                }

                <div
                  class="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                  [style.left.%]="ballPosition()"
                  [style.top.%]="ballVerticalPosition()"
                  [style.transition]="markerTransitionStyle()"
                ></div>
              </div>

              <div class="mt-3 flex items-center justify-between text-xs text-slate-300">
                <span>Minuto {{ visibleMinute() }}'</span>
                <span class="text-slate-400">{{ currentEventLabel() }}</span>
                <span>Tática casa: {{ homeTactic() }}</span>
                <span>Tática fora: {{ awayTactic() }}</span>
              </div>

              @if (!isReadOnlyMatch()) {
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    (click)="togglePlayback()"
                    class="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    {{ isPlaying() ? 'Pausar' : 'Iniciar' }}
                  </button>
                  <button
                    type="button"
                    (click)="stepMinute()"
                    class="rounded bg-slate-700 px-3 py-1 text-xs font-semibold hover:bg-slate-600"
                  >
                    +1 min
                  </button>
                  <button
                    type="button"
                    (click)="resetPlayback()"
                    class="rounded bg-slate-700 px-3 py-1 text-xs font-semibold hover:bg-slate-600"
                  >
                    Reiniciar
                  </button>

                  <div class="ml-2 flex items-center gap-1 text-xs">
                    <span class="text-slate-400">Velocidade</span>
                    <button
                      type="button"
                      (click)="setPlaybackSpeed(900)"
                      class="rounded px-2 py-1"
                      [class.bg-sky-500]="playbackSpeed() === 900"
                      [class.bg-slate-700]="playbackSpeedMs() !== 900"
                    >
                      1x
                    </button>
                    <button
                      type="button"
                      (click)="setPlaybackSpeed(500)"
                      class="rounded px-2 py-1"
                      [class.bg-sky-500]="playbackSpeed() === 500"
                      [class.bg-slate-700]="playbackSpeedMs() !== 500"
                    >
                      2x
                    </button>
                    <button
                      type="button"
                      (click)="setPlaybackSpeed(280)"
                      class="rounded px-2 py-1"
                      [class.bg-sky-500]="playbackSpeed() === 280"
                      [class.bg-slate-700]="playbackSpeedMs() !== 280"
                    >
                      3x
                    </button>
                  </div>
                </div>
              } @else {
                <p class="mt-3 text-xs text-slate-400">Partida finalizada — visualização somente leitura.</p>
              }
            </div>
          </div>

          <div class="grid gap-5 lg:grid-cols-3">
            <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 lg:col-span-2">
              <h3 class="mb-3 text-lg font-semibold">Partida ao vivo (texto)</h3>
              <div id="live-timeline" class="max-h-[420px] space-y-2 overflow-y-auto rounded bg-slate-950 p-3">
                @for (item of visibleTimeline(); track item.minute + '-' + $index) {
                  <div class="text-sm">
                    <span class="font-semibold text-emerald-300">{{ item.minute }}'</span>
                    <span class="ml-2">{{ item.commentary }}</span>
                    <span class="ml-2 text-xs text-slate-400">({{ item.homeScore }} x {{ item.awayScore }})</span>
                  </div>
                }
              </div>
            </div>

            <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 class="mb-3 text-lg font-semibold">Pós-jogo</h3>
              @if (isFinished()) {
                <div class="space-y-1 text-sm">
                  <p>Posse: {{ detail()?.match?.homePossession }}% x {{ detail()?.match?.awayPossession }}%</p>
                  <p>Finalizações: {{ detail()?.match?.homeShots }} x {{ detail()?.match?.awayShots }}</p>
                </div>

                <h4 class="mt-4 text-sm font-semibold text-slate-300">Destaques (notas)</h4>
                <div class="mt-2 space-y-1 text-sm">
                  @for (rating of topRatings(); track rating.player.name) {
                    <p>{{ rating.player.name }} — {{ rating.rating }}</p>
                  }
                </div>
              } @else {
                <p class="text-sm text-slate-400">Estatísticas finais serão exibidas ao término da simulação.</p>
              }

              @if (!isReadOnlyMatch()) {
                <h4 class="mt-5 text-sm font-semibold text-slate-300">Ações do técnico (ao vivo)</h4>
                <div class="mt-2 grid gap-2">
                  <button
                    type="button"
                    (click)="requestSubstitution('home')"
                    class="rounded bg-slate-700 px-3 py-1 text-left text-xs font-semibold hover:bg-slate-600"
                  >
                    Substituição mandante
                  </button>

                  <button
                    type="button"
                    (click)="requestSubstitution('away')"
                    class="rounded bg-slate-700 px-3 py-1 text-left text-xs font-semibold hover:bg-slate-600"
                  >
                    Substituição visitante
                  </button>

                  <button
                    type="button"
                    (click)="toggleHomeTactic()"
                    class="rounded bg-slate-700 px-3 py-1 text-left text-xs font-semibold hover:bg-slate-600"
                  >
                    Trocar tática do mandante
                  </button>

                  <button
                    type="button"
                    (click)="toggleAwayTactic()"
                    class="rounded bg-slate-700 px-3 py-1 text-left text-xs font-semibold hover:bg-slate-600"
                  >
                    Trocar tática do visitante
                  </button>
                </div>
              }
            </div>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 class="mb-2 text-lg font-semibold">Timeline de eventos</h3>
            <div class="space-y-1 text-sm">
              @for (event of visibleEvents(); track event.minute + '-' + $index) {
                <p><span class="text-emerald-300">{{ event.minute }}'</span> {{ event.description }}</p>
              }
              @for (action of visibleCoachActions(); track action.minute + '-' + $index + '-' + action.type) {
                <p>
                  <span class="text-sky-300">{{ action.minute }}'</span>
                  {{ action.text }}
                </p>
              }
            </div>
          </div>
        }
      </section>
    </main>
  `,
})
export class MatchDayPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly matchLiveSocket = inject(MatchLiveSocketService);

  readonly fixture = signal<Fixture | null>(null);
  readonly detail = signal<MatchDetail | null>(null);
  readonly simulating = signal(false);
  readonly message = signal('');
  readonly isError = signal(false);
  readonly loadingDetail = signal(false);
  readonly sessionStarted = signal(false);
  readonly readOnlyMode = signal(false);
  readonly preferredHomeTactic = signal<LiveTactic>('balanced');
  readonly preferredAwayTactic = signal<LiveTactic>('balanced');
  readonly liveState = this.matchLiveSocket.state;

  private fixtureStatusInitialized = false;
  private finalSyncCompletedForFixtureId: string | null = null;

  readonly timelineScrollEffect = effect(() => {
    const minute = this.visibleMinute();
    if (minute <= 0) return;

    setTimeout(() => {
      const container = document.getElementById('live-timeline');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  });

  constructor() {
    effect(() => {
      const lastError = this.matchLiveSocket.lastError();
      if (!lastError) return;
      this.message.set(this.userFriendlyRealtimeError(lastError));
      this.isError.set(true);
    });

    effect(() => {
      const state = this.liveState();
      const fixtureId = this.fixture()?.id;
      if (!state || !fixtureId) return;

      if (state.minute > 0 || state.isPlaying) {
        this.sessionStarted.set(true);
      }

      if (state.minute >= 90) {
        if (this.finalSyncCompletedForFixtureId === fixtureId) {
          return;
        }

        this.finalSyncCompletedForFixtureId = fixtureId;
        this.loadDetail(fixtureId, false);
        this.loadFixture(fixtureId);
        return;
      }

      if (this.finalSyncCompletedForFixtureId === fixtureId) {
        this.finalSyncCompletedForFixtureId = null;
      }
    });
  }

  ngOnInit() {
    const fixtureId = this.route.snapshot.paramMap.get('fixtureId');
    if (!fixtureId) return;

    this.loadStoredPlan(fixtureId);
    this.finalSyncCompletedForFixtureId = null;
    this.loadFixture(fixtureId);

    this.matchLiveSocket.joinMatch(fixtureId);

    setTimeout(() => {
      if (this.isReadOnlyMatch()) {
        this.sessionStarted.set(false);
        return;
      }

      this.matchLiveSocket.control(fixtureId, 'reset');
      this.sessionStarted.set(false);
    }, 180);

    setTimeout(() => {
      if (!this.detail()) {
        this.loadDetail(fixtureId, false);
      }
    }, 250);
  }

  ngOnDestroy() {
    const fixtureId = this.fixture()?.id;
    if (fixtureId) {
      this.matchLiveSocket.control(fixtureId, 'pause');
    }
    this.matchLiveSocket.disconnect();
    this.timelineScrollEffect.destroy();
  }

  topRatings() {
    return [...(this.detail()?.ratings ?? [])].sort((a, b) => b.rating - a.rating).slice(0, 8);
  }

  currentHomeScore() {
    if (this.isReadOnlyMatch()) {
      return this.detail()?.match.homeScore ?? 0;
    }
    if (!this.sessionStarted()) return 0;
    return this.liveState()?.score.home ?? this.detail()?.match.homeScore ?? 0;
  }

  currentAwayScore() {
    if (this.isReadOnlyMatch()) {
      return this.detail()?.match.awayScore ?? 0;
    }
    if (!this.sessionStarted()) return 0;
    return this.liveState()?.score.away ?? this.detail()?.match.awayScore ?? 0;
  }

  isFinished() {
    if (this.isReadOnlyMatch()) return true;
    return this.sessionStarted() && this.visibleMinute() >= 90;
  }

  visibleMinute() {
    if (this.isReadOnlyMatch()) {
      const maxMinute = (this.detail()?.timeline ?? []).at(-1)?.minute;
      return maxMinute ?? 90;
    }
    if (!this.sessionStarted()) return 0;
    return this.liveState()?.minute ?? 0;
  }

  isReadOnlyMatch() {
    return this.readOnlyMode();
  }

  isPlaying() {
    if (this.isReadOnlyMatch()) return false;
    return this.liveState()?.isPlaying ?? false;
  }

  playbackSpeed() {
    return this.liveState()?.speedMs ?? 900;
  }

  playbackSpeedMs() {
    return this.playbackSpeed();
  }

  homeTactic() {
    return this.liveState()?.tactics.home ?? 'balanced';
  }

  awayTactic() {
    return this.liveState()?.tactics.away ?? 'balanced';
  }

  visibleTimeline() {
    if (this.isReadOnlyMatch()) return this.detail()?.timeline ?? [];
    if (!this.sessionStarted()) return [];
    const minute = this.visibleMinute();
    return (this.detail()?.timeline ?? []).filter((item) => item.minute <= minute);
  }

  visibleEvents() {
    if (this.isReadOnlyMatch()) return this.detail()?.events ?? [];
    if (!this.sessionStarted()) return [];
    return this.liveState()?.events ?? [];
  }

  visibleCoachActions() {
    if (this.isReadOnlyMatch()) return [];
    if (!this.sessionStarted()) return [];
    return this.liveState()?.coachActions ?? [];
  }

  ballPosition() {
    if (this.isReadOnlyMatch()) {
      const home = this.detail()?.match.homePossession ?? 50;
      return Math.max(8, Math.min(92, home));
    }

    const base = this.liveState()?.ball.x ?? 50;
    const phase = this.currentPhase();
    const eventTeam = this.eventTeam();
    const minuteWave = Math.sin(this.visibleMinute() / 2.1) * 2.8;

    if (phase === 'goal' && eventTeam === 'home') return 92;
    if (phase === 'goal' && eventTeam === 'away') return 8;
    if (phase === 'set-piece' && eventTeam === 'home') return Math.max(60, Math.min(90, base + 10));
    if (phase === 'set-piece' && eventTeam === 'away') return Math.max(10, Math.min(40, base - 10));
    if (phase === 'attack-home') return Math.max(45, Math.min(92, base + 5 + minuteWave));
    if (phase === 'attack-away') return Math.max(8, Math.min(55, base - 5 + minuteWave));

    return Math.max(8, Math.min(92, base + minuteWave));
  }

  ballVerticalPosition() {
    if (this.isReadOnlyMatch()) {
      return 50;
    }

    const base = this.liveState()?.ball.y ?? 50;
    const phase = this.currentPhase();
    const eventTeam = this.eventTeam();
    const laneWave = Math.cos(this.visibleMinute() / 2.8) * 4.6;

    if (phase === 'goal') {
      return eventTeam === 'home' ? 42 : 58;
    }

    if (phase === 'set-piece') {
      return Math.max(28, Math.min(72, 50 + laneWave));
    }

    return Math.max(16, Math.min(84, base + laneWave));
  }

  homeMarkers() {
    return this.buildTeamMarkers('home');
  }

  awayMarkers() {
    return this.buildTeamMarkers('away');
  }

  currentEventLabel() {
    const phase = this.currentPhase();

    if (phase === 'goal') return '⚽ Lance de gol';
    if (phase === 'set-piece') return '🎯 Bola parada';
    if (phase === 'attack-home') return '▶ Pressão do mandante';
    if (phase === 'attack-away') return '◀ Pressão do visitante';
    return '⏱ Jogo corrido';
  }

  private buildTeamMarkers(side: TeamSide) {
    const minute = this.visibleMinute();
    const ballX = this.ballPosition();
    const ballY = this.ballVerticalPosition();
    const phase = this.currentPhase();

    const homeBase = [
      { x: 10, y: 50 },
      { x: 20, y: 18 },
      { x: 20, y: 38 },
      { x: 20, y: 62 },
      { x: 20, y: 82 },
      { x: 33, y: 30 },
      { x: 33, y: 50 },
      { x: 33, y: 70 },
      { x: 45, y: 24 },
      { x: 48, y: 50 },
      { x: 45, y: 76 },
    ];

    const awayBase = homeBase.map((item) => ({ x: 100 - item.x, y: item.y }));
    const base = side === 'home' ? homeBase : awayBase;

    const phaseAdvance = this.phaseAdvance(side, phase);
    const ballInfluence = side === 'home' ? (ballX - 50) * 0.1 : (50 - ballX) * 0.1;
    const compactness = this.phaseCompactness(phase);

    return base.map((marker, index) => {
      const microWaveX = Math.sin(minute / 2.4 + index * 0.65) * 1.2;
      const microWaveY = Math.cos(minute / 2.2 + index * 0.55) * 1.6;
      const yBias = (ballY - 50) * 0.08;

      return {
        x: Math.max(6, Math.min(94, marker.x + phaseAdvance + ballInfluence + microWaveX)),
        y: Math.max(10, Math.min(90, 50 + (marker.y - 50) * compactness + microWaveY + yBias)),
      };
    });
  }

  private phaseAdvance(side: TeamSide, phase: PlayPhase) {
    if (phase === 'attack-home') return side === 'home' ? 7 : -5;
    if (phase === 'attack-away') return side === 'away' ? -7 : 5;
    if (phase === 'set-piece') {
      const eventTeam = this.eventTeam();
      if (eventTeam === 'home') return side === 'home' ? 9 : -7;
      if (eventTeam === 'away') return side === 'away' ? -9 : 7;
    }
    if (phase === 'goal') {
      const eventTeam = this.eventTeam();
      if (eventTeam === 'home') return side === 'home' ? 10 : -8;
      if (eventTeam === 'away') return side === 'away' ? -10 : 8;
    }
    return 0;
  }

  private phaseCompactness(phase: PlayPhase) {
    if (phase === 'set-piece' || phase === 'goal') return 0.88;
    if (phase === 'attack-home' || phase === 'attack-away') return 0.93;
    return 1;
  }

  private currentPhase(): PlayPhase {
    const latestEvent = this.latestEventAtCurrentMinute();
    if (!latestEvent) {
      const ballX = this.liveState()?.ball.x ?? 50;
      if (ballX >= 58) return 'attack-home';
      if (ballX <= 42) return 'attack-away';
      return 'neutral';
    }

    const text = latestEvent.toLowerCase();
    if (text.includes('gol')) return 'goal';
    if (text.includes('cartão') || text.includes('lesão') || text.includes('substituição')) return 'set-piece';

    const team = this.eventTeam();
    if (team === 'home') return 'attack-home';
    if (team === 'away') return 'attack-away';
    return 'neutral';
  }

  private eventTeam(): TeamSide | null {
    const latestEvent = this.latestVisibleEventDescription();
    if (!latestEvent) return null;

    const homeName = this.fixture()?.homeClub?.name?.toLowerCase() ?? '';
    const awayName = this.fixture()?.awayClub?.name?.toLowerCase() ?? '';
    const lowerEvent = latestEvent.toLowerCase();

    if (homeName && lowerEvent.includes(homeName)) return 'home';
    if (awayName && lowerEvent.includes(awayName)) return 'away';
    if (lowerEvent.includes('mandante')) return 'home';
    if (lowerEvent.includes('visitante')) return 'away';
    return null;
  }

  private latestVisibleEventDescription() {
    const events = this.visibleEvents();
    if (events.length === 0) return null;

    const minute = this.visibleMinute();
    const eventsAtCurrentMinute = events.filter((event) => event.minute === minute);
    const source = eventsAtCurrentMinute.length > 0 ? eventsAtCurrentMinute : events;
    return source[source.length - 1]?.description ?? null;
  }

  private latestEventAtCurrentMinute() {
    const events = this.visibleEvents();
    if (events.length === 0) return null;

    const minute = this.visibleMinute();
    const eventsAtCurrentMinute = events.filter((event) => event.minute === minute);
    return eventsAtCurrentMinute[eventsAtCurrentMinute.length - 1]?.description ?? null;
  }

  markerTransitionStyle() {
    const speed = this.playbackSpeedMs();
    const duration = Math.max(180, Math.min(700, Math.round(speed * 0.72)));
    return `left ${duration}ms ease, top ${duration}ms ease`;
  }

  private userFriendlyRealtimeError(message: string) {
    const normalized = message.toLowerCase();

    if (normalized.includes('uq_matches_fixture_id') || normalized.includes('restrição de unicidade')) {
      return 'A transmissão já está preparada para esta partida. Recarregue a tela e tente novamente.';
    }

    if (normalized.includes('fixtureid é obrigatório')) {
      return 'Não foi possível identificar a partida para transmissão.';
    }

    return 'Não foi possível concluir a ação ao vivo agora. Tente novamente em instantes.';
  }

  requestSubstitution(side: TeamSide) {
    if (this.isReadOnlyMatch()) return;
    if (!this.sessionStarted()) return;
    const fixtureId = this.fixture()?.id;
    if (!fixtureId) return;

    this.matchLiveSocket.coachAction(fixtureId, {
      team: side,
      type: 'substitution',
    });
  }

  toggleHomeTactic() {
    if (this.isReadOnlyMatch()) return;
    if (!this.sessionStarted()) return;
    const fixtureId = this.fixture()?.id;
    if (!fixtureId) return;

    this.matchLiveSocket.coachAction(fixtureId, {
      team: 'home',
      type: 'tactic',
      tactic: this.nextTactic(this.homeTactic()),
    });
  }

  toggleAwayTactic() {
    if (this.isReadOnlyMatch()) return;
    if (!this.sessionStarted()) return;
    const fixtureId = this.fixture()?.id;
    if (!fixtureId) return;

    this.matchLiveSocket.coachAction(fixtureId, {
      team: 'away',
      type: 'tactic',
      tactic: this.nextTactic(this.awayTactic()),
    });
  }

  togglePlayback() {
    if (this.isReadOnlyMatch()) return;
    const fixtureId = this.fixture()?.id;
    if (!fixtureId) return;

    if (this.isPlaying()) {
      this.matchLiveSocket.control(fixtureId, 'pause');
      return;
    }

    const action = this.visibleMinute() > 1 ? 'resume' : 'start';
    this.matchLiveSocket.control(fixtureId, action);
    this.sessionStarted.set(true);

    if (!this.detail()) {
      this.loadDetail(fixtureId, false);
    }
  }

  stepMinute() {
    if (this.isReadOnlyMatch()) return;
    const fixtureId = this.fixture()?.id;
    if (!fixtureId) return;

    this.matchLiveSocket.control(fixtureId, 'step');
    this.sessionStarted.set(true);

    if (!this.detail()) {
      this.loadDetail(fixtureId, false);
    }
  }

  resetPlayback() {
    if (this.isReadOnlyMatch()) return;
    const fixtureId = this.fixture()?.id;
    if (!fixtureId) return;

    this.matchLiveSocket.control(fixtureId, 'reset');
    this.sessionStarted.set(false);
    this.finalSyncCompletedForFixtureId = null;
  }

  setPlaybackSpeed(value: number) {
    if (this.isReadOnlyMatch()) return;
    const fixtureId = this.fixture()?.id;
    if (!fixtureId) return;
    this.matchLiveSocket.control(fixtureId, 'speed', value);
  }

  simulate() {
    if (this.isReadOnlyMatch()) return;
    const fixtureId = this.fixture()?.id;
    if (!fixtureId) return;

    this.readOnlyMode.set(false);
    this.finalSyncCompletedForFixtureId = null;
    this.simulating.set(true);
    this.matchLiveSocket.control(fixtureId, 'start');
    this.sessionStarted.set(true);
    this.loadDetail(fixtureId, false);
    this.message.set('Transmissão iniciada pelo backend em tempo real.');
    this.isError.set(false);
    setTimeout(() => {
      this.loadFixture(fixtureId);
      this.simulating.set(false);
    }, 250);
  }

  private loadFixture(fixtureId: string) {
    this.api.get<Fixture>(`competitions/fixtures/${fixtureId}`).subscribe({
      next: (fixture) => {
        this.fixture.set(fixture);

        if (!this.fixtureStatusInitialized) {
          this.readOnlyMode.set(fixture.status === 'played');
          this.fixtureStatusInitialized = true;
        }

        if (fixture.status === 'played' && this.readOnlyMode()) {
          this.sessionStarted.set(false);
        }
        if (fixture.status === 'played' || this.liveState()) {
          this.loadDetail(fixtureId, false);
          return;
        }

        this.detail.set(null);
      },
    });
  }

  private loadDetail(fixtureId: string, notifyError: boolean) {
    if (this.loadingDetail()) {
      return;
    }

    this.loadingDetail.set(true);
    this.api.getSilently<MatchDetail>(`matches/fixtures/${fixtureId}`).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loadingDetail.set(false);
      },
      error: () => {
        if (notifyError) {
          this.message.set('Partida ainda sem detalhes disponíveis.');
          this.isError.set(true);
        }
        this.loadingDetail.set(false);
      },
    });
  }

  private nextTactic(current: LiveTactic): LiveTactic {
    if (current === 'defensive') return 'balanced';
    if (current === 'balanced') return 'attacking';
    return 'defensive';
  }

  private loadStoredPlan(fixtureId: string) {
    const raw = window.localStorage.getItem(`bitfoot.matchplan.${fixtureId}`);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        homeMentality?: LiveTactic;
        awayMentality?: LiveTactic;
      };
      if (parsed.homeMentality) this.preferredHomeTactic.set(parsed.homeMentality);
      if (parsed.awayMentality) this.preferredAwayTactic.set(parsed.awayMentality);
    } catch {
      this.message.set('Plano tático local inválido, usando padrão realtime do backend.');
    }
  }
}
