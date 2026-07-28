import { BadRequestException, Injectable } from '@nestjs/common';
import { CompetitionService } from '../competition/competition.service';
import { ActiveRedCardService } from './active-reds/active-red-card.service';
import { AutomaticRedCardService } from './automatic-reds/automatic-red-card.service';
import { DisciplinaryCardReader } from './cards/disciplinary-card-reader';
import { DisciplinaryCardStorage } from './cards/disciplinary-card-storage';
import {
  CARD_RED,
  CARD_YELLOW,
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

    return this.reader.findCards({ fighterId });
  }

  async findByTournament(tournamentId: number) {
    await this.storage.ensureStorageReady();

    return this.reader.findCards({ tournamentId });
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

    return this.reader.findOne(card.id);
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
    const active =
      type === CARD_YELLOW
        ? existing.type === CARD_YELLOW
          ? existing.active
          : true
        : existing.type !== CARD_RED
          ? true
          : (dto.active ?? existing.active);
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
    const activatesInactiveRed =
      existing.type === CARD_RED &&
      !existing.active &&
      type === CARD_RED &&
      active;

    await this.storage.updateCard({
      id,
      reason,
      type,
      marshalId,
      active,
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
        this.expiration.toDateOnly(new Date()),
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

    return this.reader.findOne(id);
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
}
