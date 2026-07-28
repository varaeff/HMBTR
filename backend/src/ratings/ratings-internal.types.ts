import { PrismaService } from '../prisma/prisma.service';

export type PrismaTx = Omit<
  PrismaService,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$extends'
  | 'onModuleInit'
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
  nomination: FighterProfileNomination;
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
}

export interface RatingTournamentNomination {
  id: number;
  tournament_id: number;
  nomination_id: number;
}
