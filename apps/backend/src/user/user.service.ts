import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto, UpdateUserDto } from './dto/user.dtos';
import bcrypt from 'bcrypt';
import { users } from 'generated/prisma/client';
import { LoginGoogleDto } from 'src/auth/dto/auth.dtos';
import { SafeUserType, toSafeUser } from 'src/auth/interface/auth.interface';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUserbyId(id: number): Promise<users> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Id not found');
    }
    return user;
  }

  async getUserbyEmail(email: string): Promise<users> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email not found');
    }
    return user;
  }

  async createUserByGoogle(dto: LoginGoogleDto): Promise<SafeUserType> {
    // 1. create user with googleID
    const user = await this.userRepository.createUser({
      name: dto.name,
      email: dto.email,
      googleId: dto.googleId,
      password_hash: null,
      is_active: true,
      language: 'en',
    });
    return toSafeUser(user);
  }

  async createUserLocal(dto: CreateUserDto): Promise<SafeUserType> {
    //1. email validation, is it exist alread?
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exist');
    }

    // 2.hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(dto.password, saltRounds);

    // 3. create user with password
    const user = await this.userRepository.createUser({
      name: dto.name,
      email: dto.email,
      googleId: null,
      password_hash: password_hash,
      is_active: true,
      language: 'en',
    });
    // 4. Response DTO
    return toSafeUser(user);
  }
  async updateUserProfile(id: number, dto: UpdateUserDto): Promise<SafeUserType> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updateUser = await this.userRepository.updateUser(id, dto);
    return toSafeUser(updateUser);
  }
}
