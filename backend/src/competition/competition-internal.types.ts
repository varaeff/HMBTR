import type { PrismaClient } from '../generated/prisma/client';
import type { RankedCompetitor } from './competition.logic';
import type {
  SCOPE_GROUP,
  SCOPE_OLYMPIC_DOUBLE_RED,
  SCOPE_OLYMPIC_THIRD,
} from './competition.constants';

export type PendingTieScope =
  | typeof SCOPE_GROUP
  | typeof SCOPE_OLYMPIC_THIRD
  | typeof SCOPE_OLYMPIC_DOUBLE_RED;

export interface PendingTieResult {
  blockId: number;
  groupId: number | null;
  fightId?: number | null;
  competitorIds: number[];
  scope: PendingTieScope;
}

export interface GroupRankings {
  stats: RankedCompetitor[];
  manualOrder: number[];
}

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface ActiveRedCard {
  id: number;
  fighter_id: number;
  fight_id: number;
  received_at: Date;
  source_block_id: number | null;
  source_block_type: string | null;
  source_fight_number: number | null;
  source_tournament_id: number | null;
  source_nomination_id: number | null;
}

export interface RedCardForfeitFight {
  id: number;
  tournament_id: number;
  nomination_id: number;
  block_id: number | null;
  fight_number: number;
  bracket_round: number | null;
  is_bronze: boolean | null;
  is_finished: boolean;
  forfeit_card_id: number | null;
  forfeit_withdrawal_id?: number | null;
  rounds: number;
  round_win: boolean;
  block: {
    type: string;
    status: string;
    lifecycle_state: string;
    tournament_nomination: {
      is_finished: boolean;
    };
    round_states?: Array<{
      round: number;
      results_fixed: boolean;
    }>;
  } | null;
}

export interface ActiveWithdrawal {
  id: number;
  tournament_nomination_id: number;
  tournament_id: number;
  nomination_id: number;
  competitor_id: number;
  source: string;
  source_fight_id: number | null;
  source_block_id: number | null;
  source_fight_number: number | null;
  reason: string;
  is_excused: boolean;
}

export interface WithdrawalForfeitFight extends RedCardForfeitFight {
  competitor1_id: number;
  competitor2_id: number;
}
