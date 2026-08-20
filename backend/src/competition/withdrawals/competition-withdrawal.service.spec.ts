import { CompetitionScoringService } from '../scoring/competition-scoring.service';
import type { PrismaTx } from '../competition-internal.types';
import type { PrismaService } from '../../prisma/prisma.service';
import { TieBreakerService } from '../rankings/tie-breaker.service';
import {
  CompetitionWithdrawalService,
  NO_SHOW_WITHDRAWAL_REASON,
  WITHDRAWAL_SOURCE_FIGHT,
  WITHDRAWAL_SOURCE_NO_SHOW,
} from './competition-withdrawal.service';

type FightUpdateParams = {
  where: { id: number };
  data: {
    competitor1_score?: number;
    competitor2_score?: number;
    winner_id?: number | null;
    is_finished?: boolean;
    forfeit_withdrawal_id?: number | null;
  };
};

const groupBlock = {
  id: 3,
  tournament_id: 31,
  nomination_id: 5,
  tournament_nomination_id: 15,
  type: 'GROUP',
  status: 'ACTIVE',
  lifecycle_state: 'FIGHTS_EDITABLE',
  tournament_nomination: { is_finished: false },
  round_states: [],
};

const fight = (id: number, fightNumber: number) => ({
  id,
  fight_number: fightNumber,
  tournament_id: 31,
  nomination_id: 5,
  block_id: 3,
  rounds: 1,
  round_win: false,
  bracket_round: null,
  is_bronze: false,
  competitor1_id: 101,
  competitor2_id: 102,
  forfeit_card_id: null,
  forfeit_withdrawal_id: null,
  is_finished: false,
  block: groupBlock,
});

