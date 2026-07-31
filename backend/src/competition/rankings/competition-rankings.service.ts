import { Injectable } from '@nestjs/common';
import type { PendingTieResult, PrismaTx } from '../competition-internal.types';
import { ResolveTiesDto } from '../dto/resolve-ties.dto';
import { AdvancementService } from './advancement.service';
import { GroupRankingReader } from './group-ranking.reader';
import { PendingTieService } from './pending-tie.service';
import { TieResolutionService } from './tie-resolution.service';

@Injectable()
export class CompetitionRankingsService {
  constructor(
    private readonly tieResolutionService: TieResolutionService,
    private readonly advancementService: AdvancementService,
    private readonly groupRankingReader: GroupRankingReader,
    private readonly pendingTieService: PendingTieService,
  ) {}

  resolveTies(dto: ResolveTiesDto) {
    return this.tieResolutionService.resolveTies(dto);
  }

  getAdvancingCompetitorsTx(
    tx: PrismaTx,
    blockId: number,
    includeThirdPlaces = false,
  ) {
    return this.advancementService.getAdvancingCompetitorsTx(
      tx,
      blockId,
      includeThirdPlaces,
    );
  }

  getGroupRankingsTx(tx: PrismaTx, blockId: number, groupId: number) {
    return this.groupRankingReader.getGroupRankingsTx(tx, blockId, groupId);
  }

  getPendingTie(
    blockId: number,
    places: number,
  ): Promise<PendingTieResult | null> {
    return this.pendingTieService.getPendingTie(blockId, places);
  }

  getPendingTieTx(
    tx: PrismaTx,
    blockId: number,
    places: number,
  ): Promise<PendingTieResult | null> {
    return this.pendingTieService.getPendingTieTx(tx, blockId, places);
  }

  getPendingOlympicThirdPlaceTieTx(
    tx: PrismaTx,
    blockId: number,
  ): Promise<PendingTieResult | null> {
    return this.pendingTieService.getPendingOlympicThirdPlaceTieTx(tx, blockId);
  }
}
