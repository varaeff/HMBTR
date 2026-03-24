import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.users.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        surname: true,
        patronymic: true,
        email: true,
        is_admin: true,
        is_organizer: true,
        createdAt: true,
      },
    });
  }

  async findAllAdmins() {
    return this.prisma.users.findMany({
      where: {
        is_admin: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        surname: true,
        patronymic: true,
        email: true,
        is_admin: true,
        is_organizer: true,
        createdAt: true,
      },
    });
  }

  async updateById(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: UpdateUserDto = {};

    if (updateUserDto.name) {
      data.name = updateUserDto.name;
    }

    if (updateUserDto.surname) {
      data.surname = updateUserDto.surname;
    }

    if (updateUserDto.patronymic) {
      data.patronymic = updateUserDto.patronymic;
    }

    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.is_admin !== undefined) {
      data.is_admin = updateUserDto.is_admin;
    }

    if (updateUserDto.is_organizer !== undefined) {
      data.is_organizer = updateUserDto.is_organizer;
    }

    return this.prisma.users.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        surname: true,
        patronymic: true,
        email: true,
        is_admin: true,
        is_organizer: true,
        createdAt: true,
      },
    });
  }

  async getAdminEmails(): Promise<string[]> {
    const admins = await this.prisma.users.findMany({
      where: {
        is_admin: true,
      },
      select: {
        email: true,
      },
    });

    return admins.filter((admin) => admin.email).map((admin) => admin.email!);
  }
}
