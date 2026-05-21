import {
  calculateNominationRatings,
  INITIAL_RATING,
  RatingFight,
} from './ratings.logic';

describe('ratings logic', () => {
  const participants = [
    { fighterId: 1 },
    { fighterId: 2 },
    { fighterId: 3 },
  ];

  it('applies Elo in fight order with rounded ratings', () => {
    const fights: RatingFight[] = [
      {
        competitor1FighterId: 1,
        competitor2FighterId: 2,
        winnerFighterId: 1,
        isFinished: true,
        forfeitCardId: null,
      },
      {
        competitor1FighterId: 1,
        competitor2FighterId: 3,
        winnerFighterId: 3,
        isFinished: true,
        forfeitCardId: null,
      },
    ];

    const result = calculateNominationRatings(participants, [], fights);

    expect(result).toEqual([
      {
        fighterId: 1,
        ratingBefore: INITIAL_RATING,
        ratingAfter: 999,
        fightsCountBefore: 0,
        fightsCountAfter: 2,
        fightsCountDelta: 2,
      },
      {
        fighterId: 2,
        ratingBefore: INITIAL_RATING,
        ratingAfter: 984,
        fightsCountBefore: 0,
        fightsCountAfter: 1,
        fightsCountDelta: 1,
      },
      {
        fighterId: 3,
        ratingBefore: INITIAL_RATING,
        ratingAfter: 1017,
        fightsCountBefore: 0,
        fightsCountAfter: 1,
        fightsCountDelta: 1,
      },
    ]);
  });

  it('does not count red-card forfeits but keeps participant rows', () => {
    const result = calculateNominationRatings(
      participants,
      [],
      [
        {
          competitor1FighterId: 1,
          competitor2FighterId: 2,
          winnerFighterId: 2,
          isFinished: true,
          forfeitCardId: 42,
        },
      ],
    );

    expect(result).toEqual(
      participants.map((participant) => ({
        fighterId: participant.fighterId,
        ratingBefore: INITIAL_RATING,
        ratingAfter: INITIAL_RATING,
        fightsCountBefore: 0,
        fightsCountAfter: 0,
        fightsCountDelta: 0,
      })),
    );
  });

  it('continues from existing nomination ratings', () => {
    const result = calculateNominationRatings(
      participants.slice(0, 2),
      [{ fighterId: 1, rating: 1100, fightsCount: 5 }],
      [
        {
          competitor1FighterId: 1,
          competitor2FighterId: 2,
          winnerFighterId: 2,
          isFinished: true,
          forfeitCardId: null,
        },
      ],
    );

    expect(result).toEqual([
      {
        fighterId: 1,
        ratingBefore: 1100,
        ratingAfter: 1080,
        fightsCountBefore: 5,
        fightsCountAfter: 6,
        fightsCountDelta: 1,
      },
      {
        fighterId: 2,
        ratingBefore: INITIAL_RATING,
        ratingAfter: 1020,
        fightsCountBefore: 0,
        fightsCountAfter: 1,
        fightsCountDelta: 1,
      },
    ]);
  });
});
