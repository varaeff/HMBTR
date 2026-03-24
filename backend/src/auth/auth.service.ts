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

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, password, name, surname, patronymic, email } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.prismaService.users.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await this.prismaService.users.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
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

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email ?? undefined,
    );

    // Update refresh token in database
    await this.prismaService.users.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refresh_token },
    });

    // Send email to all admins about new user registration
    try {
      this.logger.info(
        '[Email] Step 1: Starting email notification process for new user registration',
      );

      const adminUsers = await this.prismaService.users.findMany({
        where: { is_admin: true },
        select: { email: true, username: true },
      });

      this.logger.info(
        `[Email] Step 2: Found ${adminUsers.length} admin user(s) in database: ${adminUsers.map((u) => u.username).join(', ')}`,
      );

      if (adminUsers.length === 0) {
        this.logger.warn(
          '[Email] No admin users found in database - email notification skipped',
        );
      }

      const validAdminEmails = adminUsers
        .filter((admin) => {
          const hasEmail = !!admin.email;
          if (!hasEmail) {
            this.logger.warn(
              `[Email] Admin user "${admin.username}" has no email address - skipping`,
            );
          }
          return hasEmail;
        })
        .map((admin) => admin.email!);

      this.logger.info(
        `[Email] Step 3: Found ${validAdminEmails.length} admin(s) with valid email(s): ${validAdminEmails.join(', ')}`,
      );

      if (validAdminEmails.length > 0) {
        const fullName = `${name} ${surname}${patronymic ? ' ' + patronymic : ''}`;
        this.logger.info(
          `[Email] Step 4: Sending notification email to ${validAdminEmails.length} admin(s) about new user: ${fullName}`,
        );

        try {
          await this.emailService.sendNewUserNotification(
            validAdminEmails,
            fullName,
            email || 'No email provided',
          );
          this.logger.info(
            '[Email] Step 5: Email notification sent successfully',
          );
        } catch (emailError) {
          this.logger.error(
            '[Email] Step 5 FAILED: Email service error:',
            emailError,
          );
          throw emailError;
        }
      } else {
        this.logger.warn(
          '[Email] No valid admin emails found - email notification skipped',
        );
      }
    } catch (error) {
      this.logger.error(
        '[Email] CRITICAL: Failed to send admin notification email:',
        error,
      );
      // Don't throw error - registration should succeed even if email fails
    }

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
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    // Find user by username
    const user = await this.prismaService.users.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email ?? undefined,
    );

    // Update refresh token in database
    await this.prismaService.users.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refresh_token },
    });

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
      },
    };
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

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email ?? undefined,
    );

    await this.prismaService.users.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refresh_token },
    });

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
      },
    };
  }

  private async generateTokens(
    userId: number,
    username: string,
    email?: string,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      username,
      email,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'jwt-secret',
      expiresIn: '15m',
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      expiresIn: '7d',
    });

    return { access_token, refresh_token };
  }
}
