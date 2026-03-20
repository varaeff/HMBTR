import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './dto/jwt-payload.dto';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
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