describe('CompetitionWithdrawalService', () => {
  it('creates pre-block no-show withdrawals as unexcused with the no-show reason', async () => {
    const prisma = {
      tournament_nominations: {
        findFirst: jest.fn().mockResolvedValue({
          id: 15,
          is_open: false,
          is_finished: false,
          blocks: [],
        }),
      },
      competitors: {
        findUnique: jest.fn().mockResolvedValue({
          id: 101,
          tournament_id: 31,
          nomination_id: 5,
        }),
      },
      fighter_withdrawals: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 9 }),
      },
    };
    const service = new CompetitionWithdrawalService(
      prisma as unknown as PrismaService,
      new CompetitionScoringService({} as PrismaService),
      {} as TieBreakerService,
    );

    await service.createNoShow({
      tournament_id: 31,
      nomination_id: 5,
      competitor_id: 101,
    });

    expect(prisma.fighter_withdrawals.create).toHaveBeenCalledWith({
      data: {
        tournament_nomination_id: 15,
        tournament_id: 31,
        nomination_id: 5,
        competitor_id: 101,
        source: WITHDRAWAL_SOURCE_NO_SHOW,
        reason: NO_SHOW_WITHDRAWAL_REASON,
        is_excused: false,
      },
    });
  });

  it('cancels active withdrawals and clears only their generated forfeits', async () => {
    const tx = {
      fighter_withdrawals: {
        update: jest.fn(),
      },
      fights: {
        findMany: jest.fn().mockResolvedValue([{ id: 2 }, { id: 3 }]),
        updateMany: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
      },
      fight_warnings: {
        deleteMany: jest.fn(),
      },
    };
    const prisma = {
      fighter_withdrawals: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          active: true,
          tournament_nomination: { is_finished: false },
          forfeited_fights: [fight(2, 2)],
        }),
      },
      $transaction: jest.fn(
        async (callback: (transaction: typeof tx) => Promise<void>) =>
          callback(tx),
      ),
    };
    const service = new CompetitionWithdrawalService(
      prisma as unknown as PrismaService,
      new CompetitionScoringService({} as PrismaService),
      {} as TieBreakerService,
    );

    await service.cancel({ withdrawal_id: 9 });

    expect(tx.fighter_withdrawals.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { active: false, canceled_at: expect.any(Date) },
    });
    expect(tx.fights.updateMany).toHaveBeenCalledWith({
      where: { forfeit_withdrawal_id: 9 },
      data: expect.objectContaining({ forfeit_withdrawal_id: null }),
    });
    expect(tx.fight_round_scores.deleteMany).toHaveBeenCalledWith({
      where: { fight_id: { in: [2, 3] } },
    });
    expect(tx.fight_warnings.deleteMany).toHaveBeenCalledWith({
      where: { fight_id: { in: [2, 3] } },
    });
  });

  it('forfeits the source and following group fights for fight withdrawals', async () => {
    const tx = {
      fights: {
        findMany: jest.fn().mockResolvedValue([
          fight(1, 1),
          fight(2, 2),
          fight(3, 3),
        ]),
        update: jest.fn(),
      },
      fighter_withdrawals: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 9,
            tournament_nomination_id: 15,
            tournament_id: 31,
            nomination_id: 5,
            competitor_id: 101,
            source: WITHDRAWAL_SOURCE_FIGHT,
            source_fight_id: 2,
            source_block_id: 3,
            source_fight_number: 2,
            reason: 'injury',
            is_excused: true,
          },
        ]),
      },
      fight_warnings: {
        deleteMany: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const service = new CompetitionWithdrawalService(
      {} as PrismaService,
      new CompetitionScoringService({} as PrismaService),
      {} as TieBreakerService,
    );

    await service.applyWithdrawalForfeitsTx(tx as unknown as PrismaTx, 31);

    const updateCalls = tx.fights.update.mock.calls as Array<[
      FightUpdateParams,
    ]>;
    expect(updateCalls.map(([params]) => params.where.id)).toEqual([2, 3]);
    expect(updateCalls.map(([params]) => params.data)).toEqual([
      expect.objectContaining({
        competitor1_score: 0,
        competitor2_score: 10,
        winner_id: 102,
        is_finished: true,
        forfeit_withdrawal_id: 9,
      }),
      expect.objectContaining({
        competitor1_score: 0,
        competitor2_score: 10,
        winner_id: 102,
        is_finished: true,
        forfeit_withdrawal_id: 9,
      }),
    ]);
  });

  it('removes fight-sourced withdrawals from deleted fights and clears their forfeits', async () => {
    const tx = {
      fights: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 2 }, { id: 3 }])
          .mockResolvedValueOnce([{ id: 4 }, { id: 5 }]),
        updateMany: jest.fn(),
      },
      fighter_withdrawals: {
        findMany: jest.fn().mockResolvedValue([{ id: 9 }]),
        deleteMany: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
      },
      fight_warnings: {
        deleteMany: jest.fn(),
      },
    };
    const service = new CompetitionWithdrawalService(
      {} as PrismaService,
      new CompetitionScoringService({} as PrismaService),
      {} as TieBreakerService,
    );

    await service.resetForfeitsForDeletedFightsTx(
      tx as unknown as PrismaTx,
      3,
      2,
    );

    expect(tx.fights.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        block_id: 3,
        OR: [
          { bracket_round: 2 },
          { is_bronze: true, bracket_round: { gte: 2 } },
        ],
      },
      select: { id: true },
    });
    expect(tx.fighter_withdrawals.findMany).toHaveBeenCalledWith({
      where: { source_fight_id: { in: [2, 3] } },
      select: { id: true },
    });
    expect(tx.fights.updateMany).toHaveBeenCalledWith({
      where: { forfeit_withdrawal_id: { in: [9] } },
      data: expect.objectContaining({ forfeit_withdrawal_id: null }),
    });
    expect(tx.fight_round_scores.deleteMany).toHaveBeenCalledWith({
      where: { fight_id: { in: [4, 5] } },
    });
    expect(tx.fight_warnings.deleteMany).toHaveBeenCalledWith({
      where: { fight_id: { in: [4, 5] } },
    });
    expect(tx.fighter_withdrawals.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [9] } },
    });
  });

  it('does not remove no-show withdrawals when deleted fights have no source withdrawals', async () => {
    const tx = {
      fights: {
        findMany: jest.fn().mockResolvedValue([{ id: 2 }]),
        updateMany: jest.fn(),
      },
      fighter_withdrawals: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      fight_round_scores: {
        deleteMany: jest.fn(),
      },
      fight_warnings: {
        deleteMany: jest.fn(),
      },
    };
    const service = new CompetitionWithdrawalService(
      {} as PrismaService,
      new CompetitionScoringService({} as PrismaService),
      {} as TieBreakerService,
    );

    await service.resetForfeitsForDeletedFightsTx(tx as unknown as PrismaTx, 3);

    expect(tx.fighter_withdrawals.findMany).toHaveBeenCalledWith({
      where: { source_fight_id: { in: [2] } },
      select: { id: true },
    });
    expect(tx.fights.updateMany).not.toHaveBeenCalled();
    expect(tx.fighter_withdrawals.deleteMany).not.toHaveBeenCalled();
  });
});
