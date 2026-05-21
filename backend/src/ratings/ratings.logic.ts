export const INITIAL_RATING = 1000;
export const ELO_K = 32;

export interface RatingParticipant {
  fighterId: number;
}

export interface ExistingRating {
  fighterId: number;
  rating: number;
  fightsCount: number;
}

export interface RatingFight {
  competitor1FighterId: number;
  competitor2FighterId: number;
  winnerFighterId: number | null;
  isFinished: boolean;
  forfeitCardId: number | null;
}

export interface RatingCalculationResult {
  fighterId: number;
  ratingBefore: number;
  ratingAfter: number;
  fightsCountBefore: number;
  fightsCountAfter: number;
  fightsCountDelta: number;
}

interface MutableRating {
  fighterId: number;
  ratingBefore: number;
  ratingAfter: number;
  fightsCountBefore: number;
  fightsCountAfter: number;
}

const expectedScore = (rating: number, opponentRating: number) =>
  1 / (1 + 10 ** ((opponentRating - rating) / 400));

export const calculateNominationRatings = (
  participants: RatingParticipant[],
  existingRatings: ExistingRating[],
  fights: RatingFight[],
): RatingCalculationResult[] => {
  const ratingByFighter = new Map<number, MutableRating>();

  for (const participant of participants) {
    const existing = existingRatings.find(
      (rating) => rating.fighterId === participant.fighterId,
    );
    ratingByFighter.set(participant.fighterId, {
      fighterId: participant.fighterId,
      ratingBefore: existing?.rating ?? INITIAL_RATING,
      ratingAfter: existing?.rating ?? INITIAL_RATING,
      fightsCountBefore: existing?.fightsCount ?? 0,
      fightsCountAfter: existing?.fightsCount ?? 0,
    });
  }

  for (const fight of fights) {
    if (!fight.isFinished || !fight.winnerFighterId || fight.forfeitCardId) {
      continue;
    }

    const first = ratingByFighter.get(fight.competitor1FighterId);
    const second = ratingByFighter.get(fight.competitor2FighterId);
    if (!first || !second) continue;

    const firstWon = fight.winnerFighterId === first.fighterId;
    const secondWon = fight.winnerFighterId === second.fighterId;
    if (!firstWon && !secondWon) continue;

    const firstExpected = expectedScore(first.ratingAfter, second.ratingAfter);
    const secondExpected = expectedScore(second.ratingAfter, first.ratingAfter);

    first.ratingAfter = Math.round(
      first.ratingAfter + ELO_K * ((firstWon ? 1 : 0) - firstExpected),
    );
    second.ratingAfter = Math.round(
      second.ratingAfter + ELO_K * ((secondWon ? 1 : 0) - secondExpected),
    );
    first.fightsCountAfter += 1;
    second.fightsCountAfter += 1;
  }

  return [...ratingByFighter.values()].map((rating) => ({
    fighterId: rating.fighterId,
    ratingBefore: rating.ratingBefore,
    ratingAfter: rating.ratingAfter,
    fightsCountBefore: rating.fightsCountBefore,
    fightsCountAfter: rating.fightsCountAfter,
    fightsCountDelta: rating.fightsCountAfter - rating.fightsCountBefore,
  }));
};
