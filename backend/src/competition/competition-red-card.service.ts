import { Injectable } from '@nestjs/common';
import type { PrismaTx } from './competition-internal.types';
import { RedCardConsequencesService } from './red-cards/red-card-consequences.service';
import { RedCardForfeitService } from './red-cards/red-card-forfeit.service';
import { RedCardRegistrationService } from './red-cards/red-card-registration.service';

@Injectable()
export class CompetitionRedCardService {
  constructor(
    private readonly consequencesService: RedCardConsequencesService,
    private readonly forfeitService: RedCardForfeitService,
    private readonly registrationService: RedCardRegistrationService,
  ) {}

  async applyRedCardForfeits(tournamentId: number) {
    return this.consequencesService.applyRedCardForfeits(tournamentId);
  }

  async applyRedCardConsequences(tournamentId: number) {
    return this.consequencesService.applyRedCardConsequences(tournamentId);
  }

  async assertNoActiveRedCompetitorsInUnfoughtBlock(blockId: number) {
    return this.registrationService.assertNoActiveRedCompetitorsInUnfoughtBlock(
      blockId,
    );
  }

  async resetForfeitsForCard(cardId: number) {
    return this.forfeitService.resetForfeitsForCard(cardId);
  }

  async resetEditableForfeitsForCard(cardId: number) {
    return this.forfeitService.resetEditableForfeitsForCard(cardId);
  }

  async assertFightLifecycleEditable(fightId: number) {
    return this.registrationService.assertFightLifecycleEditable(fightId);
  }

  async getActiveRedCompetitorIdsTx(tx: PrismaTx, blockId: number) {
    return this.registrationService.getActiveRedCompetitorIdsTx(tx, blockId);
  }

  excludeActiveRedCompetitors<T extends { competitorId: number }>(
    ranked: T[],
    activeRedCompetitorIds: Set<number>,
  ) {
    return this.registrationService.excludeActiveRedCompetitors(
      ranked,
      activeRedCompetitorIds,
    );
  }

  async resetForfeitsForDeletedFightsTx(
    tx: PrismaTx,
    blockId: number,
    round?: number,
  ) {
    return this.forfeitService.resetForfeitsForDeletedFightsTx(
      tx,
      blockId,
      round,
    );
  }

  async resolveDoubleRedForfeitTx(
    tx: PrismaTx,
    fightId: number,
    winnerCompetitorId: number,
  ) {
    return this.forfeitService.resolveDoubleRedForfeitTx(
      tx,
      fightId,
      winnerCompetitorId,
    );
  }

  async removeActiveRedCompetitorsFromRegistrationTx(
    tx: PrismaTx,
    block: {
      tournament_id: number;
      nomination_id: number;
    },
  ) {
    return this.registrationService.removeActiveRedCompetitorsFromRegistrationTx(
      tx,
      block,
    );
  }
}
