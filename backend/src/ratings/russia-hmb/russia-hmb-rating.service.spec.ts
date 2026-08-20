import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RatingsController } from '../ratings.controller';
import { RatingsService } from '../ratings.service';
import { RussiaHmbRatingPersistence } from './russia-hmb-rating-persistence.service';
import { RussiaHmbRatingReader } from './russia-hmb-rating-reader.service';
import { RussiaHmbRatingService } from './russia-hmb-rating.service';
import type { PrismaTx } from './russia-hmb-rating.types';

describe('Russia HMB rating guards and errors', () => {
  it('rejects Russia HMB calculation without administrator or secretary role', async () => {
    const service = new RussiaHmbRatingService(
      {} as PrismaService,
      {} as RussiaHmbRatingReader,
      {} as RussiaHmbRatingPersistence,
    );

    await expect(
      service.calculateForTournamentNomination({
        tournamentId: 1,
        nominationId: 2,
        coefficient: 1,
        user: { is_organizer: true },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unfinished tournament nomination reads for calculation', async () => {
    const reader = new RussiaHmbRatingReader();
    const tx = {
      tournament_nominations: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          tournament_id: 10,
          nomination_id: 20,
          is_finished: false,
          tournament: { event_date: new Date('2026-05-20T00:00:00.000Z') },
        }),
      },
    } as unknown as PrismaTx;

    await expect(reader.getTournamentNominationTx(tx, 10, 20)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('marks card and warning technical-loss fights for formula logic', async () => {
    const reader = new RussiaHmbRatingReader();
    const tx = {
      fights: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            competitor1_id: 101,
            competitor2_id: 202,
            winner_id: 101,
            competitor1_score: 10,
            competitor2_score: 0,
            is_finished: true,
            round_win: false,
            forfeit_card_id: 7,
            forfeit_withdrawal_id: null,
            warnings: [],
            round_scores: [{ round: 1, competitor1_score: 0, competitor2_score: 0 }],
          },
          {
            id: 2,
            competitor1_id: 101,
            competitor2_id: 303,
            winner_id: 101,
            competitor1_score: 10,
            competitor2_score: 0,
            is_finished: true,
            round_win: false,
            forfeit_card_id: null,
            forfeit_withdrawal_id: null,
            warnings: [
              { competitor_id: 303 },
              { competitor_id: 303 },
              { competitor_id: 303 },
            ],
            round_scores: [{ round: 1, competitor1_score: 0, competitor2_score: 0 }],
          },
        ]),
      },
    } as unknown as PrismaTx;

    await expect(reader.getFightsTx(tx, 10, 20)).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        technicalLoserCompetitorId: 202,
      }),
      expect.objectContaining({
        id: 2,
        technicalLoserCompetitorId: 303,
      }),
    ]);
  });

  it('filters excused no-show withdrawals out of Russia HMB penalties', async () => {
    const reader = new RussiaHmbRatingReader();
    const withdrawalsFindMany = jest.fn().mockResolvedValue([]);
    const tx = {
      fighter_withdrawals: {
        findMany: withdrawalsFindMany,
      },
      disciplinary_cards: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaTx;

    const penalties = await reader.getPenaltiesTx(tx, {
      tournamentNominationId: 1,
      tournamentId: 10,
      nominationId: 20,
      eventDate: new Date('2026-05-20T00:00:00.000Z'),
      participants: [{ competitorId: 101, fighterId: 1 }],
    });

    expect(withdrawalsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_excused: false }),
      }),
    );
    expect(penalties).toEqual([]);
  });

  it('rejects duplicate Russia HMB calculation persistence', async () => {
    const persistence = new RussiaHmbRatingPersistence();
    const tx = {
      russia_hmb_rating_calculations: {
        findUnique: jest.fn().mockResolvedValue({ id: 99 }),
      },
    } as unknown as PrismaTx;

    await expect(
      persistence.saveCalculationTx(tx, {
        tournamentNomination: {
          id: 1,
          tournament_id: 10,
          nomination_id: 20,
          event_date: new Date('2026-05-20T00:00:00.000Z'),
        },
        coefficient: 1,
        calculatedByUserId: 7,
        calculation: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects Elo leaderboard controller reads for users without roles', () => {
    const controller = new RatingsController({} as RatingsService);

    expect(() =>
      controller.findRatedNominations({
        user: { id: 1, is_admin: false, is_organizer: false, is_secretary: false },
      }),
    ).toThrow(ForbiddenException);
  });
});
