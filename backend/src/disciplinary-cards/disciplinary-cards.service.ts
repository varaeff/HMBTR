import { BadRequestException, Injectable } from '@nestjs/common';
import { CompetitionService } from '../competition/competition.service';
import { ActiveRedCardService } from './active-reds/active-red-card.service';
import { AutomaticRedCardService } from './automatic-reds/automatic-red-card.service';
import { DisciplinaryCardReader } from './cards/disciplinary-card-reader';
import { DisciplinaryCardStorage } from './cards/disciplinary-card-storage';
import {
  CARD_RED,
  CARD_YELLOW,
  AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
  SOURCE_AUTOMATIC,
  SOURCE_MANUAL,
} from './disciplinary-card.constants';
import type { StoredDisciplinaryCard } from './disciplinary-card.types';
export type {
  DisciplinaryCard,
  DisciplinaryCardSource,
  DisciplinaryCardType,
} from './disciplinary-card.types';
import { DisciplinaryCardConsequencesService } from './consequences/disciplinary-card-consequences.service';
import { CreateDisciplinaryCardDto } from './dto/create-disciplinary-card.dto';
import { UpdateDisciplinaryCardDto } from './dto/update-disciplinary-card.dto';
import { DisciplinaryCardExpirationService } from './expiration/disciplinary-card-expiration.service';
import { DisciplinaryCardPolicyService } from './policy/disciplinary-card-policy.service';
import { RedYellowSourceService } from './red-yellow-sources/red-yellow-source.service';

@Injectable()
export class DisciplinaryCardsService {
  constructor(
    private competitionService: CompetitionService,
    private activeReds: ActiveRedCardService,
    private automaticReds: AutomaticRedCardService,
    private consequences: DisciplinaryCardConsequencesService,
    private expiration: DisciplinaryCardExpirationService,
    private policy: DisciplinaryCardPolicyService,
    private reader: DisciplinaryCardReader,
    private redYellowSources: RedYellowSourceService,
    private storage: DisciplinaryCardStorage,
  ) {}

  async findByFighter(fighterId: number) {
    await this.storage.ensureStorageReady();

    return this.reader.findCards(
      { fighterId },
      this.expiration.toDateOnly(new Date()),
    );
  }

  async findByTournament(tournamentId: number) {
    await this.storage.ensureStorageReady();

    const checkDate =
      await this.expiration.getTournamentCheckDate(tournamentId);

    return this.reader.findCards({ tournamentId }, checkDate);
  }

  async findActiveForTournament(tournamentId: number) {
    await this.storage.ensureStorageReady();

    const checkDate =
      await this.expiration.getTournamentCheckDate(tournamentId);

    return this.reader.findActiveCardsForTournament(tournamentId, checkDate);
  }

  async create(dto: CreateDisciplinaryCardDto) {
    await this.storage.ensureStorageReady();
    await this.competitionService.assertFightLifecycleEditable(dto.fight_id);

    const receivedAt = this.expiration.toDateOnly(dto.received_at);
    await this.policy.validateCardTarget(
      dto.fighter_id,
      dto.tournament_id,
      dto.fight_id,
      { requireUnfinishedFight: false },
    );
    await this.policy.validateTournamentMarshal(
      dto.tournament_id,
      dto.marshal_id,
    );

    const card = await this.storage.insertCard({
      fighterId: dto.fighter_id,
      tournamentId: dto.tournament_id,
      fightId: dto.fight_id,
      marshalId: dto.marshal_id,
      type: dto.type,
      source: SOURCE_MANUAL,
      receivedAt,
      reason: dto.reason,
      expiresAt: await this.expiration.calculateExpiration(
        dto.type,
        dto.fighter_id,
        receivedAt,
        SOURCE_MANUAL,
      ),
      active: true,
    });

    await this.applyConsequences(card);

    const checkDate = await this.expiration.getTournamentCheckDate(
      card.tournament_id,
    );

    return this.reader.findOne(card.id, checkDate);
  }

