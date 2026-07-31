import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  STATUS_FAILED,
  STATUS_PENDING,
  STATUS_PROCESSING,
} from '../ratings.constants';
import { calculateNominationRatings } from '../ratings.logic';
import type { PrismaTx } from '../ratings-internal.types';
import { RatingCalculationReader } from './rating-calculation-reader.service';
import { RatingPersistenceService } from './rating-persistence.service';

@Injectable()
export class RatingCalculationService {
  private readonly logger = new Logger(RatingCalculationService.name);

  constructor(
    private prisma: PrismaService,
    private reader: RatingCalculationReader,
    private persistence: RatingPersistenceService,
  ) {}

  async calculateForTournamentNomination(tournamentNominationId: number) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.tournament_nominations.updateMany({
          where: {
            id: tournamentNominationId,
            is_finished: true,
            rating_status: { in: [STATUS_PENDING, STATUS_FAILED] },
          },
          data: {
            rating_status: STATUS_PROCESSING,
            rating_error: null,
          },
        });

        if (claimed.count === 0) return;

        await this.calculateClaimedTournamentNominationTx(
          tx,
          tournamentNominationId,
        );
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown rating error';

      this.logger.error(
        `Rating calculation failed for tournament nomination ${tournamentNominationId}: ${message}`,
      );

      await this.persistence.markFailed(tournamentNominationId, message);
    }
  }

  private async calculateClaimedTournamentNominationTx(
    tx: PrismaTx,
    tournamentNominationId: number,
  ) {
    const tournamentNomination = await this.reader.getTournamentNominationTx(
      tx,
      tournamentNominationId,
    );
    const participants = await this.reader.getParticipantsTx(
      tx,
      tournamentNomination.tournament_id,
      tournamentNomination.nomination_id,
    );
    const existingRatings = await this.reader.getExistingRatingsTx(
      tx,
      tournamentNomination.nomination_id,
      participants,
    );
    const fights = await this.reader.getRatingFightsTx(
      tx,
      tournamentNomination.tournament_id,
      tournamentNomination.nomination_id,
    );
    const calculation = calculateNominationRatings(
      participants,
      existingRatings,
      fights,
    );

    await this.persistence.saveCalculationTx(
      tx,
      tournamentNomination,
      calculation,
    );
    await this.persistence.markCalculatedTx(tx, tournamentNomination);
  }
}
