import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RatingsModule } from '../ratings/ratings.module';
import { CompetitionBlockService } from './blocks/competition-block.service';
import { CompetitionController } from './competition.controller';
import { CompetitionFightService } from './fights/competition-fight.service';
import { CompetitionFinishService } from './finish/competition-finish.service';
import { CompetitionLifecycleService } from './lifecycle/competition-lifecycle.service';
import { CompetitionOlympicService } from './olympic/competition-olympic.service';
import { CompetitionOlympicProgressService } from './olympic/competition-olympic-progress.service';
import { AdvancementService } from './rankings/advancement.service';
import { CompetitionRankingsService } from './rankings/competition-rankings.service';
import { GroupRankingReader } from './rankings/group-ranking.reader';
import { PendingTieService } from './rankings/pending-tie.service';
import { TieBreakerService } from './rankings/tie-breaker.service';
import { TieResolutionService } from './rankings/tie-resolution.service';
import { CompetitionRedCardService } from './competition-red-card.service';
import { CompetitionResultService } from './results/competition-result.service';
import { FightResultEvaluationService } from './results/fight-result-evaluation.service';
import { FightResultPersistenceService } from './results/fight-result-persistence.service';
import { ResultFixationService } from './results/result-fixation.service';
import { ResultSubmissionValidator } from './results/result-submission.validator';
import { CompetitionScoringService } from './scoring/competition-scoring.service';
import { CompetitionService } from './competition.service';
import { CompetitionStateReader } from './state/competition-state.reader';
import { RedCardConsequencesService } from './red-cards/red-card-consequences.service';
import { RedCardForfeitService } from './red-cards/red-card-forfeit.service';
import { RedCardRegistrationService } from './red-cards/red-card-registration.service';
import { RedCardStorageService } from './red-cards/red-card-storage.service';

@Module({
  imports: [PrismaModule, RatingsModule],
  controllers: [CompetitionController],
  providers: [
    CompetitionService,
    CompetitionBlockService,
    CompetitionFightService,
    CompetitionFinishService,
    CompetitionLifecycleService,
    CompetitionOlympicService,
    CompetitionOlympicProgressService,
    AdvancementService,
    CompetitionRankingsService,
    CompetitionRedCardService,
    CompetitionResultService,
    CompetitionScoringService,
    CompetitionStateReader,
    FightResultEvaluationService,
    FightResultPersistenceService,
    GroupRankingReader,
    PendingTieService,
    TieBreakerService,
    RedCardConsequencesService,
    RedCardForfeitService,
    RedCardRegistrationService,
    RedCardStorageService,
    ResultFixationService,
    ResultSubmissionValidator,
    TieResolutionService,
  ],
  exports: [CompetitionService],
})
export class CompetitionModule {}
