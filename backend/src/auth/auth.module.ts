import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'jwt-secret',
      signOptions: { expiresIn: '15m' },
    }),
    PrismaModule,
  ],
  providers: [AuthService, JwtStrategy, EmailService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
