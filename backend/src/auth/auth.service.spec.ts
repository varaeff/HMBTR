import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Logger } from 'winston';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../common/services/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const createService = () => {
    const prisma = {
      users: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const jwt = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };
    const email = {
      sendNewUserNotification: jest.fn(),
    };
    const logger = {
      info: jest.fn<(message: string) => void>(),
      warn: jest.fn<(message: string) => void>(),
      error: jest.fn<(message: string, meta?: unknown) => void>(),
    };

    return {
      email,
      jwt,
      logger,
      prisma,
      service: new AuthService(
        logger as unknown as Logger,
        prisma as unknown as PrismaService,
        jwt as unknown as JwtService,
        email as unknown as EmailService,
      ),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the same auth response shape after registration', async () => {
    const { email, jwt, prisma, service } = createService();

    prisma.users.findUnique.mockResolvedValue(null);
    prisma.users.create.mockResolvedValue({
      id: 7,
      username: 'alex',
      name: 'Alex',
      surname: 'Smith',
      patronymic: null,
      email: 'alex@example.com',
      is_admin: false,
      is_organizer: false,
      is_secretary: false,
    });
    prisma.users.update.mockResolvedValue({});
    prisma.users.findMany.mockResolvedValue([
      { email: 'admin@example.com', username: 'admin' },
    ]);
    jwt.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    email.sendNewUserNotification.mockResolvedValue(undefined);

    await expect(
      service.register({
        username: 'alex',
        password: 'secret-password',
        name: 'Alex',
        surname: 'Smith',
        email: 'alex@example.com',
      }),
    ).resolves.toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: {
        id: 7,
        username: 'alex',
        name: 'Alex',
        surname: 'Smith',
        email: 'alex@example.com',
        is_admin: false,
        is_organizer: false,
        is_secretary: false,
      },
    });

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { refreshToken: 'refresh-token' },
    });
    expect(email.sendNewUserNotification).toHaveBeenCalledWith(
      ['admin@example.com'],
      'Alex Smith',
      'alex@example.com',
    );
  });

  it('keeps registration successful when admin email notification fails', async () => {
    const { email, jwt, logger, prisma, service } = createService();

    prisma.users.findUnique.mockResolvedValue(null);
    prisma.users.create.mockResolvedValue({
      id: 7,
      username: 'alex',
      name: 'Alex',
      surname: 'Smith',
      patronymic: null,
      email: null,
      is_admin: false,
      is_organizer: false,
      is_secretary: false,
    });
    prisma.users.update.mockResolvedValue({});
    prisma.users.findMany.mockResolvedValue([
      { email: 'admin@example.com', username: 'admin' },
    ]);
    jwt.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    const notificationError = new Error('smtp failed');
    email.sendNewUserNotification.mockRejectedValue(notificationError);

    await expect(
      service.register({
        username: 'alex',
        password: 'secret-password',
        name: 'Alex',
        surname: 'Smith',
      }),
    ).resolves.toMatchObject({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    expect(logger.error).toHaveBeenCalledWith(
      '[Email] Failed to send admin notification email:',
      notificationError,
    );
  });

  it('reuses auth response creation for login', async () => {
    const { jwt, prisma, service } = createService();
    const hashedPassword = await bcrypt.hash('secret-password', 4);

    prisma.users.findUnique.mockResolvedValue({
      id: 7,
      username: 'alex',
      password: hashedPassword,
      name: 'Alex',
      surname: 'Smith',
      email: null,
      is_admin: false,
      is_organizer: true,
      is_secretary: false,
    });
    prisma.users.update.mockResolvedValue({});
    jwt.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    await expect(
      service.login({ username: 'alex', password: 'secret-password' }),
    ).resolves.toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: {
        id: 7,
        username: 'alex',
        name: 'Alex',
        surname: 'Smith',
        email: undefined,
        is_admin: false,
        is_organizer: true,
        is_secretary: false,
      },
    });
  });

  it('rejects duplicate emails during registration', async () => {
    const { prisma, service } = createService();

    prisma.users.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9 });

    await expect(
      service.register({
        username: 'alex',
        password: 'secret-password',
        name: 'Alex',
        surname: 'Smith',
        email: 'alex@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.users.create).not.toHaveBeenCalled();
  });
});
