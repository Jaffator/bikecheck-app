import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import type { users } from 'generated/prisma/client';
import { UpdateUserDto } from './dto/user.dtos';
import { CreateUserData } from './interfaces/user.interface';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: CreateUserData): Promise<users> {
    return this.prisma.users.create({ data });
  }

  async updateUser(
    id: number,
    dataWithoutUndefined: UpdateUserDto,
  ): Promise<users> {
    // remove undefined value from object data
    const dataFilteredUndefined = Object.fromEntries(
      Object.entries(dataWithoutUndefined).filter(
        ([, value]) => value !== undefined,
      ),
    );

    return this.prisma.users.update({
      where: { id },
      data: {
        ...dataFilteredUndefined,
        updated_at: new Date(),
      },
    });
  }

  async findById(id: number): Promise<users | null> {
    return this.prisma.users.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<users | null> {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  async deleteUser(id: number): Promise<users | null> {
    return this.prisma.users.delete({
      where: { id },
    });
  }
}
