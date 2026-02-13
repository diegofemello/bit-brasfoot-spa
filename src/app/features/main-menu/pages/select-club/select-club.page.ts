import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PaginatedResult } from '../../../../core/models/paginated-result.model';
import { ApiService } from '../../../../core/services/api.service';
import { GameStateService } from '../../../../core/services/game-state.service';

interface Country {
  id: string;
  name: string;
  code: string;
  flagEmoji: string;
}

interface League {
  id: string;
  name: string;
  division: number;
  country: Country;
}

interface Club {
  id: string;
  name: string;
  abbreviation: string;
  stadiumName: string;
  league: League;
}

interface SaveGameResponse {
  id: string;
  name: string;
}

@Component({
  selector: 'app-select-club-page',
  imports: [CommonModule],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <h1 class="text-3xl font-bold">Escolha seu clube</h1>

        @if (step() === 1) {
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-semibold text-slate-200">Selecione o país</h2>
            <div class="grid gap-3 sm:grid-cols-2">
              @for (country of countries(); track country.id) {
                <button
                  type="button"
                  (click)="selectCountry(country)"
                  class="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-left hover:border-emerald-400"
                >
                  <span class="text-3xl">{{ country.flagEmoji }}</span>
                  <span class="font-semibold">{{ country.name }}</span>
                </button>
              }
            </div>
            @if (countries().length === 0) {
              <p class="text-slate-400">Carregando países...</p>
            }
          </div>
        }

        @if (step() === 2) {
          <div class="flex flex-col gap-4">
            <button
              type="button"
              (click)="step.set(1)"
              class="w-fit text-sm text-emerald-300 hover:text-emerald-200"
            >
              ← Voltar para países
            </button>
            <h2 class="text-xl font-semibold text-slate-200">
              Selecione a liga - {{ selectedCountry()?.name }}
            </h2>
            <div class="grid gap-3">
              @for (league of leagues(); track league.id) {
                <button
                  type="button"
                  (click)="selectLeague(league)"
                  class="flex flex-col gap-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-left hover:border-emerald-400"
                >
                  <span class="font-semibold">{{ league.name }}</span>
                  <span class="text-sm text-slate-400">Divisão {{ league.division }}</span>
                </button>
              }
            </div>
            @if (leagues().length === 0) {
              <p class="text-slate-400">Carregando ligas...</p>
            }
          </div>
        }

        @if (step() === 3) {
          <div class="flex flex-col gap-4">
            <button
              type="button"
              (click)="step.set(2); loadLeagues()"
              class="w-fit text-sm text-emerald-300 hover:text-emerald-200"
            >
              ← Voltar para ligas
            </button>
            <h2 class="text-xl font-semibold text-slate-200">
              Selecione o clube - {{ selectedLeague()?.name }}
            </h2>
            <div class="grid gap-3 sm:grid-cols-2">
              @for (club of clubs(); track club.id) {
                <button
                  type="button"
                  (click)="selectClub(club)"
                  [disabled]="isCreatingSave()"
                  class="flex flex-col gap-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-left hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span class="font-semibold">{{ club.name }}</span>
                  <span class="text-xs text-slate-400">{{ club.stadiumName }}</span>
                </button>
              }
            </div>
            @if (clubs().length === 0 && !isCreatingSave()) {
              <p class="text-slate-400">Carregando clubes...</p>
            }
            @if (errorMessage()) {
              <p
                class="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              >
                {{ errorMessage() }}
              </p>
            }
          </div>
        }
      </section>
    </main>
  `,
})
export class SelectClubPage {
  private readonly apiService = inject(ApiService);
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  readonly step = signal(1);
  readonly countries = signal<Country[]>([]);
  readonly leagues = signal<League[]>([]);
  readonly clubs = signal<Club[]>([]);

  readonly selectedCountry = signal<Country | null>(null);
  readonly selectedLeague = signal<League | null>(null);
  readonly isCreatingSave = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadCountries();
  }

  loadCountries() {
    this.apiService.get<PaginatedResult<Country>>('countries', { page: 1, limit: 50 }).subscribe({
      next: (result) => this.countries.set(result.data),
    });
  }

  selectCountry(country: Country) {
    this.selectedCountry.set(country);
    this.step.set(2);
    this.loadLeagues();
  }

  loadLeagues() {
    const countryId = this.selectedCountry()?.id;
    if (!countryId) return;

    this.apiService
      .get<PaginatedResult<League>>(`leagues/country/${countryId}`, {
        page: 1,
        limit: 20,
      })
      .subscribe({
        next: (result) => this.leagues.set(result.data),
      });
  }

  selectLeague(league: League) {
    this.selectedLeague.set(league);
    this.step.set(3);
    this.loadClubs();
  }

  loadClubs() {
    const leagueId = this.selectedLeague()?.id;
    if (!leagueId) return;

    this.apiService
      .get<PaginatedResult<Club>>(`clubs/league/${leagueId}`, {
        page: 1,
        limit: 50,
      })
      .subscribe({
        next: (result) => this.clubs.set(result.data),
      });
  }

  selectClub(club: Club) {
    const selectedSaveGameId = this.gameState.selectedSaveGameId();
    const saveName = this.gameState.pendingSaveName();

    this.errorMessage.set(null);
    this.isCreatingSave.set(true);

    if (selectedSaveGameId) {
      this.apiService
        .patch<SaveGameResponse>(`save-games/${selectedSaveGameId}/club`, {
          clubId: club.id,
        })
        .subscribe({
          next: (saveGame) => {
            this.gameState.selectSaveGame(saveGame.id);
            this.gameState.selectClub(club.id);
            this.gameState.clearPendingSaveName();
            void this.router.navigateByUrl('/dashboard');
          },
          error: () => {
            this.errorMessage.set('Não foi possível vincular o clube ao save.');
            this.isCreatingSave.set(false);
          },
        });

      return;
    }

    if (!saveName) {
      this.errorMessage.set('Contexto do save não encontrado. Selecione um save para continuar.');
      this.isCreatingSave.set(false);
      void this.router.navigateByUrl('/load-game');
      return;
    }

    // Criar o save com o clube selecionado
    this.apiService
      .post<SaveGameResponse>('save-games', {
        name: saveName,
        clubId: club.id,
      })
      .subscribe({
        next: (saveGame) => {
          this.gameState.selectSaveGame(saveGame.id);
          this.gameState.selectClub(club.id);
          this.gameState.clearPendingSaveName();
          void this.router.navigateByUrl('/dashboard');
        },
        error: () => {
          this.errorMessage.set('Não foi possível criar o save.');
          this.isCreatingSave.set(false);
        },
      });
  }
}
