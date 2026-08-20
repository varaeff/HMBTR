import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MAX_FIGHT_WARNINGS_PER_COMPETITOR } from '@shared/fightScoring';
import { SCOPE_FINAL } from '../../competition/competition.constants';
import type {
  PrismaTx,
  RussiaHmbFight,
  RussiaHmbParticipant,
  RussiaHmbPenalty,
  RussiaHmbPlacement,
  RussiaHmbTournamentNomination,
} from './russia-hmb-rating.types';

@Injectable()
export class RussiaHmbRatingReader {
  async getTournamentNominationTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ): Promise<RussiaHmbTournamentNomination> {
    const tournamentNomination = await tx.tournament_nominations.findFirst({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
      select: {
        id: true,
        tournament_id: true,
        nomination_id: true,
        is_finished: true,
        tournament: { select: { event_date: true } },
      },
    });

    if (!tournamentNomination) {
      throw new NotFoundException('Tournament nomination not found');
    }

    if (!tournamentNomination.is_finished) {
      throw new BadRequestException('Nomination is not finished');
    }

    if (!tournamentNomination.tournament.event_date) {
      throw new BadRequestException('Tournament event date is required');
    }

    return {
      id: tournamentNomination.id,
      tournament_id: tournamentNomination.tournament_id,
      nomination_id: tournamentNomination.nomination_id,
      event_date: tournamentNomination.tournament.event_date,
    };
  }

  async getParticipantsTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ): Promise<RussiaHmbParticipant[]> {
    const competitors = await tx.competitors.findMany({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
      orderBy: { id: 'asc' },
      select: { id: true, fighter_id: true },
    });

    return competitors.map((competitor) => ({
      competitorId: competitor.id,
      fighterId: competitor.fighter_id,
    }));
  }

  async getFightsTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ): Promise<RussiaHmbFight[]> {
    const fights = await tx.fights.findMany({
      where: {
        tournament_id: tournamentId,
        nomination_id: nominationId,
        is_finished: true,
      },
      orderBy: [{ fight_number: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        competitor1_id: true,
        competitor2_id: true,
        winner_id: true,
        competitor1_score: true,
        competitor2_score: true,
        is_finished: true,
        round_win: true,
        forfeit_card_id: true,
        forfeit_withdrawal_id: true,
        warnings: {
          select: {
            competitor_id: true,
          },
        },
        round_scores: {
          orderBy: { round: 'asc' },
          select: {
            round: true,
            competitor1_score: true,
            competitor2_score: true,
          },
        },
      },
    });

    return fights.map((fight) => {
      const loserCompetitorId = this.getTechnicalLoserCompetitorId({
        competitor1Id: fight.competitor1_id,
        competitor2Id: fight.competitor2_id,
        winnerCompetitorId: fight.winner_id,
        forfeitCardId: fight.forfeit_card_id,
        forfeitWithdrawalId: fight.forfeit_withdrawal_id,
        warnings: fight.warnings.map((warning) => ({
          competitorId: warning.competitor_id,
        })),
      });

      return {
        id: fight.id,
        competitor1Id: fight.competitor1_id,
        competitor2Id: fight.competitor2_id,
        winnerCompetitorId: fight.winner_id,
        technicalLoserCompetitorId: loserCompetitorId,
        competitor1Score: fight.competitor1_score,
        competitor2Score: fight.competitor2_score,
        isFinished: fight.is_finished,
        roundWin: fight.round_win,
        roundScores: fight.round_scores.map((roundScore) => ({
          round: roundScore.round,
          competitor1Score: roundScore.competitor1_score,
          competitor2Score: roundScore.competitor2_score,
        })),
      };
    });
  }

  async getFinalPlacementsTx(
    tx: PrismaTx,
    tournamentNominationId: number,
  ): Promise<RussiaHmbPlacement[]> {
    const placements = await tx.competition_placements.findMany({
      where: {
        tournament_nomination_id: tournamentNominationId,
        scope: SCOPE_FINAL,
        place: { in: [1, 2, 3] },
      },
      orderBy: { place: 'asc' },
      select: { competitor_id: true, place: true },
    });

    if (placements.length === 0) {
      throw new BadRequestException('Final placements are required');
    }

    return placements.map((placement) => ({
      competitorId: placement.competitor_id,
      place: placement.place,
    }));
  }

  async getPenaltiesTx(
    tx: PrismaTx,
    params: {
      tournamentNominationId: number;
      tournamentId: number;
      nominationId: number;
      eventDate: Date;
      participants: RussiaHmbParticipant[];
    },
  ): Promise<RussiaHmbPenalty[]> {
    const participantByFighterId = new Map(
      params.participants.map((participant) => [
        participant.fighterId,
        participant,
      ]),
    );
    const penaltyByCompetitorId = new Map<number, RussiaHmbPenalty>();
    const ensurePenalty = (competitorId: number) => {
      const existing = penaltyByCompetitorId.get(competitorId);
      if (existing) return existing;

      const created = {
        competitorId,
        noShowPenaltyCount: 0,
        yellowCardsCount: 0,
        activeRedCardsCount: 0,
      };
      penaltyByCompetitorId.set(competitorId, created);
      return created;
    };

    const [withdrawals, cards] = await Promise.all([
      tx.fighter_withdrawals.findMany({
        where: {
          tournament_nomination_id: params.tournamentNominationId,
          source: 'NO_SHOW',
          active: true,
          is_excused: false,
        },
        select: { competitor_id: true },
      }),
      tx.disciplinary_cards.findMany({
        where: {
          tournament_id: params.tournamentId,
          fight: {
            nomination_id: params.nominationId,
          },
          type: { in: ['YELLOW', 'RED'] },
        },
        select: {
          fighter_id: true,
          type: true,
          active: true,
          received_at: true,
          expires_at: true,
        },
      }),
    ]);

    for (const withdrawal of withdrawals) {
      ensurePenalty(withdrawal.competitor_id).noShowPenaltyCount += 1;
    }

    for (const card of cards) {
      const participant = participantByFighterId.get(card.fighter_id);
      if (!participant) continue;

      const penalty = ensurePenalty(participant.competitorId);

      if (card.type === 'YELLOW') {
        penalty.yellowCardsCount += 1;
        continue;
      }

      if (
        card.type === 'RED' &&
        card.active &&
        card.received_at <= params.eventDate &&
        card.expires_at >= params.eventDate
      ) {
        penalty.activeRedCardsCount += 1;
      }
    }

    return [...penaltyByCompetitorId.values()];
  }

  private getTechnicalLoserCompetitorId(params: {
    competitor1Id: number;
    competitor2Id: number;
    winnerCompetitorId: number | null;
    forfeitCardId: number | null;
    forfeitWithdrawalId: number | null;
    warnings: Array<{ competitorId: number }>;
  }) {
    if (!params.winnerCompetitorId) return null;

    const loserCompetitorId =
      params.winnerCompetitorId === params.competitor1Id
        ? params.competitor2Id
        : params.competitor1Id;

    if (params.forfeitCardId !== null || params.forfeitWithdrawalId !== null) {
      return loserCompetitorId;
    }

    const loserWarnings = params.warnings.filter(
      (warning) => warning.competitorId === loserCompetitorId,
    ).length;

    return loserWarnings >= MAX_FIGHT_WARNINGS_PER_COMPETITOR
      ? loserCompetitorId
      : null;
  }
}
