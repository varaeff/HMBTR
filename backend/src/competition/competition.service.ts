import { Injectable } from '@nestjs/common';
import { CompetitionBlockService } from './blocks/competition-block.service';
import type {
  PendingTieResult,
  PendingTieScope,
} from './competition-internal.types';
import { CompetitionRedCardService } from './competition-red-card.service';
import { CreateCompetitionBlockDto } from './dto/create-competition-block.dto';
import { CancelWithdrawalDto } from './dto/cancel-withdrawal.dto';
import { CompetitionLifecycleDto } from './dto/competition-lifecycle.dto';
import { CreateFightWithdrawalDto } from './dto/create-fight-withdrawal.dto';
import { CreateNoShowWithdrawalDto } from './dto/create-no-show-withdrawal.dto';
import { FinishCompetitionDto } from './dto/finish-competition.dto';
import { GenerateGroupFightsDto } from './dto/generate-group-fights.dto';
import { GenerateOlympicFightsDto } from './dto/generate-olympic-fights.dto';
import { ResolveTiesDto } from './dto/resolve-ties.dto';
import { SaveCompetitionResultsDto } from './dto/save-competition-results.dto';
import { SwapBracketSlotsDto } from './dto/swap-bracket-slots.dto';
import { UpdateCompetitionScoreDto } from './dto/update-competition-score.dto';
import { CompetitionFightService } from './fights/competition-fight.service';
import { CompetitionFinishService } from './finish/competition-finish.service';
import { CompetitionLifecycleService } from './lifecycle/competition-lifecycle.service';
import { CompetitionOlympicProgressService } from './olympic/competition-olympic-progress.service';
import { CompetitionRankingsService } from './rankings/competition-rankings.service';
import { CompetitionResultService } from './results/competition-result.service';
import { CompetitionStateReader } from './state/competition-state.reader';
import { CompetitionWithdrawalService } from './withdrawals/competition-withdrawal.service';

export type { PendingTieResult, PendingTieScope };

@Injectable()
export class CompetitionService {
  constructor(
    private readonly stateReader: CompetitionStateReader,
    private readonly blockService: CompetitionBlockService,
    private readonly fightService: CompetitionFightService,
    private readonly resultService: CompetitionResultService,
    private readonly lifecycleService: CompetitionLifecycleService,
    private readonly rankingsService: CompetitionRankingsService,
    private readonly finishService: CompetitionFinishService,
    private readonly redCardService: CompetitionRedCardService,
    private readonly olympicProgressService: CompetitionOlympicProgressService,
    private readonly withdrawalService: CompetitionWithdrawalService,
  ) {}

  getState(tournamentId: number, nominationId: number) {
    return this.stateReader.getState(tournamentId, nominationId);
  }

  createGroupBlock(dto: CreateCompetitionBlockDto) {
    return this.blockService.createGroupBlock(dto);
  }

  generateGroupFights(dto: GenerateGroupFightsDto) {
    return this.fightService.generateGroupFights(dto);
  }

  createOlympicBlock(dto: CreateCompetitionBlockDto) {
    return this.blockService.createOlympicBlock(dto);
  }

  generateOlympicFights(dto: GenerateOlympicFightsDto) {
    return this.fightService.generateOlympicFights(dto);
  }

  updateScore(dto: UpdateCompetitionScoreDto) {
    return this.resultService.updateScore(dto);
  }

  saveResults(dto: SaveCompetitionResultsDto) {
    return this.resultService.saveResults(dto);
  }

  swapBracketSlots(dto: SwapBracketSlotsDto) {
    return this.fightService.swapBracketSlots(dto);
  }

  applyRedCardForfeits(tournamentId: number) {
    return this.redCardService.applyRedCardForfeits(tournamentId);
  }

  applyRedCardConsequences(tournamentId: number) {
    return this.redCardService.applyRedCardConsequences(tournamentId);
  }

  resetForfeitsForCard(cardId: number) {
    return this.redCardService.resetForfeitsForCard(cardId);
  }

  resetEditableForfeitsForCard(cardId: number) {
    return this.redCardService.resetEditableForfeitsForCard(cardId);
  }

  assertFightLifecycleEditable(fightId: number) {
    return this.redCardService.assertFightLifecycleEditable(fightId);
  }

  resolveTies(dto: ResolveTiesDto) {
    return this.rankingsService
      .resolveTies(dto)
      .then(() =>
        this.stateReader.getState(dto.tournament_id, dto.nomination_id),
      );
  }

  fixResults(dto: CompetitionLifecycleDto) {
    return this.resultService.fixResults(dto);
  }

  cancelResultsFixation(dto: CompetitionLifecycleDto) {
    return this.lifecycleService.cancelResultsFixation(dto);
  }

  cancelFightsFixation(dto: CompetitionLifecycleDto) {
    return this.lifecycleService.cancelFightsFixation(dto);
  }

  rollback(dto: CompetitionLifecycleDto) {
    return this.lifecycleService.rollback(dto);
  }

  finish(dto: FinishCompetitionDto) {
    return this.finishService.finish(dto);
  }

  progressOlympicBlock(blockId: number) {
    return this.olympicProgressService.progressOlympicBlock(blockId);
  }

  async createNoShowWithdrawal(dto: CreateNoShowWithdrawalDto) {
    await this.withdrawalService.createNoShow(dto);
    return this.stateReader.getState(dto.tournament_id, dto.nomination_id);
  }

  async createFightWithdrawal(dto: CreateFightWithdrawalDto) {
    await this.withdrawalService.createFromFight(dto);
    const fight = await this.stateReader.getFightContext(dto.fight_id);
    return this.stateReader.getState(fight.tournament_id, fight.nomination_id);
  }

  async cancelWithdrawal(dto: CancelWithdrawalDto) {
    const context = await this.stateReader.getWithdrawalContext(
      dto.withdrawal_id,
    );
    await this.withdrawalService.cancel(dto);
    return this.stateReader.getState(context.tournament_id, context.nomination_id);
  }
}
