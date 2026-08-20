import type { PrismaClient } from '../generated/prisma/client';

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface FighterProfileNomination {
  id: number;
  name_ru: string;
  name_en: string;
}

export interface FighterProfileTournament {
  tournament_id: number;
  tournament_name: string;
  event_date: Date | null;
  nominations: Array<{
    nomination: FighterProfileNomination;
    russia_hmb_rating_points: number | null;
  }>;
}

export interface FighterFightCounter {
  fights: number;
  wins: number;
}

export interface FighterNominationFightCounter extends FighterFightCounter {
  nomination: FighterProfileNomination;
}

export interface FighterRatingHistoryPoint {
  tournament_id: number;
  tournament_name: string;
  event_date: Date | null;
  rating_before: number;
  rating_after: number;
  fights_count_delta: number;
  created_at: Date;
}

export interface FighterRatingSummary {
  nomination: FighterProfileNomination;
  place: number;
  total_fighters: number;
  rating: number;
  fights_count: number;
  history: FighterRatingHistoryPoint[];
}

export interface FighterProfileStats {
  tournaments: FighterProfileTournament[];
  fights: {
    total: FighterFightCounter;
    by_nomination: FighterNominationFightCounter[];
  };
  ratings: FighterRatingSummary[];
  russia_hmb_ratings: Array<{
    year: number;
    nominations: Array<{
      nomination: FighterProfileNomination;
      points: number;
      tournaments_count: number;
    }>;
  }>;
}

export interface RatingTournamentNomination {
  id: number;
  tournament_id: number;
  nomination_id: number;
}
