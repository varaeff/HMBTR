import { PrismaService } from '../prisma/prisma.service';
import { RatingCalculationReader } from './calculation/rating-calculation-reader.service';
import { RatingPersistenceService } from './calculation/rating-persistence.service';
import { FighterRatingProfileService } from './profile/fighter-rating-profile.service';
import { STATUS_CALCULATED, STATUS_FAILED } from './ratings.constants';
import type { PrismaTx } from './ratings-internal.types';
import type { RatingCalculationResult } from './ratings.logic';

interface RatingUpsertArg {
  create: {
    fighter_id: number;
    fights_count: number;
    nomination_id: number;
    rating: number;
  };
  update: {
    fights_count: number;
    rating: number;
  };
  where: {
    nomination_id_fighter_id: {
      fighter_id: number;
      nomination_id: number;
    };
  };
}

interface RatingHistoryCreateManyArg {
  data: Array<{
    fighter_id: number;
    fights_count_delta: number;
    nomination_id: number;
    rating_after: number;
    rating_before: number;
    tournament_id: number;
    tournament_nomination_id: number;
  }>;
}

interface TournamentNominationUpdateArg {
  data: {
    rating_calculated_at: Date;
    rating_error: string | null;
    rating_status: string;
  };
  where: { id: number };
}

interface TournamentNominationUpdateManyArg {
  data: {
    rating_error: string;
    rating_status: string;
  };
  where: {
    id: number;
    rating_status: { not: string };
  };
}

describe('RatingCalculationReader', () => {
  it('maps finished fights to rating fights by winner fighter id', async () => {
    const findMany = jest.fn<
      Promise<
        Array<{
          competitor1_id: number;
          competitor2_id: number;
          competitor1: { fighter_id: number };
          competitor2: { fighter_id: number };
          winner_id: number | null;
          is_finished: boolean;
          forfeit_card_id: number | null;
        }>
      >,
      [unknown]
    >();
    findMany.mockResolvedValue([
      {
        competitor1_id: 101,
        competitor2_id: 202,
        competitor1: { fighter_id: 1 },
        competitor2: { fighter_id: 2 },
        winner_id: 202,
        is_finished: true,
        forfeit_card_id: null,
      },
      {
        competitor1_id: 303,
        competitor2_id: 404,
        competitor1: { fighter_id: 3 },
        competitor2: { fighter_id: 4 },
        winner_id: 303,
        is_finished: true,
        forfeit_card_id: 50,
      },
    ]);
    const reader = new RatingCalculationReader();
    const tx = { fights: { findMany } } as unknown as PrismaTx;

    await expect(reader.getRatingFightsTx(tx, 10, 20)).resolves.toEqual([
      {
        competitor1FighterId: 1,
        competitor2FighterId: 2,
        winnerFighterId: 2,
        isFinished: true,
        forfeitCardId: null,
      },
      {
        competitor1FighterId: 3,
        competitor2FighterId: 4,
        winnerFighterId: 3,
        isFinished: true,
        forfeitCardId: 50,
      },
    ]);
  });
});

