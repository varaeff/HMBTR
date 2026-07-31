import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BLOCK_GROUP,
  LIFECYCLE_FIGHTS_EDITABLE,
  LIFECYCLE_RESULTS_FIXED,
  SCOPE_GROUP,
  SCOPE_OLYMPIC_THIRD,
  STATUS_ACTIVE,
} from '../competition.constants';
import { assertSingleTransition } from '../competition.helpers';
import type { PrismaTx } from '../competition-internal.types';
import { ResolveTiesDto } from '../dto/resolve-ties.dto';
import { PendingTieService } from './pending-tie.service';

@Injectable()
export class TieResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pendingTieService: PendingTieService,
  ) {}

  async resolveTies(dto: ResolveTiesDto) {
    const tournamentNomination = await this.getTournamentNomination(
      dto.tournament_id,
      dto.nomination_id,
    );
    const tieScope = dto.tie_scope ?? SCOPE_GROUP;

    await this.prisma.$transaction(async (tx) => {
      const activeBlock = await this.getActiveBlockTx(
        tx,
        tournamentNomination.id,
      );
      if (
        !activeBlock ||
        activeBlock.type !== BLOCK_GROUP ||
        activeBlock.lifecycle_state !== LIFECYCLE_FIGHTS_EDITABLE
      ) {
        throw new BadRequestException(
          'Group results must be editable to resolve ties',
        );
      }
      if (tieScope === SCOPE_OLYMPIC_THIRD) {
        await this.saveOlympicThirdPlaceOrderTx(
          tx,
          dto,
          tournamentNomination.id,
        );
        return;
      }

      await this.saveGroupOrderAndFixIfResolvedTx(
        tx,
        dto,
        tournamentNomination.id,
        activeBlock.id,
      );
    });
  }

  private async saveOlympicThirdPlaceOrderTx(
    tx: PrismaTx,
    dto: ResolveTiesDto,
    tournamentNominationId: number,
  ) {
    if (!dto.block_id) {
      throw new BadRequestException('Block is required');
    }

    const block = await tx.competition_blocks.findUnique({
      where: { id: dto.block_id },
    });
    if (
      !block ||
      block.tournament_nomination_id !== tournamentNominationId ||
      block.type !== BLOCK_GROUP
    ) {
      throw new BadRequestException('Group block is required');
    }

    await tx.competition_placements.deleteMany({
      where: {
        tournament_nomination_id: tournamentNominationId,
        scope: SCOPE_OLYMPIC_THIRD,
        block_id: dto.block_id,
      },
    });
    await Promise.all(
      dto.ordered_competitor_ids.map((competitorId, index) =>
        tx.competition_placements.create({
          data: {
            tournament_nomination_id: tournamentNominationId,
            block_id: dto.block_id,
            competitor_id: competitorId,
            scope: SCOPE_OLYMPIC_THIRD,
            place: index + 1,
          },
        }),
      ),
    );
  }

  private async saveGroupOrderAndFixIfResolvedTx(
    tx: PrismaTx,
    dto: ResolveTiesDto,
    tournamentNominationId: number,
    activeBlockId: number,
  ) {
    if (!dto.group_id) {
      throw new BadRequestException('Group is required');
    }
    const groupId = dto.group_id;

    await tx.competition_placements.deleteMany({
      where: {
        tournament_nomination_id: tournamentNominationId,
        scope: SCOPE_GROUP,
        group_id: groupId,
      },
    });
    await Promise.all(
      dto.ordered_competitor_ids.map((competitorId, index) =>
        tx.competition_placements.create({
          data: {
            tournament_nomination_id: tournamentNominationId,
            group_id: groupId,
            competitor_id: competitorId,
            scope: SCOPE_GROUP,
            place: index + 1,
          },
        }),
      ),
    );

    const unfinishedFights = await tx.fights.count({
      where: { block_id: activeBlockId, is_finished: false },
    });
    if (unfinishedFights > 0) {
      throw new BadRequestException('All group fights must be completed');
    }
    const groupsCount = await tx.groups.count({
      where: { block_id: activeBlockId },
    });
    const places = groupsCount === 1 ? 3 : 2;
    if (
      await this.pendingTieService.getPendingTieTx(tx, activeBlockId, places)
    ) {
      return;
    }

    const transition = await tx.competition_blocks.updateMany({
      where: {
        id: activeBlockId,
        lifecycle_state: LIFECYCLE_FIGHTS_EDITABLE,
        status: STATUS_ACTIVE,
      },
      data: { lifecycle_state: LIFECYCLE_RESULTS_FIXED },
    });
    assertSingleTransition(transition.count);
  }

  private async getTournamentNomination(
    tournamentId: number,
    nominationId: number,
  ) {
    const tournamentNomination =
      await this.prisma.tournament_nominations.findFirst({
        where: { tournament_id: tournamentId, nomination_id: nominationId },
      });
    if (!tournamentNomination) {
      throw new NotFoundException('Tournament nomination not found');
    }
    return tournamentNomination;
  }

  private getActiveBlockTx(tx: PrismaTx, tournamentNominationId: number) {
    return tx.competition_blocks.findFirst({
      where: {
        tournament_nomination_id: tournamentNominationId,
        status: STATUS_ACTIVE,
      },
      orderBy: { stage: 'desc' },
    });
  }
}
