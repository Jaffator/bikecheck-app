// Controller - only http handling
// Routing, parsing requests, calling Services
// No Bussines logic

import { Controller, Get, Post, Param, Body, Patch, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dtos';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { users as UserFull } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // GET user/:id
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @Get(':id')
  async getUser(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<UserResponseDto> {
    this.ensureSelf(userId, id);
    const user = await this.userService.getUserbyId(Number(id));
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponse(user);
  }

  // POST new user
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @Post('create')
  async createUser(@Body() data: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.createUserLocal(data);
    return this.mapToResponse(user);
  }

  // UPDATE user :id
  @ApiOperation({ summary: 'Update user by given ID' })
  @ApiResponse({ status: 202, type: UserResponseDto })
  @Patch(':id')
  async updateUser(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.ensureSelf(userId, id);
    const user = await this.userService.updateUserProfile(Number(id), data);
    return this.mapToResponse(user);
  }

  // A user may only read or modify their own profile.
  private ensureSelf(userId: string, targetId: string): void {
    if (Number(userId) !== Number(targetId)) {
      throw new ForbiddenException('You can only access your own profile');
    }
  }

  private mapToResponse(user: UserFull): UserResponseDto {
    return {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      avatar_url: user.avatar_url,
      language: user.language,
      currency: user.currency,
      weight_kg: user.weight_kg,
      is_active: user.is_active || false,
      last_login_at: user.last_login_at ?? null,
      updated_at: user.updated_at ?? new Date(),
      created_at: user.created_at || new Date(),
    };
  }
}
