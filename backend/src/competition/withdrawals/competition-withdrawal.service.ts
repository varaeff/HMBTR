import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { emptyFightScoreData } from '../competition.helpers';
import type {
  ActiveWithdrawal,
  PrismaTx,
  WithdrawalForfeitFight,
} from '../competition-internal.types';
import { CreateFightWithdrawalDto } from '../dto/create-fight-withdrawal.dto';
import { CreateNoShowWithdrawalDto } from '../dto/create-no-show-withdrawal.dto';
import { CancelWithdrawalDto } from '../dto/cancel-withdrawal.dto';
import { canApplyRedCardForfeitToFight } from '../red-cards/red-card-policy';
import { TieBreakerService } from '../rankings/tie-breaker.service';
import { CompetitionScoringService } from '../scoring/competition-scoring.service';

export const WITHDRAWAL_SOURCE_NO_SHOW = 'NO_SHOW';
export const WITHDRAWAL_SOURCE_FIGHT = 'FIGHT';
export const NO_SHOW_WITHDRAWAL_REASON = 'неявка';

@Injectable()
export class CompetitionWithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: CompetitionScoringService,
    private readonly tieBreakerService: TieBreakerService,
  ) {}

  async createNoShow(dto: CreateNoShowWithdrawalDto) {
    const tournamentNomination =
      await this.prisma.tournament_nominations.findFirst({
        where: {
          tournament_id: dto.tournament_id,
          nomination_id: dto.nomination_id,
        },
        include: { blocks: true },
      });
    if (!tournamentNomination) {
      throw new NotFoundException('Tournament nomination not found');
    }
    if (tournamentNomination.is_open) {
      throw new BadRequestException('Registration is open');
    }
    if (tournamentNomination.is_finished) {
      throw new BadRequestException('Nomination is finished');
    }
    if (tournamentNomination.blocks.length > 0) {
      throw new BadRequestException('Competition block already exists');
    }

    const competitor = await this.prisma.competitors.findUnique({
      where: { id: dto.competitor_id },
    });
    if (
      !competitor ||
      competitor.tournament_id !== dto.tournament_id ||
      competitor.nomination_id !== dto.nomination_id
    ) {
      throw new BadRequestException('Competitor is not registered');
    }
    await this.assertNoActiveWithdrawalTx(
      this.prisma,
      tournamentNomination.id,
      dto.competitor_id,
    );

    return this.prisma.fighter_withdrawals.create({
      data: {
        tournament_nomination_id: tournamentNomination.id,
        tournament_id: dto.tournament_id,
        nomination_id: dto.nomination_id,
        competitor_id: dto.competitor_id,
        source: WITHDRAWAL_SOURCE_NO_SHOW,
        reason: NO_SHOW_WITHDRAWAL_REASON,
        is_excused: false,
      },
    });
  }

  async createFromFight(dto: CreateFightWithdrawalDto) {
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('Withdrawal reason is required');

    const fight = await this.prisma.fights.findUnique({
      where: { id: dto.fight_id },
      include: {
        block: {
          include: {
            tournament_nomination: true,
            round_states: true,
          },
        },
      },
    });
    if (!fight?.block) throw new NotFoundException('Fight not found');
    if (
      dto.competitor_id !== fight.competitor1_id &&
      dto.competitor_id !== fight.competitor2_id
    ) {
      throw new BadRequestException('Competitor does not belong to the fight');
    }
    if (!canApplyRedCardForfeitToFight(fight)) {
      throw new BadRequestException('Fight results are fixed');
    }
    await this.assertNoActiveWithdrawalTx(
      this.prisma,
      fight.block.tournament_nomination_id,
      dto.competitor_id,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.fighter_withdrawals.create({
        data: {
          tournament_nomination_id: fight.block!.tournament_nomination_id,
          tournament_id: fight.tournament_id,
          nomination_id: fight.nomination_id,
          competitor_id: dto.competitor_id,
          source: WITHDRAWAL_SOURCE_FIGHT,
          source_fight_id: fight.id,
          source_block_id: fight.block_id,
          source_fight_number: fight.fight_number,
          reason,
          is_excused: dto.is_excused,
        },
      });
      await this.applyWithdrawalForfeitsTx(tx, fight.tournament_id);
    });
  }

  async cancel(dto: CancelWithdrawalDto) {
    const withdrawal = await this.prisma.fighter_withdrawals.findUnique({
      where: { id: dto.withdrawal_id },
      include: {
        tournament_nomination: true,
        forfeited_fights: {
          include: {
            block: {
              include: {
                tournament_nomination: true,
                round_states: true,
              },
            },
          },
        },
      },
    });
    if (!withdrawal?.active) {
      throw new NotFoundException('Withdrawal not found');
    }
    if (withdrawal.tournament_nomination.is_finished) {
      throw new BadRequestException('Nomination is finished');
    }
    if (
      withdrawal.forfeited_fights.some(
        (fight) => !canApplyRedCardForfeitToFight(fight),
      )
    ) {
      throw new BadRequestException('Withdrawal results are fixed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fighter_withdrawals.update({
        where: { id: withdrawal.id },
        data: { active: false, canceled_at: new Date() },
      });
      await this.resetForfeitsForWithdrawalTx(tx, withdrawal.id);
    });
  }

  async applyWithdrawalForfeits(tournamentId: number) {
    await this.prisma.$transaction((tx) =>
      this.applyWithdrawalForfeitsTx(tx, tournamentId),
    );
  }

  async applyWithdrawalForfeitsTx(tx: PrismaTx, tournamentId: number) {
    const fights = await tx.fights.findMany({
      where: { tournament_id: tournamentId },
      include: {
        block: {
          include: {
            tournament_nomination: true,
            round_states: true,
          },
        },
      },
    });
    if (!fights.length) return;

    const withdrawals = await tx.fighter_withdrawals.findMany({
      where: { tournament_id: tournamentId, active: true },
      select: {
        id: true,
        tournament_nomination_id: true,
        tournament_id: true,
        nomination_id: true,
        competitor_id: true,
        source: true,
        source_fight_id: true,
        source_block_id: true,
        source_fight_number: true,
        reason: true,
        is_excused: true,
      },
    });
    if (!withdrawals.length) return;

    const withdrawalsByCompetitor = new Map<number, ActiveWithdrawal[]>();
    for (const withdrawal of withdrawals) {
      const current =
        withdrawalsByCompetitor.get(withdrawal.competitor_id) ?? [];
      current.push(withdrawal);
      withdrawalsByCompetitor.set(withdrawal.competitor_id, current);
    }

    for (const fight of fights) {
      if (fight.forfeit_card_id !== null) continue;
      if (!canApplyRedCardForfeitToFight(fight)) continue;

      const firstWithdrawal = this.getApplicableWithdrawalForFight(
        fight,
        withdrawalsByCompetitor.get(fight.competitor1_id) ?? [],
      );
      const secondWithdrawal = this.getApplicableWithdrawalForFight(
        fight,
        withdrawalsByCompetitor.get(fight.competitor2_id) ?? [],
      );
      const losingCompetitorId = await this.getForfeitLosingCompetitorId(
        tx,
        fight,
        firstWithdrawal,
        secondWithdrawal,
      );
      if (!losingCompetitorId) continue;

      const firstLoses = losingCompetitorId === fight.competitor1_id;
      await this.persistWithdrawalForfeitTx(
        tx,
        fight,
        firstLoses,
        firstLoses ? firstWithdrawal : secondWithdrawal,
      );
    }
  }

  async resetForfeitsForWithdrawalTx(tx: PrismaTx, withdrawalId: number) {
    const fights = await tx.fights.findMany({
      where: { forfeit_withdrawal_id: withdrawalId },
      select: { id: true },
    });
    await tx.fights.updateMany({
      where: { forfeit_withdrawal_id: withdrawalId },
      data: emptyFightScoreData,
    });
    if (fights.length) {
      await tx.fight_round_scores.deleteMany({
        where: { fight_id: { in: fights.map((fight) => fight.id) } },
      });
      await tx.fight_warnings.deleteMany({
        where: { fight_id: { in: fights.map((fight) => fight.id) } },
      });
    }
  }

  async resetForfeitsForDeletedFightsTx(
    tx: PrismaTx,
    blockId: number,
    round?: number,
    options: { includeCurrentRoundBronze?: boolean } = {},
  ) {
    const bronzeRoundPredicate =
      options.includeCurrentRoundBronze === false
        ? { gt: round }
        : { gte: round };
    const fights = await tx.fights.findMany({
      where: {
        block_id: blockId,
        ...(round === undefined
          ? {}
          : {
              OR: [
                { bracket_round: round },
                { is_bronze: true, bracket_round: bronzeRoundPredicate },
              ],
            }),
      },
      select: { id: true },
    });
    if (!fights.length) return;

    const withdrawals = await tx.fighter_withdrawals.findMany({
      where: { source_fight_id: { in: fights.map((fight) => fight.id) } },
      select: { id: true },
    });
    if (!withdrawals.length) return;

    const withdrawalIds = withdrawals.map((withdrawal) => withdrawal.id);
    const affectedFights = await tx.fights.findMany({
      where: { forfeit_withdrawal_id: { in: withdrawalIds } },
      select: { id: true },
    });
    await tx.fights.updateMany({
      where: { forfeit_withdrawal_id: { in: withdrawalIds } },
      data: emptyFightScoreData,
    });
    if (affectedFights.length) {
      await tx.fight_round_scores.deleteMany({
        where: {
          fight_id: { in: affectedFights.map((fight) => fight.id) },
        },
      });
      await tx.fight_warnings.deleteMany({
        where: {
          fight_id: { in: affectedFights.map((fight) => fight.id) },
        },
      });
    }
    await tx.fighter_withdrawals.deleteMany({
      where: { id: { in: withdrawalIds } },
    });
  }

  async getActiveWithdrawalCompetitorIdsTx(tx: PrismaTx, blockId: number) {
    const block = await tx.competition_blocks.findUnique({
      where: { id: blockId },
      select: { tournament_nomination_id: true },
    });
    if (!block) throw new NotFoundException('Block not found');

    const withdrawals = await tx.fighter_withdrawals.findMany({
      where: {
        tournament_nomination_id: block.tournament_nomination_id,
        active: true,
      },
      select: { competitor_id: true },
    });

    return new Set(withdrawals.map((withdrawal) => withdrawal.competitor_id));
  }

  excludeActiveWithdrawalCompetitors<T extends { competitorId: number }>(
    ranked: T[],
    activeWithdrawalCompetitorIds: Set<number>,
  ) {
    return ranked.filter(
      (competitor) =>
        !activeWithdrawalCompetitorIds.has(competitor.competitorId),
    );
  }

  async getActiveWithdrawalsForTournamentNominationTx(
    tx: PrismaTx,
    tournamentNominationId: number,
  ) {
    return tx.fighter_withdrawals.findMany({
      where: { tournament_nomination_id: tournamentNominationId, active: true },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        competitor_id: true,
        reason: true,
        is_excused: true,
        source: true,
        source_fight_id: true,
      },
    });
  }

  async getPendingDoubleWithdrawalTieTx(
    tx: PrismaTx,
    blockId: number,
  ): Promise<{
    fightId: number;
    competitorIds: number[];
  } | null> {
    const fights = await tx.fights.findMany({
      where: { block_id: blockId, is_finished: false },
      include: {
        block: {
          include: {
            tournament_nomination: true,
            round_states: true,
          },
        },
      },
      orderBy: [
        { bracket_round: 'asc' },
        { bracket_position: 'asc' },
        { fight_number: 'asc' },
      ],
    });
    if (!fights.length) return null;

    const withdrawals = await tx.fighter_withdrawals.findMany({
      where: {
        tournament_id: fights[0].tournament_id,
        active: true,
      },
      select: {
        id: true,
        tournament_nomination_id: true,
        tournament_id: true,
        nomination_id: true,
        competitor_id: true,
        source: true,
        source_fight_id: true,
        source_block_id: true,
        source_fight_number: true,
        reason: true,
        is_excused: true,
      },
    });
    const withdrawalsByCompetitor = new Map<number, ActiveWithdrawal[]>();
    for (const withdrawal of withdrawals) {
      const current =
        withdrawalsByCompetitor.get(withdrawal.competitor_id) ?? [];
      current.push(withdrawal);
      withdrawalsByCompetitor.set(withdrawal.competitor_id, current);
    }

    for (const fight of fights) {
      if (!canApplyRedCardForfeitToFight(fight)) continue;
      const firstWithdrawal = this.getApplicableWithdrawalForFight(
        fight,
        withdrawalsByCompetitor.get(fight.competitor1_id) ?? [],
      );
      const secondWithdrawal = this.getApplicableWithdrawalForFight(
        fight,
        withdrawalsByCompetitor.get(fight.competitor2_id) ?? [],
      );
      if (!firstWithdrawal || !secondWithdrawal) continue;

      const metrics = await this.tieBreakerService.getMetricsTx(tx, {
        tournamentId: fight.tournament_id,
        nominationId: fight.nomination_id,
        competitorIds: [fight.competitor1_id, fight.competitor2_id],
        excludeFightId: fight.id,
      });
      const firstMetric = metrics.get(fight.competitor1_id);
      const secondMetric = metrics.get(fight.competitor2_id);
      if (!firstMetric || !secondMetric) continue;

      if (
        this.tieBreakerService.resolvePair(firstMetric, secondMetric)
          .winnerCompetitorId === null
      ) {
        return {
          fightId: fight.id,
          competitorIds: [fight.competitor1_id, fight.competitor2_id],
        };
      }
    }

    return null;
  }

  async resolveDoubleWithdrawalForfeitTx(
    tx: PrismaTx,
    fightId: number,
    winnerCompetitorId: number,
  ) {
    const fight = await tx.fights.findUnique({
      where: { id: fightId },
      include: {
        block: {
          include: {
            tournament_nomination: true,
            round_states: true,
          },
        },
      },
    });
    if (!fight?.block) return false;
    if (!canApplyRedCardForfeitToFight(fight)) {
      throw new BadRequestException('Fight cannot be resolved now');
    }
    if (
      winnerCompetitorId !== fight.competitor1_id &&
      winnerCompetitorId !== fight.competitor2_id
    ) {
      throw new BadRequestException('Winner does not belong to the fight');
    }

    const withdrawals = await tx.fighter_withdrawals.findMany({
      where: {
        tournament_nomination_id: fight.block.tournament_nomination_id,
        active: true,
        competitor_id: { in: [fight.competitor1_id, fight.competitor2_id] },
      },
      select: {
        id: true,
        tournament_nomination_id: true,
        tournament_id: true,
        nomination_id: true,
        competitor_id: true,
        source: true,
        source_fight_id: true,
        source_block_id: true,
        source_fight_number: true,
        reason: true,
        is_excused: true,
      },
    });
    const firstWithdrawal = this.getApplicableWithdrawalForFight(
      fight,
      withdrawals.filter(
        (withdrawal) => withdrawal.competitor_id === fight.competitor1_id,
      ),
    );
    const secondWithdrawal = this.getApplicableWithdrawalForFight(
      fight,
      withdrawals.filter(
        (withdrawal) => withdrawal.competitor_id === fight.competitor2_id,
      ),
    );
    if (!firstWithdrawal || !secondWithdrawal) return false;

    const firstLoses = winnerCompetitorId === fight.competitor2_id;
    await this.persistWithdrawalForfeitTx(
      tx,
      fight,
      firstLoses,
      firstLoses ? firstWithdrawal : secondWithdrawal,
    );
    return true;
  }

  private async assertNoActiveWithdrawalTx(
    tx: PrismaTx,
    tournamentNominationId: number,
    competitorId: number,
  ) {
    const existing = await tx.fighter_withdrawals.findFirst({
      where: {
        tournament_nomination_id: tournamentNominationId,
        competitor_id: competitorId,
        active: true,
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Competitor is already withdrawn');
    }
  }

  private getApplicableWithdrawalForFight(
    fight: WithdrawalForfeitFight,
    withdrawals: ActiveWithdrawal[],
  ) {
    return withdrawals.find((withdrawal) =>
      this.isWithdrawalApplicableToFight(fight, withdrawal),
    );
  }

  private isWithdrawalApplicableToFight(
    fight: WithdrawalForfeitFight,
    withdrawal: ActiveWithdrawal,
  ) {
    if (fight.nomination_id !== withdrawal.nomination_id) return false;
    if (withdrawal.source === WITHDRAWAL_SOURCE_NO_SHOW) return true;
    if (withdrawal.source !== WITHDRAWAL_SOURCE_FIGHT) return false;
    if (withdrawal.source_block_id === null) return false;
    if (withdrawal.source_fight_number === null) return false;
    if (fight.block_id !== withdrawal.source_block_id) return false;

    return fight.fight_number >= withdrawal.source_fight_number;
  }

  private async getForfeitLosingCompetitorId(
    tx: PrismaTx,
    fight: WithdrawalForfeitFight,
    firstWithdrawal: ActiveWithdrawal | undefined,
    secondWithdrawal: ActiveWithdrawal | undefined,
  ) {
    if (firstWithdrawal && !secondWithdrawal) return fight.competitor1_id;
    if (!firstWithdrawal && secondWithdrawal) return fight.competitor2_id;
    if (!firstWithdrawal || !secondWithdrawal) return null;

    const metrics = await this.tieBreakerService.getMetricsTx(tx, {
      tournamentId: fight.tournament_id,
      nominationId: fight.nomination_id,
      competitorIds: [fight.competitor1_id, fight.competitor2_id],
      excludeFightId: fight.id,
    });
    const firstMetric = metrics.get(fight.competitor1_id);
    const secondMetric = metrics.get(fight.competitor2_id);
    if (!firstMetric || !secondMetric) return null;

    return this.tieBreakerService.resolvePair(firstMetric, secondMetric)
      .loserCompetitorId;
  }

  private async persistWithdrawalForfeitTx(
    tx: PrismaTx,
    fight: {
      id: number;
      rounds: number;
      round_win: boolean;
      competitor1_id: number;
      competitor2_id: number;
    },
    firstLoses: boolean,
    withdrawal: ActiveWithdrawal | undefined,
  ) {
    if (!withdrawal) return;

    const forfeitRoundScores =
      this.scoringService.getTechnicalForfeitRoundScores(
        fight.rounds,
        fight.round_win,
        firstLoses,
      );
    await tx.fights.update({
      where: { id: fight.id },
      data: {
        ...this.scoringService.getTechnicalForfeitScoreData(
          fight.rounds,
          fight.round_win,
          firstLoses,
        ),
        winner_id: firstLoses ? fight.competitor2_id : fight.competitor1_id,
        is_finished: true,
        forfeit_withdrawal_id: withdrawal.id,
      },
    });
    await tx.fight_warnings.deleteMany({ where: { fight_id: fight.id } });
    await this.scoringService.replaceFightRoundScoresTx(
      tx,
      fight.id,
      forfeitRoundScores,
    );
  }
}
