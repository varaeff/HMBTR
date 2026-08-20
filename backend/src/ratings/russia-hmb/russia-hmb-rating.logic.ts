import type {
  RussiaHmbCalculationInput,
  RussiaHmbCalculationResult,
  RussiaHmbFight,
  RussiaHmbParticipant,
  RussiaHmbPenalty,
} from './russia-hmb-rating.types';

const WIN_QC_POINTS = 2;
const LOSS_QC_POINTS = 1;
const FIRST_PLACE_QN_POINTS = 6;
const SECOND_PLACE_QN_POINTS = 4;
const THIRD_PLACE_QN_POINTS = 2;
const NO_SHOW_QM_POINTS = 10;
const YELLOW_CARD_QM_POINTS = 10;
const ACTIVE_RED_CARD_QM_POINTS = 30;

interface MutableRussiaHmbResult {
  competitorId: number;
  fighterId: number;
  qcPoints: number;
  qnPoints: number;
  qmPoints: number;
  yellowCardsCount: number;
  activeRedCardsCount: number;
  noShowPenaltyCount: number;
}

const placementPoints = (place: number) => {
  if (place === 1) return FIRST_PLACE_QN_POINTS;
  if (place === 2) return SECOND_PLACE_QN_POINTS;
  if (place === 3) return THIRD_PLACE_QN_POINTS;
  return 0;
};

const getLoserCompetitorId = (fight: RussiaHmbFight) => {
  if (fight.winnerCompetitorId === fight.competitor1Id) {
    return fight.competitor2Id;
  }

  if (fight.winnerCompetitorId === fight.competitor2Id) {
    return fight.competitor1Id;
  }

  return null;
};

const lostButScoredAtLeastHalf = (fight: RussiaHmbFight) => {
  if (fight.winnerCompetitorId === fight.competitor1Id) {
    return fight.competitor2Score * 2 >= fight.competitor1Score;
  }

  if (fight.winnerCompetitorId === fight.competitor2Id) {
    return fight.competitor1Score * 2 >= fight.competitor2Score;
  }

  return false;
};

const lostButWonOrDrewRound = (fight: RussiaHmbFight) =>
  fight.roundScores.some((round) => {
    if (fight.winnerCompetitorId === fight.competitor1Id) {
      return round.competitor2Score >= round.competitor1Score;
    }

    if (fight.winnerCompetitorId === fight.competitor2Id) {
      return round.competitor1Score >= round.competitor2Score;
    }

    return false;
  });

const loserReceivesPoint = (fight: RussiaHmbFight) => {
  if (fight.technicalLoserCompetitorId === getLoserCompetitorId(fight)) {
    return false;
  }

  if (fight.roundWin) {
    return lostButWonOrDrewRound(fight);
  }

  return lostButScoredAtLeastHalf(fight) || lostButWonOrDrewRound(fight);
};

const emptyResult = (
  participant: RussiaHmbParticipant,
): MutableRussiaHmbResult => ({
  competitorId: participant.competitorId,
  fighterId: participant.fighterId,
  qcPoints: 0,
  qnPoints: 0,
  qmPoints: 0,
  yellowCardsCount: 0,
  activeRedCardsCount: 0,
  noShowPenaltyCount: 0,
});

const applyPenalty = (
  result: MutableRussiaHmbResult,
  penalty: RussiaHmbPenalty,
) => {
  result.noShowPenaltyCount += penalty.noShowPenaltyCount;
  result.yellowCardsCount += penalty.yellowCardsCount;
  result.activeRedCardsCount += penalty.activeRedCardsCount;
  result.qmPoints +=
    penalty.noShowPenaltyCount * NO_SHOW_QM_POINTS +
    penalty.yellowCardsCount * YELLOW_CARD_QM_POINTS +
    penalty.activeRedCardsCount * ACTIVE_RED_CARD_QM_POINTS;
};

export const calculateRussiaHmbRatings = (
  input: RussiaHmbCalculationInput,
): RussiaHmbCalculationResult[] => {
  const resultByCompetitorId = new Map<number, MutableRussiaHmbResult>();

  for (const participant of input.participants) {
    resultByCompetitorId.set(participant.competitorId, emptyResult(participant));
  }

  for (const fight of input.fights) {
    if (!fight.isFinished || !fight.winnerCompetitorId) continue;

    const winner = resultByCompetitorId.get(fight.winnerCompetitorId);
    const loserCompetitorId = getLoserCompetitorId(fight);
    const loser = loserCompetitorId
      ? resultByCompetitorId.get(loserCompetitorId)
      : undefined;

    if (winner) {
      winner.qcPoints += WIN_QC_POINTS;
    }

    if (loser && loserReceivesPoint(fight)) {
      loser.qcPoints += LOSS_QC_POINTS;
    }
  }

  for (const placement of input.placements) {
    const result = resultByCompetitorId.get(placement.competitorId);
    if (result) {
      result.qnPoints += placementPoints(placement.place);
    }
  }

  for (const penalty of input.penalties) {
    const result = resultByCompetitorId.get(penalty.competitorId);
    if (result) {
      applyPenalty(result, penalty);
    }
  }

  return [...resultByCompetitorId.values()]
    .map((result) => ({
      competitorId: result.competitorId,
      fighterId: result.fighterId,
      qcPoints: result.qcPoints,
      qnPoints: result.qnPoints,
      qmPoints: result.qmPoints,
      yellowCardsCount: result.yellowCardsCount,
      activeRedCardsCount: result.activeRedCardsCount,
      noShowPenaltyCount: result.noShowPenaltyCount,
      points: (result.qcPoints + result.qnPoints) * input.coefficient - result.qmPoints,
    }))
    .sort((first, second) => {
      if (first.points !== second.points) return second.points - first.points;
      return first.fighterId - second.fighterId;
    });
};
