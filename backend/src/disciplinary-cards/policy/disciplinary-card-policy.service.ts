import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isFightResultsFixed } from '../../competition/competition.helpers';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
  CARD_RED,
  CARD_YELLOW,
  SOURCE_AUTOMATIC,
} from '../disciplinary-card.constants';
import type {
  CardFightLockState,
  StoredDisciplinaryCard,
} from '../disciplinary-card.types';
import { UpdateDisciplinaryCardDto } from '../dto/update-disciplinary-card.dto';
import { RedYellowSourceService } from '../red-yellow-sources/red-yellow-source.service';

@Injectable()
export class DisciplinaryCardPolicyService {
  constructor(
    private prisma: PrismaService,
    private redYellowSources: RedYellowSourceService,
  ) {}

  async validateCardTarget(
    fighterId: number,
    tournamentId: number,
    fightId: number,
    options: { requireUnfinishedFight: boolean } = {
      requireUnfinishedFight: false,
    },
  ) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: fightId },
      include: {
        competitor1: true,
        competitor2: true,
      },
    });

    if (!fight) throw new NotFoundException('Fight not found');
    if (options.requireUnfinishedFight && fight.is_finished) {
      throw new BadRequestException(
        'Cannot issue a card for a fight with recorded result',
      );
    }
    if (fight.tournament_id !== tournamentId) {
      throw new BadRequestException('Fight does not belong to tournament');
    }

    const fightFighterIds = [
      fight.competitor1.fighter_id,
      fight.competitor2.fighter_id,
    ];

    if (!fightFighterIds.includes(fighterId)) {
      throw new BadRequestException('Fighter does not belong to fight');
    }
  }

  async getCardFightLockState(fightId: number) {
    const rows = await this.prisma.$queryRaw<CardFightLockState[]>`
      SELECT
        (
          cb."status" <> 'ACTIVE'
          OR tn."is_finished" = true
        ) AS "fight_locked",
        (
          CASE
            WHEN cb."type" = 'GROUP' THEN cb."lifecycle_state" = 'RESULTS_FIXED'
            ELSE EXISTS (
              SELECT 1
              FROM "competition_round_states" crs
              WHERE crs."block_id" = cb."id"
                AND crs."results_fixed" = true
                AND (
                  crs."round" = f."bracket_round"
                  OR (
                    f."is_bronze" = true
                    AND crs."round" = (
                      SELECT MAX(final_state."round")
                      FROM "competition_round_states" final_state
                      WHERE final_state."block_id" = cb."id"
                    )
                  )
                )
            )
          END
        ) AS "results_fixed"
      FROM "fights" f
      JOIN "competition_blocks" cb ON cb."id" = f."block_id"
      JOIN "tournament_nominations" tn ON tn."id" = cb."tournament_nomination_id"
      WHERE f."id" = ${fightId}
      LIMIT 1
    `;
    const state = rows[0];

    if (!state) throw new NotFoundException('Fight not found');

    return state;
  }

  async validateTournamentMarshal(tournamentId: number, marshalId: number) {
    const tournamentMarshal = await this.prisma.tournament_marshals.findFirst({
      where: {
        tournament_id: tournamentId,
        marshal_id: marshalId,
      },
      select: { id: true },
    });

    if (!tournamentMarshal) {
      throw new BadRequestException('Marshal is not registered for tournament');
    }
  }

  async validateUpdate(
    existing: StoredDisciplinaryCard,
    dto: UpdateDisciplinaryCardDto,
    lockState: CardFightLockState,
  ) {
    this.validateAutomaticCardUpdate(existing, dto);

    if (
      dto.marshal_id !== undefined &&
      dto.marshal_id !== existing.marshal_id
    ) {
      await this.validateTournamentMarshal(
        existing.tournament_id,
        dto.marshal_id,
      );
    }
    if (
      existing.type === CARD_YELLOW &&
      (await this.redYellowSources.isYellowExpirationLocked(existing.id))
    ) {
      throw new BadRequestException('Yellow card is locked by automatic red');
    }

    const resultFieldsChanged =
      (dto.type !== undefined && dto.type !== existing.type) ||
      (dto.active !== undefined && dto.active !== existing.active);
    if (
      (lockState.fight_locked || lockState.results_fixed) &&
      resultFieldsChanged &&
      !this.isAllowedInactiveAutomaticRedActivation(existing, dto)
    ) {
      throw new BadRequestException('Card result-affecting fields are fixed');
    }
    if (existing.type === CARD_RED && existing.active && dto.active === false) {
      throw new BadRequestException('Active red card cannot be deactivated');
    }
  }

  async ensureCardCanBeDeleted(card: StoredDisciplinaryCard) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: card.fight_id },
      include: {
        block: {
          include: {
            round_states: true,
            tournament_nomination: true,
          },
        },
      },
    });

    if (!fight) throw new NotFoundException('Fight not found');
    if (
      fight.block?.status !== 'ACTIVE' ||
      fight.block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException(
        'Cannot delete a card after this stage is completed',
      );
    }
    if (isFightResultsFixed({ ...fight, block: fight.block })) {
      throw new BadRequestException(
        'Cannot delete a card after fight results are fixed',
      );
    }
    if (fight.block.type === 'OLYMPIC' && fight.bracket_round !== null) {
      const sourceRound = fight.bracket_round;
      if (fight.block.round_states.some((state) => state.round > sourceRound)) {
        throw new BadRequestException(
          'Cannot delete a card after later Olympic fights are formed',
        );
      }
    }
  }

  private validateAutomaticCardUpdate(
    existing: StoredDisciplinaryCard,
    dto: UpdateDisciplinaryCardDto,
  ) {
    if (existing.source !== SOURCE_AUTOMATIC) return;

    if (dto.reason !== undefined) {
      throw new BadRequestException('Automatic card reason cannot be edited');
    }
    if (dto.type !== undefined) {
      throw new BadRequestException('Automatic card type cannot be edited');
    }
    if (dto.marshal_id !== undefined) {
      throw new BadRequestException('Automatic card marshal cannot be edited');
    }
    if (
      dto.active !== undefined &&
      !this.isAllowedInactiveAutomaticRedActivation(existing, dto)
    ) {
      throw new BadRequestException(
        'Automatic card active flag cannot be edited',
      );
    }
  }

  private isAllowedInactiveAutomaticRedActivation(
    existing: StoredDisciplinaryCard,
    dto: UpdateDisciplinaryCardDto,
  ) {
    return (
      existing.type === CARD_RED &&
      existing.source === SOURCE_AUTOMATIC &&
      existing.reason === AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT &&
      existing.active === false &&
      dto.active === true &&
      dto.type === undefined
    );
  }
}
