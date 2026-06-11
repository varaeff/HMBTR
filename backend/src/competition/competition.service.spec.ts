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
  it('reorders Olympic winners after a non-semifinal round without creating next fights', async () => {
    const slots = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      competitor_id: index + 1,
      slot_position: index + 1,
    }));
    const firstRound = [
      {
        id: 1,
        bracket_round: 1,
        is_bronze: false,
        is_finished: true,
        winner_id: 1,
      },
      {
        id: 2,
        bracket_round: 1,
        is_bronze: false,
        is_finished: true,
        winner_id: 3,
      },
      {
        id: 3,
        bracket_round: 1,
        is_bronze: false,
        is_finished: true,
        winner_id: 5,
      },
      {
        id: 4,
        bracket_round: 1,
        is_bronze: false,
        is_finished: true,
        winner_id: 7,
      },
    ];
    const slotUpdates: Array<{ id: number; slot_position: number }> = [];
    const tx = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          tournament_id: 31,
          nomination_id: 5,
          tournament_nomination_id: 15,
          stage: 2,
          bracket_slots: slots,
        }),
        update: jest.fn(),
      },
      bracket_slots: {
        findMany: jest.fn().mockResolvedValue(slots),
        update: jest.fn(
          async (params: {
            where: { id: number };
            data: { slot_position: number };
          }) => {
            slotUpdates.push({
              id: params.where.id,
              slot_position: params.data.slot_position,
            });
          },
        ),
      },
      fights: {
        aggregate: jest.fn().mockResolvedValue({
          _max: { fight_number: 10 },
        }),
        findMany: jest.fn(
          async (params: { where: { bracket_round: number } }) =>
            params.where.bracket_round === 1 ? firstRound : [],
        ),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      competition_round_states: {
        upsert: jest.fn(),
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

    expect(tx.fights.create).not.toHaveBeenCalled();
    expect(slotUpdates.slice(-8)).toEqual([
      { id: 1, slot_position: 1 },
      { id: 3, slot_position: 2 },
      { id: 5, slot_position: 3 },
      { id: 7, slot_position: 4 },
      { id: 2, slot_position: 5 },
      { id: 4, slot_position: 6 },
      { id: 6, slot_position: 7 },
      { id: 8, slot_position: 8 },
    ]);
  });

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
      competition_round_states: {
        upsert: jest.fn(),
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

  it('unfixes previous Olympic results when rolling back a pending next round', async () => {
    const tx = {
      fights: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      disciplinary_cards: {
        findMany: jest.fn(),
      },
      competition_round_states: {
        delete: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          type: 'OLYMPIC',
          status: 'ACTIVE',
          tournament_id: 31,
          nomination_id: 5,
          tournament_nomination_id: 15,
          tournament_nomination: { is_finished: false },
          bracket_slots: Array.from({ length: 8 }, () => ({})),
          round_states: [
            { id: 101, round: 1, pairs_fixed: true, results_fixed: true },
            { id: 102, round: 2, pairs_fixed: false, results_fixed: false },
          ],
        }),
      },
      $transaction: jest.fn(
        async (callback: (transaction: typeof tx) => Promise<void>) =>
          callback(tx),
      ),
    };
    const service = new CompetitionService(
      prisma as unknown as PrismaService,
      {} as RatingsService,
    );
    const serviceInternals = service as unknown as {
      renumberNominationFights: jest.Mock;
      resetRatingState: jest.Mock;
    };
    serviceInternals.renumberNominationFights = jest.fn();
    serviceInternals.resetRatingState = jest.fn();
    jest.spyOn(service, 'applyRedCardForfeits').mockResolvedValue();
    jest.spyOn(service, 'getState').mockResolvedValue({
      blocks: [],
    } as never);

    await service.rollback({ block_id: 9, round: 2 });

    expect(tx.competition_round_states.delete).toHaveBeenCalledWith({
      where: { block_id_round: { block_id: 9, round: 2 } },
    });
    expect(tx.competition_round_states.updateMany).toHaveBeenCalledWith({
      where: { id: 101, results_fixed: true },
      data: { results_fixed: false },
    });
  });
});
