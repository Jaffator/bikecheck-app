import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto, UpdateUserDto } from './dto/user.dtos';
import bcrypt from 'bcrypt';
import { users as UserFull } from '@prisma/client';
import { LoginGoogleDto } from 'src/auth/dto/auth.dtos';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUserbyGoogleId(googleid: string): Promise<UserFull | null> {
    const user = await this.userRepository.findByGoogleId(googleid);
    return user;
  }

  async getUserbyId(id: number): Promise<UserFull | null> {
    const user = await this.userRepository.findById(id);
    return user;
  }

  async getUserbyEmail(email: string): Promise<UserFull | null> {
    const user = await this.userRepository.findByEmail(email);
    return user;
  }

  async createUserByGoogle(dto: LoginGoogleDto): Promise<UserFull> {
    // 1. create user with googleID
    const user = await this.userRepository.createUser({
      name: dto.name,
      email: dto.email,
      googleId: dto.googleId,
      avatar_url: dto.avatar_url,
      password_hash: null,
      is_active: true,
      language: 'en',
    });
    return user;
  }

  async createUserLocal(dto: CreateUserDto): Promise<UserFull> {
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
      avatar_url: null,
      email: dto.email,
      googleId: null,
      password_hash: password_hash,
      is_active: true,
      language: 'en',
    });
    // 4. Response DTO
    return user;
  }
  async updateUserProfile(id: number, dto: UpdateUserDto): Promise<UserFull> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updateUser = await this.userRepository.updateUser(id, dto);
    return updateUser;
  }
}
