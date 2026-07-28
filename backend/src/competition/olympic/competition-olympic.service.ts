import { Injectable, NotFoundException } from '@nestjs/common';
import { OLYMPIC_BRACKET_SIZES } from '../competition.logic';
import type { PrismaTx } from '../competition-internal.types';

@Injectable()
export class CompetitionOlympicService {
  getPendingOlympicPairs(
    bracketSlots: Array<{
      id: number;
      competitor_id: number;
      slot_position: number;
    }>,
    fights: Array<{
      bracket_round: number | null;
      is_bronze: boolean | null;
      is_finished: boolean | null;
      winner_id: number | null;
    }>,
  ): {
    round: number;
    slots: Array<{ competitor_id: number; slot_position: number }>;
  } | null {
    const sortedSlots = [...bracketSlots].sort(
      (a, b) => a.slot_position - b.slot_position,
    );
    const slotCount = sortedSlots.length;
    if (!OLYMPIC_BRACKET_SIZES.some((size) => size === slotCount)) return null;

    const mainFights = fights.filter((fight) => !fight.is_bronze);
    if (!mainFights.length) {
      return { round: 1, slots: sortedSlots };
    }

    const mainRounds = Math.log2(slotCount);
    const semifinalRound = mainRounds - 1;
    const latestRound = Math.max(
      ...mainFights.map((fight) => fight.bracket_round ?? 1),
    );

    if (latestRound >= semifinalRound) return null;

    const nextRound = latestRound + 1;
    if (mainFights.some((fight) => (fight.bracket_round ?? 1) === nextRound)) {
      return null;
    }

    const latestRoundFights = mainFights.filter(
      (fight) => (fight.bracket_round ?? 1) === latestRound,
    );
    if (
      !latestRoundFights.length ||
      latestRoundFights.some((fight) => !fight.is_finished || !fight.winner_id)
    ) {
      return null;
    }

    const winnerIds = new Set(
      latestRoundFights.map((fight) => fight.winner_id!),
    );
    const winnerSlots = sortedSlots.filter((slot) =>
      winnerIds.has(slot.competitor_id),
    );

    return winnerSlots.length === latestRoundFights.length
      ? { round: nextRound, slots: winnerSlots }
      : null;
  }

  async createBracketFightsFromSlotsTx(
    tx: PrismaTx,
    params: {
      blockId: number;
      tournamentId: number;
      nominationId: number;
      stage: number;
      round: number;
      slots: Array<{ competitor_id: number }>;
    },
  ) {
    const nomination = await tx.nominations.findUnique({
      where: { id: params.nominationId },
      select: { rounds: true, round_win: true },
    });
    if (!nomination) throw new NotFoundException('Nomination not found');
    let fightNumber = await this.getNextFightNumberTx(
      tx,
      params.tournamentId,
      params.nominationId,
    );

    for (let i = 0; i < params.slots.length; i += 2) {
      await tx.fights.create({
        data: {
          tournament_id: params.tournamentId,
          nomination_id: params.nominationId,
          block_id: params.blockId,
          competitor1_id: params.slots[i].competitor_id,
          competitor2_id: params.slots[i + 1].competitor_id,
          stage: params.stage,
          fight_number: fightNumber++,
          bracket_round: params.round,
          bracket_position: i / 2 + 1,
          rounds: nomination.rounds,
          round_win: nomination.round_win,
        },
      });
    }
  }

