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
  it('returns fight warning reasons in competition state', async () => {
    const prisma = {
      competition_blocks: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 90,
            status: 'ACTIVE',
            type: 'GROUP',
            groups: [],
            fights: [
              {
                id: 637,
                warnings: [{ competitor_id: 104, round: 1, reason: 'Holding' }],
              },
            ],
            bracket_slots: [],
            round_states: [],
          },
        ]),
      },
      competition_placements: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new CompetitionService(
      prisma as unknown as PrismaService,
      {} as RatingsService,
    );
    const serviceInternals = service as unknown as {
      getTournamentNomination: jest.Mock;
      normalizeBronzeFinalFightNumbers: jest.Mock;
      getPendingTie: jest.Mock;
    };
    serviceInternals.getTournamentNomination = jest.fn().mockResolvedValue({
      id: 15,
      is_finished: false,
    });
    serviceInternals.normalizeBronzeFinalFightNumbers = jest
      .fn()
      .mockResolvedValue(undefined);
    serviceInternals.getPendingTie = jest.fn().mockResolvedValue(null);

    const state = await service.getState(31, 5);

    expect(state.blocks[0].fights[0].warnings[0]).toMatchObject({
      competitor_id: 104,
      round: 1,
      reason: 'Holding',
    });
  });

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

  it('progresses Olympic blocks and reapplies forfeits after a red card', async () => {
    const prisma = {
      competition_blocks: {
        findMany: jest.fn().mockResolvedValue([{ id: 9 }]),
      },
    };
    const service = new CompetitionService(
      prisma as unknown as PrismaService,
      {} as RatingsService,
    );
    const serviceInternals = service as unknown as {
      disciplinaryCardStorageExists: jest.Mock;
      getTournamentCheckDate: jest.Mock;
      applyRedCardForfeitsPass: jest.Mock;
    };
    const checkDate = new Date('2026-06-12T00:00:00.000Z');
    serviceInternals.disciplinaryCardStorageExists = jest
      .fn()
      .mockResolvedValue(true);
    serviceInternals.getTournamentCheckDate = jest
      .fn()
      .mockResolvedValue(checkDate);
    serviceInternals.applyRedCardForfeitsPass = jest.fn().mockResolvedValue();
    jest.spyOn(service, 'progressOlympicBlock').mockResolvedValue();

    await service.applyRedCardConsequences(31);

    expect(serviceInternals.applyRedCardForfeitsPass).toHaveBeenNthCalledWith(
      1,
      31,
      checkDate,
    );
    expect(service.progressOlympicBlock).toHaveBeenCalledWith(9);
    expect(serviceInternals.applyRedCardForfeitsPass).toHaveBeenNthCalledWith(
      2,
      31,
      checkDate,
    );
  });

  it('forfeits the current and following group fights after a red card', async () => {
    const groupBlock = {
      id: 8,
      type: 'GROUP',
      status: 'ACTIVE',
      lifecycle_state: 'FIGHTS_EDITABLE',
      tournament_nomination: { is_finished: false },
    };
    const groupFight = {
      id: 41,
      block_id: 8,
      tournament_id: 31,
      nomination_id: 5,
      fight_number: 2,
      is_finished: false,
      forfeit_card_id: null,
      block: groupBlock,
      competitor1_id: 101,
      competitor2_id: 102,
      competitor1: { fighter_id: 1 },
      competitor2: { fighter_id: 2 },
      nomination: { rounds: 1, round_win: false },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
      fights: {
        findMany: jest.fn().mockResolvedValue([
          {
            ...groupFight,
            id: 40,
            fight_number: 1,
            competitor2_id: 100,
            competitor2: { fighter_id: 4 },
            is_finished: true,
          },
          groupFight,
          {
            ...groupFight,
            id: 42,
            fight_number: 3,
            competitor2_id: 103,
            competitor2: { fighter_id: 3 },
          },
        ]),
        update: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const service = new CompetitionService(
      prisma as unknown as PrismaService,
      {} as RatingsService,
    );
    const serviceInternals = service as unknown as {
      applyRedCardForfeitsPass: (
        tournamentId: number,
        checkDate: Date,
      ) => Promise<void>;
      getActiveRedCards: jest.Mock;
    };
    serviceInternals.getActiveRedCards = jest.fn().mockResolvedValue([
      {
        id: 72,
        fighter_id: 1,
        fight_id: 41,
        received_at: new Date('2026-06-12T00:00:00.000Z'),
        source_block_id: 8,
        source_block_type: 'GROUP',
        source_fight_number: 2,
        source_tournament_id: 31,
        source_nomination_id: 5,
      },
    ]);

    await serviceInternals.applyRedCardForfeitsPass(
      31,
      new Date('2026-06-12T00:00:00.000Z'),
    );

    expect(prisma.fights.update).toHaveBeenCalledTimes(2);
    expect(prisma.fights.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 40 },
      }),
    );
    expect(prisma.fights.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 41 },
        data: expect.objectContaining({ forfeit_card_id: 72 }),
      }),
    );
    expect(prisma.fights.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: expect.objectContaining({ forfeit_card_id: 72 }),
      }),
    );
  });

  it('records round-win red-card forfeits as X:0 with 5:0 in each round', async () => {
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
      fights: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 41,
            block_id: 8,
            tournament_id: 31,
            nomination_id: 5,
            fight_number: 2,
            is_finished: false,
            forfeit_card_id: null,
            block: {
              id: 8,
              type: 'GROUP',
              status: 'ACTIVE',
              lifecycle_state: 'FIGHTS_EDITABLE',
              tournament_nomination: { is_finished: false },
            },
            competitor1_id: 101,
            competitor2_id: 102,
            competitor1: { fighter_id: 1 },
            competitor2: { fighter_id: 2 },
            nomination: { rounds: 3, round_win: true },
          },
        ]),
        update: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const service = new CompetitionService(
      prisma as unknown as PrismaService,
      {} as RatingsService,
    );
    const serviceInternals = service as unknown as {
      applyRedCardForfeitsPass: (
        tournamentId: number,
        checkDate: Date,
      ) => Promise<void>;
      getActiveRedCards: jest.Mock;
    };
    serviceInternals.getActiveRedCards = jest.fn().mockResolvedValue([
      {
        id: 71,
        fighter_id: 1,
        fight_id: 41,
        received_at: new Date('2026-06-12T00:00:00.000Z'),
        source_block_id: 8,
        source_block_type: 'GROUP',
        source_fight_number: 2,
        source_tournament_id: 31,
        source_nomination_id: 5,
      },
    ]);

    await serviceInternals.applyRedCardForfeitsPass(
      31,
      new Date('2026-06-12T00:00:00.000Z'),
    );

    expect(prisma.fights.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: expect.objectContaining({
        competitor1_score: 0,
        competitor2_score: 3,
        competitor1_round1_score: 0,
        competitor2_round1_score: 5,
        competitor1_round2_score: 0,
        competitor2_round2_score: 5,
        competitor1_round3_score: 0,
        competitor2_round3_score: 5,
        competitor1_round4_score: 0,
        competitor2_round4_score: 0,
        winner_id: 102,
        is_finished: true,
        forfeit_card_id: 71,
      }),
    });
  });

  it('excludes active red-card fighters from group advancers', async () => {
    const tx = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          type: 'GROUP',
        }),
      },
      groups: {
        findMany: jest.fn().mockResolvedValue([{ id: 3, name: 'A' }]),
      },
      competition_placements: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      competitors: {
        findMany: jest.fn().mockResolvedValue([
          { id: 102, fighter: { id: 2 } },
          { id: 103, fighter: { id: 3 } },
        ]),
      },
    };
    const service = new CompetitionService(
      {} as PrismaService,
      {} as RatingsService,
    );
    const serviceInternals = service as unknown as {
      getAdvancingCompetitorsTx: (
        transaction: typeof tx,
        blockId: number,
      ) => Promise<Array<{ id: number }>>;
      getPendingTieTx: jest.Mock;
      getActiveRedCompetitorIdsTx: jest.Mock;
      getGroupRankingsTx: jest.Mock;
    };
    serviceInternals.getPendingTieTx = jest.fn().mockResolvedValue(null);
    serviceInternals.getActiveRedCompetitorIdsTx = jest
      .fn()
      .mockResolvedValue(new Set([101]));
    serviceInternals.getGroupRankingsTx = jest.fn().mockResolvedValue({
      stats: [
        { competitorId: 101, wins: 3, diff: 30 },
        { competitorId: 102, wins: 2, diff: 20 },
        { competitorId: 103, wins: 1, diff: 10 },
      ],
      manualOrder: [],
    });

    const advancers = await serviceInternals.getAdvancingCompetitorsTx(tx, 9);

    expect(advancers.map((competitor) => competitor.id)).toEqual([102, 103]);
    expect(tx.competitors.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [102, 103] } },
      }),
    );
  });

  it('ignores active red-card fighters when checking advancement ties', async () => {
    const tx = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          type: 'GROUP',
        }),
      },
      fights: {
        count: jest.fn().mockResolvedValue(3),
      },
      groups: {
        findMany: jest.fn().mockResolvedValue([{ id: 3, name: 'A' }]),
      },
    };
    const service = new CompetitionService(
      {} as PrismaService,
      {} as RatingsService,
    );
    const serviceInternals = service as unknown as {
      getPendingTieTx: (
        transaction: typeof tx,
        blockId: number,
        places: number,
      ) => Promise<unknown>;
      getActiveRedCompetitorIdsTx: jest.Mock;
      getGroupRankingsTx: jest.Mock;
    };
    serviceInternals.getActiveRedCompetitorIdsTx = jest
      .fn()
      .mockResolvedValue(new Set([101]));
    serviceInternals.getGroupRankingsTx = jest.fn().mockResolvedValue({
      stats: [
        { competitorId: 101, wins: 3, diff: 30 },
        { competitorId: 102, wins: 3, diff: 30 },
        { competitorId: 103, wins: 2, diff: 20 },
        { competitorId: 104, wins: 1, diff: 10 },
      ],
      manualOrder: [],
    });

    const pendingTie = await serviceInternals.getPendingTieTx(tx, 9, 2);

    expect(pendingTie).toBeNull();
  });

  it('unfixes previous Olympic results when rolling back a pending next round', async () => {
    const tx = {
      fights: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
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
    expect(tx.fights.updateMany).toHaveBeenCalledWith({
      where: { block_id: 9, bracket_round: 1, forfeit_card_id: null },
      data: { is_finished: false, winner_id: null },
    });
  });

  it('keeps red-card forfeits fixed when canceling group results', async () => {
    const tx = {
      competition_placements: {
        deleteMany: jest.fn(),
      },
      fights: {
        updateMany: jest.fn(),
      },
      competition_blocks: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          type: 'GROUP',
          status: 'ACTIVE',
          lifecycle_state: 'RESULTS_FIXED',
          tournament_id: 31,
          nomination_id: 5,
          tournament_nomination_id: 15,
          tournament_nomination: { is_finished: false },
          groups: [{ id: 101 }],
          round_states: [],
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
      resetRatingState: jest.Mock;
    };
    serviceInternals.resetRatingState = jest.fn();
    jest.spyOn(service, 'getState').mockResolvedValue({
      blocks: [],
    } as never);

    await service.cancelResultsFixation({ block_id: 9 });

    expect(tx.fights.updateMany).toHaveBeenCalledWith({
      where: { block_id: 9, forfeit_card_id: null },
      data: { is_finished: false, winner_id: null },
    });
  });

  it('keeps red-card forfeits fixed when canceling Olympic round results', async () => {
    const prisma = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 10,
          type: 'OLYMPIC',
          status: 'ACTIVE',
          tournament_id: 31,
          nomination_id: 5,
          tournament_nomination_id: 15,
          tournament_nomination: { is_finished: false },
          groups: [],
          round_states: [
            { id: 201, round: 1, pairs_fixed: true, results_fixed: true },
          ],
        }),
      },
      competition_round_states: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      fights: {
        updateMany: jest.fn(),
      },
    };
    const service = new CompetitionService(
      prisma as unknown as PrismaService,
      {} as RatingsService,
    );
    const serviceInternals = service as unknown as {
      resetRatingState: jest.Mock;
    };
    serviceInternals.resetRatingState = jest.fn();
    jest.spyOn(service, 'getState').mockResolvedValue({
      blocks: [],
    } as never);

    await service.cancelResultsFixation({ block_id: 10, round: 1 });

    expect(prisma.fights.updateMany).toHaveBeenCalledWith({
      where: { block_id: 10, bracket_round: 1, forfeit_card_id: null },
      data: { is_finished: false, winner_id: null },
    });
  });

  it('fixes group stage results after resolving the final group placement tie', async () => {
    const tx = {
      competition_blocks: {
        findFirst: jest.fn().mockResolvedValue({
          id: 9,
          type: 'GROUP',
          status: 'ACTIVE',
          lifecycle_state: 'FIGHTS_EDITABLE',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      competition_placements: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      groups: {
        count: jest.fn().mockResolvedValue(2),
      },
      fights: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const prisma = {
      tournament_nominations: {
        findFirst: jest.fn().mockResolvedValue({
          id: 15,
          tournament_id: 31,
          nomination_id: 5,
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
      getPendingTieTx: jest.Mock;
    };
    serviceInternals.getPendingTieTx = jest.fn().mockResolvedValue(null);
    jest.spyOn(service, 'getState').mockResolvedValue({
      blocks: [],
    } as never);

    await service.resolveTies({
      tournament_id: 31,
      nomination_id: 5,
      block_id: 9,
      group_id: 3,
      tie_scope: 'GROUP',
      ordered_competitor_ids: [101, 102],
    });

    expect(serviceInternals.getPendingTieTx).toHaveBeenCalledWith(tx, 9, 2);
    expect(tx.fights.count).toHaveBeenCalledWith({
      where: { block_id: 9, is_finished: false },
    });
    expect(tx.competition_blocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: 9,
        lifecycle_state: 'FIGHTS_EDITABLE',
        status: 'ACTIVE',
      },
      data: { lifecycle_state: 'RESULTS_FIXED' },
    });
  });

  it('preserves server-generated forfeits when fixing group results', async () => {
    const tx = {
      competition_blocks: {
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      fights: {
        update: jest.fn(),
      },
      fight_warnings: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const prisma = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 90,
          tournament_id: 31,
          nomination_id: 5,
          type: 'GROUP',
          status: 'ACTIVE',
          lifecycle_state: 'FIGHTS_EDITABLE',
          fights: [
            {
              id: 636,
              competitor1_id: 101,
              competitor2_id: 102,
              forfeit_card_id: 71,
            },
            {
              id: 637,
              competitor1_id: 103,
              competitor2_id: 104,
              forfeit_card_id: null,
            },
          ],
          groups: [{ id: 1 }, { id: 2 }],
          tournament_nomination: {
            is_finished: false,
            nomination: { rounds: 2, round_win: false },
          },
          round_states: [],
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
      getPendingTieTx: jest.Mock;
    };
    serviceInternals.getPendingTieTx = jest.fn().mockResolvedValue(null);
    jest.spyOn(service, 'getState').mockResolvedValue({
      blocks: [],
    } as never);

    await service.fixResults({
      block_id: 90,
      fights: [
        {
          fight_id: 636,
          round_scores: [
            { competitor1_score: 0, competitor2_score: 0 },
            { competitor1_score: 0, competitor2_score: 0 },
          ],
        },
        {
          fight_id: 637,
          round_scores: [
            { competitor1_score: 5, competitor2_score: 3 },
            { competitor1_score: 5, competitor2_score: 0 },
          ],
          warnings: [{ competitor_id: 104, round: 1, reason: 'Holding' }],
        },
      ],
    });

    expect(tx.fights.update).toHaveBeenCalledTimes(1);
    expect(tx.fights.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 637 } }),
    );
    expect(tx.fight_warnings.deleteMany).toHaveBeenCalledWith({
      where: { fight_id: 637 },
    });
    expect(tx.fight_warnings.createMany).toHaveBeenCalledWith({
      data: [
        { fight_id: 637, competitor_id: 104, round: 1, reason: 'Holding' },
      ],
    });
  });

  it('fixes group results when warnings decide a raw tied fight', async () => {
    const tx = {
      competition_blocks: {
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      fights: {
        update: jest.fn(),
      },
      fight_warnings: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const prisma = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 91,
          tournament_id: 31,
          nomination_id: 5,
          type: 'GROUP',
          status: 'ACTIVE',
          lifecycle_state: 'FIGHTS_EDITABLE',
          fights: [
            {
              id: 638,
              competitor1_id: 101,
              competitor2_id: 102,
              forfeit_card_id: null,
            },
          ],
          groups: [{ id: 1 }],
          tournament_nomination: {
            is_finished: false,
            nomination: { rounds: 1, round_win: false },
          },
          round_states: [],
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
      getPendingTieTx: jest.Mock;
    };
    serviceInternals.getPendingTieTx = jest.fn().mockResolvedValue(null);
    jest.spyOn(service, 'getState').mockResolvedValue({
      blocks: [],
    } as never);

    await service.fixResults({
      block_id: 91,
      fights: [
        {
          fight_id: 638,
          round_scores: [{ competitor1_score: 0, competitor2_score: 0 }],
          warnings: [{ competitor_id: 101, round: 1, reason: 'Holding' }],
        },
      ],
    });

    expect(tx.fights.update).toHaveBeenCalledWith({
      where: { id: 638 },
      data: expect.objectContaining({
        competitor1_score: 0,
        competitor2_score: 0,
        winner_id: 102,
        is_finished: true,
      }),
    });
    expect(tx.fight_round_scores.createMany).toHaveBeenCalledWith({
      data: [
        {
          fight_id: 638,
          round: 1,
          competitor1_score: 0,
          competitor2_score: 0,
        },
      ],
    });
    expect(tx.fight_warnings.createMany).toHaveBeenCalledWith({
      data: [
        { fight_id: 638, competitor_id: 101, round: 1, reason: 'Holding' },
      ],
    });
  });

  it('fixes Olympic round results when warnings decide a raw tied fight', async () => {
    const tx = {
      fights: {
        update: jest.fn(),
      },
      fight_warnings: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      competition_round_states: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      competition_blocks: {
        findUnique: jest.fn().mockResolvedValue({
          id: 92,
          tournament_id: 31,
          nomination_id: 5,
          type: 'OLYMPIC',
          status: 'ACTIVE',
          lifecycle_state: 'FIGHTS_EDITABLE',
          fights: [
            {
              id: 639,
              competitor1_id: 201,
              competitor2_id: 202,
              bracket_round: 1,
              is_bronze: false,
              forfeit_card_id: null,
            },
          ],
          groups: [],
          tournament_nomination: {
            is_finished: false,
            nomination: { rounds: 1, round_win: false },
          },
          round_states: [
            { id: 77, round: 1, pairs_fixed: true, results_fixed: false },
          ],
        }),
      },
      bracket_slots: {
        count: jest.fn().mockResolvedValue(2),
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
      progressOlympicBlockTx: jest.Mock;
    };
    serviceInternals.progressOlympicBlockTx = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(service, 'getState').mockResolvedValue({
      blocks: [],
    } as never);
    jest.spyOn(service, 'applyRedCardForfeits').mockResolvedValue(undefined);

    await service.fixResults({
      block_id: 92,
      round: 1,
      fights: [
        {
          fight_id: 639,
          round_scores: [{ competitor1_score: 1, competitor2_score: 1 }],
          warnings: [{ competitor_id: 202, round: 1, reason: 'Holding' }],
        },
      ],
    });

    expect(tx.fights.update).toHaveBeenCalledWith({
      where: { id: 639 },
      data: expect.objectContaining({
        competitor1_score: 1,
        competitor2_score: 1,
        winner_id: 201,
        is_finished: true,
      }),
    });
    expect(tx.competition_round_states.updateMany).toHaveBeenCalledWith({
      where: { id: 77, pairs_fixed: true, results_fixed: false },
      data: { results_fixed: true },
    });
    expect(tx.fight_warnings.createMany).toHaveBeenCalledWith({
      data: [
        { fight_id: 639, competitor_id: 202, round: 1, reason: 'Holding' },
      ],
    });
  });
});