describe('RatingPersistenceService', () => {
  it('persists current ratings, history rows and calculated status', async () => {
    const upsert = jest.fn<Promise<void>, [RatingUpsertArg]>();
    const createMany = jest.fn<Promise<void>, [RatingHistoryCreateManyArg]>();
    const update = jest.fn<Promise<void>, [TournamentNominationUpdateArg]>();
    const service = new RatingPersistenceService({} as PrismaService);
    const tx = {
      fighter_nomination_rating_history: { createMany },
      fighter_nomination_ratings: { upsert },
      tournament_nominations: { update },
    } as unknown as PrismaTx;
    const tournamentNomination = {
      id: 5,
      tournament_id: 10,
      nomination_id: 20,
    };
    const calculation: RatingCalculationResult[] = [
      {
        fighterId: 1,
        ratingBefore: 1000,
        ratingAfter: 1016,
        fightsCountBefore: 0,
        fightsCountAfter: 1,
        fightsCountDelta: 1,
      },
    ];

    await service.saveCalculationTx(tx, tournamentNomination, calculation);
    await service.markCalculatedTx(tx, tournamentNomination);

    expect(upsert.mock.calls[0][0].create).toMatchObject({
      fighter_id: 1,
      nomination_id: 20,
      rating: 1016,
    });
    expect(createMany.mock.calls[0][0].data[0]).toMatchObject({
      fighter_id: 1,
      tournament_id: 10,
      tournament_nomination_id: 5,
    });
    expect(update.mock.calls[0][0]).toMatchObject({
      where: { id: 5 },
      data: {
        rating_error: null,
        rating_status: STATUS_CALCULATED,
      },
    });
  });

  it('marks failed unless the nomination was already calculated', async () => {
    const updateMany = jest.fn<
      Promise<void>,
      [TournamentNominationUpdateManyArg]
    >();
    const service = new RatingPersistenceService({
      tournament_nominations: { updateMany },
    } as unknown as PrismaService);

    await service.markFailed(5, 'boom');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 5,
        rating_status: { not: STATUS_CALCULATED },
      },
      data: {
        rating_status: STATUS_FAILED,
        rating_error: 'boom',
      },
    });
  });
});

describe('FighterRatingProfileService', () => {
  it('builds profile stats from completed nominations only', async () => {
    const service = new FighterRatingProfileService({
      competitors: {
        findMany: jest.fn().mockResolvedValue([
          {
            tournament_id: 10,
            nomination_id: 20,
            tournament: {
              id: 10,
              name: 'Open Cup',
              event_date: new Date('2026-05-20T00:00:00.000Z'),
              nominations: [{ nomination_id: 20 }],
            },
            nomination: { id: 20, name_ru: 'До 70', name_en: 'Under 70' },
          },
          {
            tournament_id: 11,
            nomination_id: 21,
            tournament: {
              id: 11,
              name: 'Draft Cup',
              event_date: new Date('2026-05-21T00:00:00.000Z'),
              nominations: [],
            },
            nomination: { id: 21, name_ru: 'До 80', name_en: 'Under 80' },
          },
        ]),
      },
      fighter_nomination_rating_history: {
        findMany: jest.fn().mockResolvedValue([
          {
            nomination_id: 20,
            rating_before: 1000,
            rating_after: 1016,
            fights_count_delta: 1,
            created_at: new Date('2026-05-20T12:00:00.000Z'),
            tournament: {
              id: 10,
              name: 'Open Cup',
              event_date: new Date('2026-05-20T00:00:00.000Z'),
            },
          },
        ]),
      },
      fighter_nomination_ratings: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              nomination_id: 20,
              rating: 1016,
              fights_count: 1,
              nomination: { id: 20, name_ru: 'До 70', name_en: 'Under 70' },
            },
          ])
          .mockResolvedValueOnce([
            { nomination_id: 20, fighter_id: 7 },
            { nomination_id: 20, fighter_id: 1 },
          ]),
      },
      fighters: {
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
      },
      fights: {
        findMany: jest.fn().mockResolvedValue([
          {
            tournament_id: 10,
            nomination_id: 20,
            competitor1_id: 100,
            competitor2_id: 200,
            winner_id: 100,
            competitor1: { fighter_id: 1 },
            competitor2: { fighter_id: 2 },
          },
          {
            tournament_id: 11,
            nomination_id: 21,
            competitor1_id: 300,
            competitor2_id: 400,
            winner_id: 300,
            competitor1: { fighter_id: 1 },
            competitor2: { fighter_id: 3 },
          },
        ]),
      },
    } as unknown as PrismaService);

    await expect(service.findFighterProfile(1)).resolves.toMatchObject({
      fights: {
        total: { fights: 1, wins: 1 },
        by_nomination: [
          {
            fights: 1,
            wins: 1,
            nomination: { id: 20 },
          },
        ],
      },
      ratings: [
        {
          fights_count: 1,
          place: 2,
          rating: 1016,
          total_fighters: 2,
        },
      ],
      tournaments: [
        {
          tournament_id: 10,
          tournament_name: 'Open Cup',
        },
      ],
    });
  });
});
