import { BadRequestException, Injectable } from '@nestjs/common';
import { RatingsService } from '../../ratings/ratings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { rankCompetitors } from '../competition.logic';
import {
  BLOCK_GROUP,
  LIFECYCLE_RESULTS_FIXED,
  SCOPE_FINAL,
  STATUS_LOCKED,
} from '../competition.constants';
import { assertSingleTransition } from '../competition.helpers';
import type { PrismaTx } from '../competition-internal.types';
import { FinishCompetitionDto } from '../dto/finish-competition.dto';
import { CompetitionRankingsService } from '../rankings/competition-rankings.service';
import { CompetitionStateReader } from '../state/competition-state.reader';

@Injectable()
export class CompetitionFinishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingsService: RatingsService,
    private readonly stateReader: CompetitionStateReader,
    private readonly rankingsService: CompetitionRankingsService,
  ) {}

  async finish(dto: FinishCompetitionDto) {
    let completedTournamentNominationId: number | null = null;

    await this.prisma.$transaction(async (tx) => {
      const tournamentNomination =
        await this.stateReader.getTournamentNominationTx(
          tx,
          dto.tournament_id,
          dto.nomination_id,
        );
      if (tournamentNomination.is_finished) {
        throw new BadRequestException('Nomination is finished');
      }
      const activeBlock = await this.stateReader.getActiveBlockTx(
        tx,
        tournamentNomination.id,
      );
      if (!activeBlock) throw new BadRequestException('No active block');
      if (activeBlock.type === BLOCK_GROUP) {
        if (activeBlock.lifecycle_state !== LIFECYCLE_RESULTS_FIXED) {
          throw new BadRequestException('Fix final stage results first');
        }
        const groups = await tx.groups.findMany({
          where: { block_id: activeBlock.id },
        });
        if (groups.length !== 1) {
          throw new BadRequestException(
            'Subgroup mode can finish only from a single group',
          );
        }
        const rankings = await this.rankingsService.getGroupRankingsTx(
          tx,
          activeBlock.id,
          groups[0].id,
        );
        const ranked = rankCompetitors(rankings.stats, rankings.manualOrder);
        await this.saveFinalPlacementsTx(
          tx,
          tournamentNomination.id,
          activeBlock.id,
          ranked.slice(0, 3),
        );
      } else {
        const slotCount = await tx.bracket_slots.count({
          where: { block_id: activeBlock.id },
        });
        const finalRound = Math.log2(slotCount);
        const finalState = await tx.competition_round_states.findUnique({
          where: {
            block_id_round: { block_id: activeBlock.id, round: finalRound },
          },
        });
        if (!finalState?.results_fixed) {
          throw new BadRequestException('Fix final results first');
        }
        const [finalFight, bronzeFight] = await Promise.all([
          tx.fights.findFirst({
            where: {
              block_id: activeBlock.id,
              bracket_round: finalRound,
              is_bronze: false,
            },
          }),
          tx.fights.findFirst({
            where: { block_id: activeBlock.id, is_bronze: true },
          }),
        ]);
        if (!finalFight?.winner_id || !bronzeFight?.winner_id) {
          throw new BadRequestException('Final fights are incomplete');
        }
        const secondPlace =
          finalFight.winner_id === finalFight.competitor1_id
            ? finalFight.competitor2_id
            : finalFight.competitor1_id;
        await this.saveFinalPlacementsTx(
          tx,
          tournamentNomination.id,
          activeBlock.id,
          [
            { competitorId: finalFight.winner_id },
            { competitorId: secondPlace },
            { competitorId: bronzeFight.winner_id },
          ],
        );
      }
      await tx.competition_blocks.update({
        where: { id: activeBlock.id },
        data: { status: STATUS_LOCKED },
      });
      const transition = await tx.tournament_nominations.updateMany({
        where: { id: tournamentNomination.id, is_finished: false },
        data: {
          is_finished: true,
          is_open: false,
          rating_status: 'PENDING',
          rating_calculated_at: null,
          rating_error: null,
        },
      });
      assertSingleTransition(transition.count);
      completedTournamentNominationId = tournamentNomination.id;
    });

    this.scheduleRatingCalculation(completedTournamentNominationId);

    return this.stateReader.getState(dto.tournament_id, dto.nomination_id);
  }

  async resetRatingState(tournamentNominationId: number) {
    await this.prisma.tournament_nominations.update({
      where: { id: tournamentNominationId },
      data: {
        rating_status: 'PENDING',
        rating_calculated_at: null,
        rating_error: null,
      },
    });
  }

  private scheduleRatingCalculation(tournamentNominationId: number | null) {
    if (!tournamentNominationId) return;

    void this.ratingsService.calculateForTournamentNomination(
      tournamentNominationId,
    );
  }

  private async saveFinalPlacementsTx(
    tx: PrismaTx,
    tournamentNominationId: number,
    blockId: number,
    ranked: Array<{ competitorId: number }>,
  ) {
    await tx.competition_placements.deleteMany({
      where: {
        tournament_nomination_id: tournamentNominationId,
        scope: SCOPE_FINAL,
      },
    });
    await Promise.all(
      ranked.slice(0, 3).map((competitor, index) =>
        tx.competition_placements.create({
          data: {
            tournament_nomination_id: tournamentNominationId,
            block_id: blockId,
            competitor_id: competitor.competitorId,
            scope: SCOPE_FINAL,
            place: index + 1,
          },
        }),
      ),
    );
  }
}