  async progressOlympicBlockTx(tx: PrismaTx, blockId: number) {
    const block = await tx.competition_blocks.findUnique({
      where: { id: blockId },
      include: { bracket_slots: true },
    });
    if (!block) throw new NotFoundException('Block not found');
    const nomination = await tx.nominations.findUnique({
      where: { id: block.nomination_id },
      select: { rounds: true, round_win: true },
    });
    if (!nomination) throw new NotFoundException('Nomination not found');

    const slotCount = block.bracket_slots.length;
    const mainRounds = Math.log2(slotCount);
    let fightNumber = await this.getNextFightNumberTx(
      tx,
      block.tournament_id,
      block.nomination_id,
    );

    const semifinalRound = mainRounds - 1;

    for (let round = 1; round < semifinalRound; round++) {
      const fights = await tx.fights.findMany({
        where: { block_id: blockId, bracket_round: round, is_bronze: false },
        orderBy: { bracket_position: 'asc' },
      });
      if (
        !fights.length ||
        fights.some((fight) => !fight.is_finished || !fight.winner_id)
      ) {
        break;
      }

      const nextRoundExists = await tx.fights.count({
        where: {
          block_id: blockId,
          bracket_round: round + 1,
          is_bronze: false,
        },
      });
      if (!nextRoundExists) {
        await this.reorderOlympicWinnerSlotsTx(
          tx,
          blockId,
          fights.map((fight) => fight.winner_id!),
        );
        await tx.competition_round_states.upsert({
          where: {
            block_id_round: { block_id: blockId, round: round + 1 },
          },
          create: { block_id: blockId, round: round + 1 },
          update: {},
        });
        break;
      }
    }

    const semifinals = await tx.fights.findMany({
      where: {
        block_id: blockId,
        bracket_round: semifinalRound,
        is_bronze: false,
      },
      orderBy: { bracket_position: 'asc' },
    });
    const finalExists = await tx.fights.findFirst({
      where: {
        block_id: blockId,
        bracket_round: mainRounds,
        is_bronze: false,
      },
    });
    const bronzeExists = await tx.fights.findFirst({
      where: { block_id: blockId, is_bronze: true },
    });
    if (
      semifinals.length === 2 &&
      semifinals.every((fight) => fight.is_finished && fight.winner_id)
    ) {
      const losers = semifinals.map((fight) =>
        fight.winner_id === fight.competitor1_id
          ? fight.competitor2_id
          : fight.competitor1_id,
      );
      const winners = semifinals.map((fight) => fight.winner_id!);

      if (!bronzeExists) {
        await tx.fights.create({
          data: {
            tournament_id: block.tournament_id,
            nomination_id: block.nomination_id,
            block_id: blockId,
            competitor1_id: losers[0],
            competitor2_id: losers[1],
            stage: block.stage,
            fight_number: fightNumber++,
            bracket_round: mainRounds + 1,
            bracket_position: 1,
            is_bronze: true,
            rounds: nomination.rounds,
            round_win: nomination.round_win,
          },
        });
      }

      if (!finalExists) {
        await tx.fights.create({
          data: {
            tournament_id: block.tournament_id,
            nomination_id: block.nomination_id,
            block_id: blockId,
            competitor1_id: winners[0],
            competitor2_id: winners[1],
            stage: block.stage,
            fight_number: fightNumber++,
            bracket_round: mainRounds,
            bracket_position: 1,
            rounds: nomination.rounds,
            round_win: nomination.round_win,
          },
        });
      }
      await tx.competition_round_states.upsert({
        where: {
          block_id_round: { block_id: blockId, round: mainRounds },
        },
        create: {
          block_id: blockId,
          round: mainRounds,
          pairs_fixed: true,
        },
        update: { pairs_fixed: true },
      });
    }

    await this.normalizeBronzeFinalFightNumbersTx(tx, blockId, mainRounds);
  }

  async normalizeBronzeFinalFightNumbersTx(
    tx: PrismaTx,
    blockId: number,
    mainRounds?: number,
  ) {
    const finalFight = await tx.fights.findFirst({
      where: {
        block_id: blockId,
        bracket_round: mainRounds,
        is_bronze: false,
      },
      orderBy: mainRounds === undefined ? { bracket_round: 'desc' } : undefined,
    });
    const bronzeFight = await tx.fights.findFirst({
      where: { block_id: blockId, is_bronze: true },
    });
    if (
      !finalFight ||
      !bronzeFight ||
      bronzeFight.fight_number < finalFight.fight_number
    ) {
      return;
    }

    // Bronze is displayed before the final, so persisted numbers must match UI order.
    await tx.fights.update({
      where: { id: bronzeFight.id },
      data: { fight_number: finalFight.fight_number },
    });
    await tx.fights.update({
      where: { id: finalFight.id },
      data: { fight_number: bronzeFight.fight_number },
    });
  }

  private async reorderOlympicWinnerSlotsTx(
    tx: PrismaTx,
    blockId: number,
    winnerIds: number[],
  ) {
    const winnerSet = new Set(winnerIds);
    const slots = await tx.bracket_slots.findMany({
      where: { block_id: blockId },
      orderBy: { slot_position: 'asc' },
    });
    const orderedSlots = [
      ...slots.filter((slot) => winnerSet.has(slot.competitor_id)),
      ...slots.filter((slot) => !winnerSet.has(slot.competitor_id)),
    ];

    for (const [index, slot] of orderedSlots.entries()) {
      await tx.bracket_slots.update({
        where: { id: slot.id },
        data: { slot_position: -(index + 1) },
      });
    }

    for (const [index, slot] of orderedSlots.entries()) {
      await tx.bracket_slots.update({
        where: { id: slot.id },
        data: { slot_position: index + 1 },
      });
    }
  }

  private async getNextFightNumberTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ) {
    const result = await tx.fights.aggregate({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
      _max: { fight_number: true },
    });

    return (result._max.fight_number ?? 0) + 1;
  }
}
