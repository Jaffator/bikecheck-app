import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dtos';
import bcrypt from 'bcrypt';
import { users as UserFull } from '@prisma/client';
import { LoginGoogleDto } from '../auth/dto/auth.dtos';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserbyGoogleId(googleid: string): Promise<UserFull | null> {
    const user = await this.prisma.users.findUnique({ where: { googleId: googleid } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserbyId(id: number): Promise<UserFull | null> {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserbyEmail(email: string): Promise<UserFull | null> {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUserByGoogle(dto: LoginGoogleDto): Promise<UserFull> {
    return this.prisma.users.create({
      data: {
        name: dto.name,
        email: dto.email,
        googleId: dto.googleId,
        avatar_url: dto.avatar_url,
        password_hash: null,
        is_active: true,
        language: 'en',
      },
    });
  }

  async createUserLocal(dto: CreateUserDto): Promise<UserFull> {
    const existingUser = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exist');
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(dto.password!, saltRounds);

    return this.prisma.users.create({
      data: {
        name: dto.name,
        avatar_url: null,
        email: dto.email,
        googleId: null,
        password_hash,
        is_active: true,
        language: 'en',
      },
    });
  }

  async updateUserProfile(id: number, dto: UpdateUserDto): Promise<UserFull> {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const dataFilteredUndefined = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    return this.prisma.users.update({
      where: { id },
      data: { ...dataFilteredUndefined, updated_at: new Date() },
    });
  }
}
