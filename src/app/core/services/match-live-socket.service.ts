import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

type TeamSide = 'home' | 'away';
export type LiveTactic = 'defensive' | 'balanced' | 'attacking';

export interface LiveCoachAction {
  minute: number;
  type: 'substitution' | 'tactic';
  team: TeamSide;
  text: string;
}

export interface LiveMatchState {
  fixtureId: string;
  minute: number;
  isPlaying: boolean;
  speedMs: number;
  score: {
    home: number;
    away: number;
  };
  tactics: {
    home: LiveTactic;
    away: LiveTactic;
  };
  momentum: {
    home: number;
    away: number;
  };
  ball: {
    x: number;
    y: number;
  };
  commentary: string | null;
  events: Array<{ minute: number; description: string }>;
  coachActions: LiveCoachAction[];
}

@Injectable({ providedIn: 'root' })
export class MatchLiveSocketService {
  private socket: Socket | null = null;
  private currentFixtureId: string | null = null;

  readonly connected = signal(false);
  readonly state = signal<LiveMatchState | null>(null);
  readonly lastError = signal<string | null>(null);

  connect() {
    if (this.socket) {
      return;
    }

    this.socket = io('http://localhost:3000/match-live', {
      transports: ['websocket'],
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      this.lastError.set(null);
      if (this.currentFixtureId) {
        this.joinMatch(this.currentFixtureId);
      }
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
    });

    this.socket.on('match_state', (state: LiveMatchState) => {
      this.state.set(state);
    });

    this.socket.on('match_error', (payload: { message?: string }) => {
      this.lastError.set(payload?.message ?? 'Erro no realtime da partida.');
    });
  }

  disconnect() {
    if (!this.socket) {
      return;
    }

    if (this.currentFixtureId) {
      this.socket.emit('leave_match', { fixtureId: this.currentFixtureId });
    }

    this.socket.disconnect();
    this.socket = null;
    this.currentFixtureId = null;
    this.connected.set(false);
    this.state.set(null);
  }

  joinMatch(fixtureId: string) {
    this.connect();
    this.currentFixtureId = fixtureId;
    this.socket?.emit('join_match', { fixtureId });
  }

  control(fixtureId: string, action: 'start' | 'pause' | 'resume' | 'step' | 'reset' | 'speed', speedMs?: number) {
    this.socket?.emit('match_control', {
      fixtureId,
      action,
      speedMs,
    });
  }

  coachAction(
    fixtureId: string,
    payload: { team: TeamSide; type: 'substitution' | 'tactic'; tactic?: LiveTactic },
  ) {
    this.socket?.emit('coach_action', {
      fixtureId,
      ...payload,
    });
  }
}
