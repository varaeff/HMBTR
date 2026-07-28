import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './dto/jwt-payload.dto';
import type { StringValue } from 'ms';

type AuthUser = {
  id: number;
  username: string;
  name: string;
  surname: string;
  patronymic?: string | null;
  email?: string | null;
  is_admin: boolean;
  is_organizer: boolean;
  is_secretary: boolean;
};

type AuthTokenPair = {
  access_token: string;
  refresh_token: string;
};

type AdminNotificationRecipient = {
  email: string | null;
  username: string;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, password, name, surname, patronymic, email } =
      registerDto;

    const existingUser = await this.prismaService.users.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    if (email) {
      const existingEmail = await this.prismaService.users.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prismaService.users.create({
      data: {
        username,
        password: hashedPassword,
        name,
        surname,
        patronymic,
        email,
      },
    });
    const response = await this.issueAuthResponse(user);

    // Registration must succeed even when notification delivery fails.
    try {
      await this.notifyAdminsAboutRegistration(user);
    } catch (error) {
      this.logger.error(
        '[Email] Failed to send admin notification email:',
        error,
      );
    }

    return response;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    const user = await this.prismaService.users.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueAuthResponse(user);
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prismaService.users.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    });

    const userId = payload.sub;

    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueAuthResponse(user);
  }

  private async issueAuthResponse(user: AuthUser): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email ?? undefined,
    );

    await this.prismaService.users.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refresh_token },
    });

    return this.buildAuthResponse(user, tokens);
  }

  private buildAuthResponse(
    user: AuthUser,
    tokens: AuthTokenPair,
  ): AuthResponseDto {
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        email: user.email ?? undefined,
        is_admin: user.is_admin,
        is_organizer: user.is_organizer,
        is_secretary: user.is_secretary,
      },
    };
  }

  private async notifyAdminsAboutRegistration(user: AuthUser) {
    const adminUsers: AdminNotificationRecipient[] =
      await this.prismaService.users.findMany({
        where: { is_admin: true },
        select: { email: true, username: true },
      });
    const adminEmails = this.getValidAdminEmails(adminUsers);

    if (!adminEmails.length) {
      this.logger.warn(
        '[Email] New user notification skipped: no admin emails available',
      );
      return;
    }

    await this.emailService.sendNewUserNotification(
      adminEmails,
      this.formatFullName(user),
      user.email || 'No email provided',
    );
  }

  private getValidAdminEmails(adminUsers: AdminNotificationRecipient[]) {
    return adminUsers
      .filter((admin): admin is { email: string; username: string } => {
        const hasEmail = Boolean(admin.email);

        if (!hasEmail) {
          this.logger.warn(
            `[Email] Admin user "${admin.username}" has no email address - skipping`,
          );
        }

        return hasEmail;
      })
      .map((admin) => admin.email);
  }

  private formatFullName(user: AuthUser) {
    return [user.name, user.surname, user.patronymic].filter(Boolean).join(' ');
  }

  private async generateTokens(
    userId: number,
    username: string,
    email?: string,
  ): Promise<AuthTokenPair> {
    const payload: JwtPayload = {
      sub: userId,
      username,
      email,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'jwt-secret',
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as StringValue,
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
    });

    return { access_token, refresh_token };
  }
}
