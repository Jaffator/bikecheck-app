// Controller - only http handling
// Routing, parsing requests, calling Services
// No Bussines logic

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AccountDeletionSummaryDto, CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dtos';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { users as UserFull } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Response } from 'express';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // GET users/me/deletion-summary
  // Declared before the `:id` route so the word "me" is never read as an id.
  @ApiOperation({ summary: 'What the signed-in account still holds, for the delete dialog' })
  @ApiResponse({ status: 200, type: AccountDeletionSummaryDto })
  @Get('me/deletion-summary')
  async getDeletionSummary(@CurrentUser('userId') userId: string): Promise<AccountDeletionSummaryDto> {
    return this.userService.getAccountDeletionSummary(Number(userId));
  }

  // DELETE users/me
  // Behind the global JwtAuthGuard, so the session is what names the account - there is no
  // id to pass and therefore no other account to aim at.
  @ApiOperation({ summary: 'Delete the signed-in account and everything belonging to it' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Delete('me')
  async deleteMe(
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.userService.deleteAccount(Number(userId));
    // The access token is stateless and would still verify against a user that no longer
    // exists, so the session has to be dropped in the same response that destroys it.
    this.clearAuthCookies(res);
    // A body rather than a 204: the shared client parses every response as JSON.
    return { message: 'Account deleted' };
  }

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

  // Same names, flags and path the auth controller sets them with - a cookie cleared with
  // anything else is left behind by the browser.
  private clearAuthCookies(res: Response): void {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie('access_token', options);
    res.clearCookie('refresh_token', options);
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
      has_password: user.password_hash !== null,
      notifications_enabled: user.notifications_enabled ?? null,
      strava_athlete_id: user.strava_athlete_id ?? null,
      strava_firstname: user.strava_firstname ?? null,
      strava_lastname: user.strava_lastname ?? null,
      strava_username: user.strava_username ?? null,
      strava_avatar_url: user.strava_avatar_url ?? null,
      last_login_at: user.last_login_at ?? null,
      updated_at: user.updated_at ?? new Date(),
      created_at: user.created_at || new Date(),
    };
  }
}
