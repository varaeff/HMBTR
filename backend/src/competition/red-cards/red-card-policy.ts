import {
  BLOCK_GROUP,
  BLOCK_OLYMPIC,
  LIFECYCLE_RESULTS_FIXED,
  STATUS_ACTIVE,
} from '../competition.constants';
import { isFightResultsFixed } from '../competition.helpers';
import type {
  ActiveRedCard,
  RedCardForfeitFight,
} from '../competition-internal.types';

export const canApplyRedCardForfeitToFight = (fight: RedCardForfeitFight) => {
  if (
    !fight.block ||
    fight.block.status !== STATUS_ACTIVE ||
    fight.block.tournament_nomination.is_finished
  ) {
    return false;
  }

  if (fight.block.type === BLOCK_GROUP) {
    return fight.block.lifecycle_state !== LIFECYCLE_RESULTS_FIXED;
  }

  return !isOlympicFightResultsFixed(fight);
};

export const isOlympicFightResultsFixed = (fight: RedCardForfeitFight) => {
  if (fight.block?.type !== BLOCK_OLYMPIC) return false;

  return isFightResultsFixed({
    bracket_round: fight.bracket_round,
    is_bronze: fight.is_bronze,
    block: {
      type: fight.block.type,
      lifecycle_state: fight.block.lifecycle_state,
      round_states: fight.block.round_states ?? [],
    },
  });
};

export const getApplicableRedForFight = (
  fight: RedCardForfeitFight,
  cards: ActiveRedCard[],
) => cards.find((card) => isRedCardApplicableToFight(fight, card));

export const isRedCardApplicableToFight = (
  fight: RedCardForfeitFight,
  card: ActiveRedCard,
) => {
  if (fight.nomination_id !== card.source_nomination_id) return true;
  if (fight.block?.type !== BLOCK_GROUP) return true;
  if (card.source_block_type !== BLOCK_GROUP) {
    return card.fight_id === fight.id;
  }

  // In a group block, a red card forfeits the source fight and later fights only.
  return (
    fight.block_id === card.source_block_id &&
    fight.tournament_id === card.source_tournament_id &&
    fight.nomination_id === card.source_nomination_id &&
    fight.fight_number >= (card.source_fight_number ?? Number.POSITIVE_INFINITY)
  );
};

export const getRedCardLosingCompetitorId = (params: {
  firstCompetitorId: number;
  secondCompetitorId: number;
  firstRed?: ActiveRedCard;
  secondRed?: ActiveRedCard;
}) => {
  if (params.firstRed && !params.secondRed) return params.firstCompetitorId;
  if (!params.firstRed && params.secondRed) return params.secondCompetitorId;
  if (!params.firstRed || !params.secondRed) return null;

  const firstTime = params.firstRed.received_at.getTime();
  const secondTime = params.secondRed.received_at.getTime();

  if (firstTime !== secondTime) {
    return firstTime < secondTime
      ? params.firstCompetitorId
      : params.secondCompetitorId;
  }

  return params.firstRed.id <= params.secondRed.id
    ? params.firstCompetitorId
    : params.secondCompetitorId;
};
