import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DisciplinaryCardsController } from './disciplinary-cards.controller';
import { DisciplinaryCardsService } from './disciplinary-cards.service';

@Module({
  imports: [PrismaModule, CompetitionModule],
  controllers: [DisciplinaryCardsController],
  providers: [DisciplinaryCardsService],
  exports: [DisciplinaryCardsService],
})
export class DisciplinaryCardsModule {}
