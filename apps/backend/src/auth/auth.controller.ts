/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Controller, Post, UseGuards, Get, Res, Req, Body, Response } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import chalk from 'chalk';
import { Public } from './decorators/public.decorator';
import { CreateUserDto, UserResponseDto } from 'src/user/dto/user.dtos';
import { LoginDto } from './dto/auth.dtos';
import { users } from 'generated/prisma/client';
import { Request } from 'express';
import type { SafeUserType } from './interface/auth.interface';

export interface AuthenticatedRequest extends Request {
  user: SafeUserType;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  // --- Create user, email password endpoint
  @Public()
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @Post('register')
  async createUser(@Body() data: CreateUserDto): Promise<UserResponseDto> {
    const newUser = await this.userService.createUserLocal(data);
    if (newUser) {
      console.log(chalk.greenBright(`User ${data.email} created`));
    }
    return this.mapToResponse(newUser);
  }

  // --- Login user, email password endpoint
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 202, type: UserResponseDto })
  @Post('login')
  login(@Req() req: AuthenticatedRequest, @Res() res) {
    const jwt_token = this.authService.getJWTtoken(req.user);

    res.cookie('access_token', jwt_token, {
      httpOnly: true,
      secure: true, // only thru HTTPS
      sameSite: 'strict',
    });

    console.log(chalk.greenBright(`User ${req.user.email} logged in`));
    return this.mapToResponse(req.user);
  }

  // --- Google auth endpoint
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {
    // initiates the Google OAuth2 login flow
  }

  // --- Google auth callback endpoint
  @Public()
  @UseGuards(GoogleAuthGuard)
  @ApiResponse({ status: 202, type: UserResponseDto })
  @Get('google/callback')
  async googleAuthRedirect(@Req() req, @Res() res) {
    // 1. In req.user is now data from GoogleStrategy.validate()
    // 2. Find the user in the DB or create them (registration)
    const user = await this.authService.registerOrLoginUserGoogle({
      googleId: req.user.user_details.googleId,
      email: req.user.user_details.email,
      emailVerified: req.user.user_details.emailVerified,
      name: req.user.user_details.firstName,
    });

    // 3. Generate standard JWT token
    const jwt_token = this.authService.getJWTtoken(user);

    // For testing without frontend redirection:
    // Instead of redirecting to the frontend (res.redirect), just send the token as JSON
    return res.json({
      message: 'Google authentication successful!',
      jwt_token: jwt_token,
      user_details: this.mapToResponse(user),
    });
  }

  private mapToResponse(user: SafeUserType): UserResponseDto {
    return {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      avatar_url: user.avatar_url,
      language: user.language,
      currency: user.currency,
      weight_kg: user.weight_kg,
      ride_style_id: user.ride_style_id,
      is_active: user.is_active || false,
      last_login_at: user.last_login_at ?? null,
      updated_at: user.updated_at ?? new Date(),
      created_at: user.created_at || new Date(),
    };
  }
}
