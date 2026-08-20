import { BadRequestException } from '@nestjs/common';
import {
  COMPETITION_STATE_CHANGED_MESSAGE,
  BLOCK_GROUP,
  LIFECYCLE_RESULTS_FIXED,
} from './competition.constants';

export const assertSingleTransition = (count: number) => {
  if (count !== 1) {
    throw new BadRequestException(COMPETITION_STATE_CHANGED_MESSAGE);
  }
};

export const getGroupLetter = (index: number) =>
  String.fromCharCode(65 + index);

export const isForfeitFight = (fight?: {
  forfeit_card_id?: number | null;
  forfeit_withdrawal_id?: number | null;
}) =>
  (fight?.forfeit_card_id !== null && fight?.forfeit_card_id !== undefined) ||
  (fight?.forfeit_withdrawal_id !== null &&
    fight?.forfeit_withdrawal_id !== undefined);

export const emptyFightScoreData = {
  competitor1_score: 0,
  competitor2_score: 0,
  winner_id: null,
  is_finished: false,
  forfeit_card_id: null,
  forfeit_withdrawal_id: null,
};

export const isFightResultsFixed = (fight: {
  bracket_round: number | null;
  is_bronze: boolean | null;
  block: {
    type: string;
    lifecycle_state: string;
    round_states: Array<{ round: number; results_fixed: boolean }>;
  };
}) => {
  if (fight.block.type === BLOCK_GROUP) {
    return fight.block.lifecycle_state === LIFECYCLE_RESULTS_FIXED;
  }

  const finalRound = Math.max(
    ...fight.block.round_states.map((item) => item.round),
  );

  return fight.block.round_states.some(
    (state) =>
      state.results_fixed &&
      (state.round === fight.bracket_round ||
        (fight.is_bronze && state.round === finalRound)),
  );
};
