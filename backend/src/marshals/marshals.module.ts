import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MarshalsController } from './marshals.controller';
import { MarshalsService } from './marshals.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarshalsController],
  providers: [MarshalsService],
})
export class MarshalsModule {}
