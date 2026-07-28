import { Injectable, NotFoundException } from '@nestjs/common';
import { CompetitionService } from '../../competition/competition.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CARD_RED } from '../disciplinary-card.constants';
import type { StoredDisciplinaryCard } from '../disciplinary-card.types';

@Injectable()
export class DisciplinaryCardConsequencesService {
  constructor(
    private prisma: PrismaService,
    private competitionService: CompetitionService,
  ) {}

  async applyRedCardConsequences(card: StoredDisciplinaryCard) {
    if (card.type !== CARD_RED || !card.active) return;

    await this.removeUnformedOtherNominationCompetitors(card);
    await this.competitionService.applyRedCardConsequences(card.tournament_id);
  }

  private async removeUnformedOtherNominationCompetitors(
    card: StoredDisciplinaryCard,
  ) {
    const sourceFight = await this.prisma.fights.findUnique({
      where: { id: card.fight_id },
      select: { nomination_id: true },
    });

    if (!sourceFight) throw new NotFoundException('Fight not found');

    const competitors = await this.prisma.competitors.findMany({
      where: {
        fighter_id: card.fighter_id,
        tournament_id: card.tournament_id,
        nomination_id: { not: sourceFight.nomination_id },
      },
      select: {
        id: true,
        nomination_id: true,
      },
    });

    if (!competitors.length) return;

    const nominationIds = [
      ...new Set(competitors.map((competitor) => competitor.nomination_id)),
    ];
    const formedBlocks = await this.prisma.competition_blocks.findMany({
      where: {
        tournament_id: card.tournament_id,
        nomination_id: { in: nominationIds },
      },
      select: { nomination_id: true },
    });
    const formedNominationIds = new Set(
      formedBlocks.map((block) => block.nomination_id),
    );
    const removableCompetitorIds = competitors
      .filter(
        (competitor) => !formedNominationIds.has(competitor.nomination_id),
      )
      .map((competitor) => competitor.id);

    if (!removableCompetitorIds.length) return;

    await this.prisma.competitors.deleteMany({
      where: { id: { in: removableCompetitorIds } },
    });
  }
}
