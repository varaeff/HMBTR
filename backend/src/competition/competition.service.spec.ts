jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../ratings/ratings.service', () => ({
  RatingsService: class RatingsService {},
}));

import { CompetitionService } from './competition.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RatingsService } from '../ratings/ratings.service';

type CreatedFight = {
  competitor1_id: number;
  competitor2_id: number;
  fight_number: number;
  bracket_round: number;
  is_bronze?: boolean;
};

describe('CompetitionService', () => {
  it('creates the bronze fight before the final so fight numbers match display order', async () => {
    const createdFights: CreatedFight[] = [];
    const semifinals = [
      {
        id: 1,
        is_finished: true,
        winner_id: 101,
        competitor1_id: 101,
        competitor2_id: 102,
      },
      {
        id: 2,
        is_finished: true,
        winner_id: 103,
        competitor1_id: 103,
        competitor2_id: 104,
      },
    ];
    const tx = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          tournament_id: 31,
          nomination_id: 5,
          tournament_nomination_id: 15,
          stage: 2,
          bracket_slots: [{}, {}, {}, {}],
        }),
        update: jest.fn(),
      },
      fights: {
        aggregate: jest.fn().mockResolvedValue({
          _max: { fight_number: 10 },
        }),
        findMany: jest.fn().mockResolvedValue(semifinals),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(
          async (params: { where: { is_bronze?: boolean } }) => {
            const fight = params.where.is_bronze
              ? createdFights.find((createdFight) => createdFight.is_bronze)
              : createdFights.find((createdFight) => !createdFight.is_bronze);

            if (!fight) return null;

            return {
              id: fight.is_bronze ? 12 : 13,
              ...fight,
              is_finished: false,
              winner_id: null,
            };
          },
        ),
        create: jest.fn(
          async (params: {
            data: {
              competitor1_id: number;
              competitor2_id: number;
              fight_number: number;
              bracket_round: number;
              is_bronze?: boolean;
            };
          }) => {
            createdFights.push(params.data);
            return { id: createdFights.length, ...params.data };
          },
        ),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (transaction: typeof tx) => Promise<void>) =>
          callback(tx),
      ),
    };
    const service = new CompetitionService(
      prisma as unknown as PrismaService,
      {} as RatingsService,
    );

    await service.progressOlympicBlock(9);

    expect(createdFights).toEqual([
      expect.objectContaining({
        fight_number: 11,
        is_bronze: true,
      }),
      expect.objectContaining({
        fight_number: 12,
        bracket_round: 2,
      }),
    ]);
  });
});