  async update(id: number, dto: UpdateDisciplinaryCardDto) {
    await this.storage.ensureStorageReady();

    const existing = await this.storage.getStoredCard(id);
    const lockState = await this.policy.getCardFightLockState(
      existing.fight_id,
    );
    await this.policy.validateUpdate(existing, dto, lockState);

    const type = dto.type ?? existing.type;
    const reason = dto.reason ?? existing.reason;
    const marshalId = dto.marshal_id ?? existing.marshal_id;
    const marshalChanged = marshalId !== existing.marshal_id;
    const expiresAt = dto.expires_at
      ? this.expiration.toDateOnly(dto.expires_at)
      : type !== existing.type
        ? await this.expiration.calculateExpiration(
            type,
            existing.fighter_id,
            existing.received_at,
            existing.source,
            existing.id,
          )
        : this.expiration.toDateOnly(existing.expires_at);
    const active = this.resolveUpdatedStructuralActive(existing, dto, type);
    const activatesInactiveRed =
      existing.type === CARD_RED &&
      !existing.active &&
      type === CARD_RED &&
      active;
    const receivedAt = activatesInactiveRed
      ? this.expiration.toDateOnly(new Date())
      : this.expiration.toDateOnly(existing.received_at);
    if (
      activatesInactiveRed &&
      receivedAt.getTime() <=
        this.expiration.toDateOnly(existing.received_at).getTime()
    ) {
      throw new BadRequestException(
        'Inactive red card cannot be activated on or before its original issue date',
      );
    }

    await this.storage.updateCard({
      id,
      reason,
      type,
      marshalId,
      active,
      receivedAt,
      expiresAt,
    });

    if (existing.type === CARD_RED && !lockState.results_fixed) {
      await this.competitionService.resetEditableForfeitsForCard(existing.id);
    }

    const updated = await this.storage.getStoredCard(id);
    if (existing.type === CARD_YELLOW && marshalChanged) {
      await this.redYellowSources.updateAutomaticRedMarshalFromTriggerYellow(
        updated,
      );
    }
    if (existing.type === CARD_RED && updated.type !== CARD_RED) {
      await this.redYellowSources.restoreSourceYellowsForRed(existing.id);
      await this.redYellowSources.deleteRedYellowSources(existing.id);
    }
    if (activatesInactiveRed) {
      await this.redYellowSources.closeSourceYellowsForRed(
        updated.id,
        receivedAt,
      );
    }
    if (updated.type !== existing.type) {
      await this.applyConsequences(updated);
    } else if (
      updated.type === CARD_RED &&
      updated.active &&
      !lockState.results_fixed
    ) {
      await this.competitionService.applyRedCardConsequences(
        existing.tournament_id,
      );
    }

    const checkDate = await this.expiration.getTournamentCheckDate(
      updated.tournament_id,
    );

    return this.reader.findOne(id, checkDate);
  }

  async delete(id: number) {
    await this.storage.ensureStorageReady();

    const card = await this.storage.getStoredCard(id);
    await this.competitionService.assertFightLifecycleEditable(card.fight_id);
    await this.policy.ensureCardCanBeDeleted(card);
    if (card.source === SOURCE_AUTOMATIC) {
      throw new BadRequestException(
        'Automatic card cannot be deleted manually',
      );
    }

    if (card.type === CARD_RED) {
      await this.competitionService.resetForfeitsForCard(card.id);
      await this.redYellowSources.restoreSourceYellowsForRed(card.id);
    } else {
      await this.redYellowSources.deleteAutomaticRedsIssuedFromYellow(card.id);
    }

    await this.storage.deleteCard(id);

    if (card.type === CARD_RED) {
      await this.competitionService.applyRedCardForfeits(card.tournament_id);
    } else {
      await this.automaticReds.createInactiveCrossTournamentRedIfNeeded(
        card.fighter_id,
        card.tournament_id,
        card.received_at,
      );
    }
  }

  async hasActiveRedForTournament(fighterId: number, tournamentId: number) {
    return this.activeReds.hasActiveRedForTournament(fighterId, tournamentId);
  }

  async getActiveRedFighterIdsForTournament(tournamentId: number) {
    return this.activeReds.getActiveRedFighterIdsForTournament(tournamentId);
  }

  private async applyConsequences(card: StoredDisciplinaryCard) {
    if (card.type === CARD_YELLOW) {
      await this.automaticReds.createAutomaticRedIfNeeded(card);
      return;
    }

    await this.consequences.applyRedCardConsequences(card);
  }

  private resolveUpdatedStructuralActive(
    existing: StoredDisciplinaryCard,
    dto: UpdateDisciplinaryCardDto,
    type: StoredDisciplinaryCard['type'],
  ) {
    if (this.isInactiveCrossTournamentAutomaticRed(existing, dto, type)) {
      return dto.active ?? existing.active;
    }

    if (type === CARD_RED && dto.active !== undefined) {
      return dto.active;
    }

    return true;
  }

  private isInactiveCrossTournamentAutomaticRed(
    existing: StoredDisciplinaryCard,
    dto: UpdateDisciplinaryCardDto,
    type: StoredDisciplinaryCard['type'],
  ) {
    return (
      existing.type === CARD_RED &&
      type === CARD_RED &&
      existing.source === SOURCE_AUTOMATIC &&
      existing.reason === AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT &&
      existing.active === false &&
      dto.active !== true
    );
  }
}
