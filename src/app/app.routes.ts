import { Routes } from '@angular/router';
import { DashboardPage } from './features/game/pages/dashboard/dashboard.page';
import { GameShellPage } from './features/game/layouts/game-shell/game-shell.page';
import { CompetitionsPage } from './features/game/pages/competitions/competitions.page';
import { ContractsPage } from './features/game/pages/contracts/contracts.page';
import { ChampionsHistoryPage } from './features/game/pages/champions-history/champions-history.page';
import { CareerPage } from './features/game/pages/career/career.page';
import { FinancesPage } from './features/game/pages/finances/finances.page';
import { InfrastructurePage } from './features/game/pages/infrastructure/infrastructure.page';
import { MatchDayPage } from './features/game/pages/match-day/match-day.page';
import { PreMatchPage } from './features/game/pages/pre-match/pre-match.page';
import { PlayerRankingsPage } from './features/game/pages/player-rankings/player-rankings.page';
import { PlayerDetailPage } from './features/game/pages/player-detail/player-detail.page';
import { RecordsPage } from './features/game/pages/records/records.page';
import { SeasonSummaryPage } from './features/game/pages/season-summary/season-summary.page';
import { SeasonStatsPage } from './features/game/pages/season-stats/season-stats.page';
import { SeasonKickoffPage } from './features/game/pages/season-kickoff/season-kickoff.page';
import { SquadPage } from './features/game/pages/squad/squad.page';
import { TacticsPage } from './features/game/pages/tactics/tactics.page';
import { TransfersPage } from './features/game/pages/transfers/transfers.page';
import { YouthAcademyPage } from './features/game/pages/youth-academy/youth-academy.page';
import { LoadGamePage } from './features/main-menu/pages/load-game/load-game.page';
import { MainMenuPage } from './features/main-menu/pages/main-menu/main-menu.page';
import { NewGamePage } from './features/main-menu/pages/new-game/new-game.page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'menu',
  },
  {
    path: 'menu',
    component: MainMenuPage,
  },
  {
    path: 'new-game',
    component: NewGamePage,
  },
  {
    path: 'load-game',
    component: LoadGamePage,
  },
  {
    path: '',
    component: GameShellPage,
    children: [
      {
        path: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'squad',
        component: SquadPage,
      },
      {
        path: 'players/:id',
        component: PlayerDetailPage,
      },
      {
        path: 'tactics',
        component: TacticsPage,
      },
      {
        path: 'finances',
        component: FinancesPage,
      },
      {
        path: 'infrastructure',
        component: InfrastructurePage,
      },
      {
        path: 'transfers',
        component: TransfersPage,
      },
      {
        path: 'competitions',
        component: CompetitionsPage,
      },
      {
        path: 'contracts',
        component: ContractsPage,
      },
      {
        path: 'career',
        component: CareerPage,
      },
      {
        path: 'season-stats',
        component: SeasonStatsPage,
      },
      {
        path: 'player-rankings',
        component: PlayerRankingsPage,
      },
      {
        path: 'champions-history',
        component: ChampionsHistoryPage,
      },
      {
        path: 'records',
        component: RecordsPage,
      },
      {
        path: 'youth-academy',
        component: YouthAcademyPage,
      },
      {
        path: 'season-summary',
        component: SeasonSummaryPage,
      },
      {
        path: 'season-kickoff',
        component: SeasonKickoffPage,
      },
      {
        path: 'pre-match/:fixtureId',
        component: PreMatchPage,
      },
      {
        path: 'match-day/:fixtureId',
        component: MatchDayPage,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'menu',
  },
];
