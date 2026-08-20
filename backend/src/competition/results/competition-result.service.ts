import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  evaluateSubmittedFightScore,
  fightScoreUpdateData,
  scoringRules,
  submittedRoundScores,
} from '../../fights/fight-score-data';
import { PrismaService } from '../../prisma/prisma.service';
import { BLOCK_GROUP, STATUS_ACTIVE } from '../competition.constants';
import { isFightResultsFixed, isForfeitFight } from '../competition.helpers';
import { CompetitionRedCardService } from '../competition-red-card.service';
import { CompetitionLifecycleDto } from '../dto/competition-lifecycle.dto';
import { SaveCompetitionResultsDto } from '../dto/save-competition-results.dto';
import { UpdateCompetitionScoreDto } from '../dto/update-competition-score.dto';
import { CompetitionScoringService } from '../scoring/competition-scoring.service';
import { CompetitionStateReader } from '../state/competition-state.reader';
import { CompetitionWithdrawalService } from '../withdrawals/competition-withdrawal.service';
import { FightResultEvaluationService } from './fight-result-evaluation.service';
import { FightResultPersistenceService } from './fight-result-persistence.service';
import { ResultFixationService } from './result-fixation.service';
import { ResultSubmissionValidator } from './result-submission.validator';

@Injectable()
export class CompetitionResultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateReader: CompetitionStateReader,
    private readonly scoringService: CompetitionScoringService,
    private readonly redCardService: CompetitionRedCardService,
    private readonly withdrawalService: CompetitionWithdrawalService,
    private readonly validator: ResultSubmissionValidator,
    private readonly evaluator: FightResultEvaluationService,
    private readonly persistence: FightResultPersistenceService,
    private readonly fixation: ResultFixationService,
  ) {}

  async updateScore(dto: UpdateCompetitionScoreDto) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: dto.fight_id },
      include: {
        nomination: true,
        block: {
          include: { tournament_nomination: true, round_states: true },
        },
      },
    });
    if (!fight) throw new NotFoundException('Fight not found');
    if (!fight.block) {
      throw new BadRequestException('Fight is not part of a competition block');
    }
    if (
      fight.block.status !== STATUS_ACTIVE ||
      fight.block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException('Block is locked');
    }
    if (isFightResultsFixed({ ...fight, block: fight.block })) {
      throw new BadRequestException('Fight results are fixed');
    }
    if (isForfeitFight(fight)) {
      throw new BadRequestException('Fight is a technical forfeit');
    }

    const evaluation = evaluateSubmittedFightScore(
      scoringRules(fight),
      dto,
      false,
    );
    const winnerId =
      evaluation.winnerSide === 1
        ? fight.competitor1_id
        : evaluation.winnerSide === 2
          ? fight.competitor2_id
          : null;

    await this.prisma.fights.update({
      where: { id: dto.fight_id },
      data: {
        ...fightScoreUpdateData(evaluation),
        winner_id: winnerId,
        is_finished: evaluation.isValidResult,
      },
    });
    await this.scoringService.replaceFightRoundScores(
      dto.fight_id,
      submittedRoundScores(dto, {
        rounds: fight.rounds,
        main_round_time: fight.main_round_time ?? 0,
        additional_round_time: fight.additional_round_time ?? 0,
      }),
    );

    return this.stateReader.getState(fight.tournament_id, fight.nomination_id);
  }

  async saveResults(dto: SaveCompetitionResultsDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: {
        fights: true,
        tournament_nomination: { include: { nomination: true } },
        round_states: true,
      },
    });
    if (!block) throw new NotFoundException('Block not found');
    this.validator.assertSaveAllowed(block, dto.fights);
    const bundle = this.evaluator.evaluateSubmissions(block, dto.fights);

    await this.prisma.$transaction(async (tx) => {
      await this.persistence.persistEvaluatedResultsTx(tx, bundle);
    });

    return this.stateReader.getState(block.tournament_id, block.nomination_id);
  }

  async fixResults(dto: CompetitionLifecycleDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: {
        fights: true,
        groups: true,
        tournament_nomination: { include: { nomination: true } },
        round_states: true,
      },
    });
    if (!block) throw new NotFoundException('Block not found');

    const results = dto.fights ?? [];
    this.validator.assertFixBaseAllowed(block, results);

    if (block.type === BLOCK_GROUP) {
      this.validator.assertGroupFixAllowed(block, results);
      const bundle = this.evaluator.evaluateSubmissions(block, results);
      const places = block.groups.length === 1 ? 3 : 2;
      await this.prisma.$transaction(async (tx) => {
        await this.fixation.assertGroupStillEditableTx(tx, block);
        await this.persistence.persistEvaluatedResultsTx(tx, bundle);
        await this.fixation.fixGroupResultsTx(tx, block, places);
      });
      return this.stateReader.getState(
        block.tournament_id,
        block.nomination_id,
      );
    }

    const plan = this.validator.createOlympicRoundPlan(
      block,
      dto.round,
      results,
      await this.fixation.getOlympicMainRounds(block.id),
    );
    const bundle = this.evaluator.evaluateSubmissions(
      block,
      results,
      plan.roundFights,
    );
    await this.prisma.$transaction(async (tx) => {
      await this.persistence.persistEvaluatedResultsTx(tx, bundle);
      await this.fixation.fixOlympicRoundTx(tx, block, plan);
    });
    await this.redCardService.applyRedCardForfeits(block.tournament_id);
    await this.withdrawalService.applyWithdrawalForfeits(block.tournament_id);
    return this.stateReader.getState(block.tournament_id, block.nomination_id);
  }
}
