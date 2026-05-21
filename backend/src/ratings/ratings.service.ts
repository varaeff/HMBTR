import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateNominationRatings,
  ExistingRating,
  RatingFight,
  RatingParticipant,
} from './ratings.logic';

const STATUS_PENDING = 'PENDING';
const STATUS_PROCESSING = 'PROCESSING';
const STATUS_CALCULATED = 'CALCULATED';
const STATUS_FAILED = 'FAILED';

type PrismaTx = Omit<
  PrismaService,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$extends'
  | 'onModuleInit'
>;

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(private prisma: PrismaService) {}

  async findRatedNominations() {
    return this.prisma.nominations.findMany({
      where: {
        fighter_ratings: {
          some: {},
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findByNomination(nominationId: number) {
    return this.prisma.fighter_nomination_ratings.findMany({
      where: { nomination_id: nominationId },
      orderBy: [
        { rating: 'desc' },
        { fights_count: 'desc' },
        { fighter: { surname: 'asc' } },
        { fighter: { name: 'asc' } },
        { fighter_id: 'asc' },
      ],
      include: {
        fighter: {
          include: {
            country: true,
            city: true,
            club: true,
          },
        },
      },
    });
  }

  async calculateForTournamentNomination(tournamentNominationId: number) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.tournament_nominations.updateMany({
          where: {
            id: tournamentNominationId,
            is_finished: true,
            rating_status: { in: [STATUS_PENDING, STATUS_FAILED] },
          },
          data: {
            rating_status: STATUS_PROCESSING,
            rating_error: null,
          },
        });

        if (claimed.count === 0) return;

        await this.calculateClaimedTournamentNominationTx(
          tx,
          tournamentNominationId,
        );
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown rating error';

      this.logger.error(
        `Rating calculation failed for tournament nomination ${tournamentNominationId}: ${message}`,
      );

      await this.prisma.tournament_nominations.updateMany({
        where: {
          id: tournamentNominationId,
          rating_status: { not: STATUS_CALCULATED },
        },
        data: {
          rating_status: STATUS_FAILED,
          rating_error: message,
        },
      });
    }
  }

  private async calculateClaimedTournamentNominationTx(
    tx: PrismaTx,
    tournamentNominationId: number,
  ) {
    const tournamentNomination = await tx.tournament_nominations.findUnique({
      where: { id: tournamentNominationId },
    });

    if (!tournamentNomination) {
      throw new NotFoundException('Tournament nomination not found');
    }

    const participants = await this.getParticipantsTx(
      tx,
      tournamentNomination.tournament_id,
      tournamentNomination.nomination_id,
    );
    const existingRatings = await this.getExistingRatingsTx(
      tx,
      tournamentNomination.nomination_id,
      participants,
    );
    const fights = await this.getRatingFightsTx(
      tx,
      tournamentNomination.tournament_id,
      tournamentNomination.nomination_id,
    );
    const calculation = calculateNominationRatings(
      participants,
      existingRatings,
      fights,
    );

    for (const rating of calculation) {
      await tx.fighter_nomination_ratings.upsert({
        where: {
          nomination_id_fighter_id: {
            nomination_id: tournamentNomination.nomination_id,
            fighter_id: rating.fighterId,
          },
        },
        update: {
          rating: rating.ratingAfter,
          fights_count: rating.fightsCountAfter,
        },
        create: {
          nomination_id: tournamentNomination.nomination_id,
          fighter_id: rating.fighterId,
          rating: rating.ratingAfter,
          fights_count: rating.fightsCountAfter,
        },
      });
    }

    if (calculation.length > 0) {
      await tx.fighter_nomination_rating_history.createMany({
        data: calculation.map((rating) => ({
          nomination_id: tournamentNomination.nomination_id,
          fighter_id: rating.fighterId,
          tournament_id: tournamentNomination.tournament_id,
          tournament_nomination_id: tournamentNomination.id,
          rating_before: rating.ratingBefore,
          rating_after: rating.ratingAfter,
          fights_count_delta: rating.fightsCountDelta,
        })),
      });
    }

    await tx.tournament_nominations.update({
      where: { id: tournamentNomination.id },
      data: {
        rating_status: STATUS_CALCULATED,
        rating_calculated_at: new Date(),
        rating_error: null,
      },
    });
  }

  private async getParticipantsTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ): Promise<RatingParticipant[]> {
    const competitors = await tx.competitors.findMany({
      where: {
        tournament_id: tournamentId,
        nomination_id: nominationId,
      },
      orderBy: { id: 'asc' },
      select: {
        fighter_id: true,
      },
    });
    const fighterIds = [...new Set(competitors.map((item) => item.fighter_id))];

    return fighterIds.map((fighterId) => ({ fighterId }));
  }

  private async getExistingRatingsTx(
    tx: PrismaTx,
    nominationId: number,
    participants: RatingParticipant[],
  ): Promise<ExistingRating[]> {
    if (participants.length === 0) return [];

    const ratings = await tx.fighter_nomination_ratings.findMany({
      where: {
        nomination_id: nominationId,
        fighter_id: {
          in: participants.map((participant) => participant.fighterId),
        },
      },
    });

    return ratings.map((rating) => ({
      fighterId: rating.fighter_id,
      rating: rating.rating,
      fightsCount: rating.fights_count,
    }));
  }

  private async getRatingFightsTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ): Promise<RatingFight[]> {
    const fights = await tx.fights.findMany({
      where: {
        tournament_id: tournamentId,
        nomination_id: nominationId,
        is_finished: true,
        winner_id: { not: null },
      },
      orderBy: [{ fight_number: 'asc' }, { id: 'asc' }],
      include: {
        competitor1: {
          select: { fighter_id: true },
        },
        competitor2: {
          select: { fighter_id: true },
        },
      },
    });

    return fights.map((fight) => ({
      competitor1FighterId: fight.competitor1.fighter_id,
      competitor2FighterId: fight.competitor2.fighter_id,
      winnerFighterId: this.getWinnerFighterId({
        winnerCompetitorId: fight.winner_id,
        competitor1Id: fight.competitor1_id,
        competitor2Id: fight.competitor2_id,
        competitor1FighterId: fight.competitor1.fighter_id,
        competitor2FighterId: fight.competitor2.fighter_id,
      }),
      isFinished: fight.is_finished,
      forfeitCardId: fight.forfeit_card_id,
    }));
  }

  private getWinnerFighterId(params: {
    winnerCompetitorId: number | null;
    competitor1Id: number;
    competitor2Id: number;
    competitor1FighterId: number;
    competitor2FighterId: number;
  }) {
    if (params.winnerCompetitorId === params.competitor1Id) {
      return params.competitor1FighterId;
    }

    if (params.winnerCompetitorId === params.competitor2Id) {
      return params.competitor2FighterId;
    }

    return null;
  }
}
