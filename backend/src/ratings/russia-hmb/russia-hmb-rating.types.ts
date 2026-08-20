import type { PrismaClient } from '../../generated/prisma/client';

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type RussiaHmbCoefficient = 1 | 2 | 4;

export interface RussiaHmbTournamentNomination {
  id: number;
  tournament_id: number;
  nomination_id: number;
  event_date: Date;
}

export interface RussiaHmbParticipant {
  competitorId: number;
  fighterId: number;
}

export interface RussiaHmbRoundScore {
  round: number;
  competitor1Score: number;
  competitor2Score: number;
}

export interface RussiaHmbFight {
  id: number;
  competitor1Id: number;
  competitor2Id: number;
  winnerCompetitorId: number | null;
  technicalLoserCompetitorId?: number | null;
  competitor1Score: number;
  competitor2Score: number;
  isFinished: boolean;
  roundWin: boolean;
  roundScores: RussiaHmbRoundScore[];
}

export interface RussiaHmbPenalty {
  competitorId: number;
  noShowPenaltyCount: number;
  yellowCardsCount: number;
  activeRedCardsCount: number;
}

export interface RussiaHmbPlacement {
  competitorId: number;
  place: number;
}

export interface RussiaHmbCalculationInput {
  coefficient: RussiaHmbCoefficient;
  participants: RussiaHmbParticipant[];
  fights: RussiaHmbFight[];
  placements: RussiaHmbPlacement[];
  penalties: RussiaHmbPenalty[];
}

export interface RussiaHmbCalculationResult {
  competitorId: number;
  fighterId: number;
  points: number;
  qcPoints: number;
  qnPoints: number;
  qmPoints: number;
  yellowCardsCount: number;
  activeRedCardsCount: number;
  noShowPenaltyCount: number;
}

export interface RussiaHmbFighterIdentity {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  country: { id: number; name: string };
  city: { id: number; name: string };
  club: { id: number; name: string } | null;
}

export interface RussiaHmbRatingResultRow {
  id: number;
  fighter_id: number;
  competitor_id: number;
  points: number;
  qc_points: number;
  qn_points: number;
  qm_points: number;
  yellow_cards_count: number;
  active_red_cards_count: number;
  no_show_penalty_count: number;
  fighter: RussiaHmbFighterIdentity;
}

export interface RussiaHmbTournamentNominationRating {
  calculation: {
    id: number;
    tournament_nomination_id: number;
    tournament_id: number;
    nomination_id: number;
    event_year: number;
    coefficient: number;
    calculated_at: Date;
  };
  results: RussiaHmbRatingResultRow[];
}

export interface RussiaHmbLeaderboardRow {
  fighter_id: number;
  points: number;
  tournaments_count: number;
  fighter: RussiaHmbFighterIdentity;
}

export interface RussiaHmbFighterYearSummary {
  year: number;
  nominations: Array<{
    nomination: {
      id: number;
      name_ru: string;
      name_en: string;
    };
    points: number;
    tournaments_count: number;
  }>;
}
