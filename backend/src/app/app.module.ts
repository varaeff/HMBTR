import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { AppController } from './app.controller';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from '../common/configs/winston.config';
import { UpdateLoggerInterceptor } from '../common/interceptors/update-logger.interceptor';
import { AppService } from './app.service';
import { FightersModule } from '../fighters/fighters.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { CountriesModule } from '../countries/countries.module';
import { CitiesModule } from '../cities/cities.module';
import { ClubsModule } from '../clubs/clubs.module';
import { NominationsModule } from '../nominations/nominations.module';
import { CompetitorsModule } from '../competitors/competitors.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuardGlobal } from '../auth/guards/jwt-auth-global.guard';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    AuthModule,
    UsersModule,
    FightersModule,
    TournamentsModule,
    CountriesModule,
    CitiesModule,
    ClubsModule,
    NominationsModule,
    CompetitorsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EmailService,
    { provide: APP_GUARD, useClass: JwtAuthGuardGlobal },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    {
      provide: APP_INTERCEPTOR,
      useClass: UpdateLoggerInterceptor,
    },
  ],
})
export class AppModule {}
