import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ExistingRating,
  RatingFight,
  RatingParticipant,
} from '../ratings.logic';
import type {
  PrismaTx,
  RatingTournamentNomination,
} from '../ratings-internal.types';

@Injectable()
export class RatingCalculationReader {
  async getTournamentNominationTx(
    tx: PrismaTx,
    tournamentNominationId: number,
  ): Promise<RatingTournamentNomination> {
    const tournamentNomination = await tx.tournament_nominations.findUnique({
      where: { id: tournamentNominationId },
      select: {
        id: true,
        tournament_id: true,
        nomination_id: true,
      },
    });

    if (!tournamentNomination) {
      throw new NotFoundException('Tournament nomination not found');
    }

    return tournamentNomination;
  }

  async getParticipantsTx(
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

  async getExistingRatingsTx(
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

  async getRatingFightsTx(
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
