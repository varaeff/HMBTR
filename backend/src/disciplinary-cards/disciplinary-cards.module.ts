import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { DisciplinaryCardsController } from './disciplinary-cards.controller';
import { DisciplinaryCardsService } from './disciplinary-cards.service';
import { ActiveRedCardService } from './active-reds/active-red-card.service';
import { AutomaticRedCardService } from './automatic-reds/automatic-red-card.service';
import { DisciplinaryCardReader } from './cards/disciplinary-card-reader';
import { DisciplinaryCardStorage } from './cards/disciplinary-card-storage';
import { DisciplinaryCardConsequencesService } from './consequences/disciplinary-card-consequences.service';
import { DisciplinaryCardExpirationService } from './expiration/disciplinary-card-expiration.service';
import { DisciplinaryCardPolicyService } from './policy/disciplinary-card-policy.service';
import { RedYellowSourceService } from './red-yellow-sources/red-yellow-source.service';

@Module({
  imports: [PrismaModule, CompetitionModule, SettingsModule],
  controllers: [DisciplinaryCardsController],
  providers: [
    ActiveRedCardService,
    AutomaticRedCardService,
    DisciplinaryCardConsequencesService,
    DisciplinaryCardExpirationService,
    DisciplinaryCardPolicyService,
    DisciplinaryCardReader,
    DisciplinaryCardStorage,
    DisciplinaryCardsService,
    RedYellowSourceService,
  ],
  exports: [DisciplinaryCardsService],
})
export class DisciplinaryCardsModule {}
