import { Controller, Post, UseGuards, Get, Res, Req, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import chalk from 'chalk';
import { Public } from './decorators/public.decorator';
import { CreateUserDto, UserResponseDto } from 'src/user/dto/user.dtos';
import { LoginDto } from './dto/auth.dtos';
import { users as UserFull } from 'generated/prisma/client';
import type { Request, Response } from 'express';
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
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Req() req, @Res({ passthrough: true }) res: Response) {
    this.authService.setJWTtokenToCookie(res, req.user);
    console.log(chalk.greenBright(`User ${req.user.email} loggedIn by password`));
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
  @ApiResponse({ status: 202 | 201, type: UserResponseDto })
  @Get('google/callback')
  async googleAuthRedirect(@Req() req, @Res({ passthrough: true }) res: Response) {
    // 1. In req.user is now data from GoogleStrategy.validate()
    // 2. Find the user in the DB or create them (registration)
    const { googleId, email, emailVerified, avatar_url, firstName: name } = req.user;
    const { user, isNewUser } = await this.authService.registerOrLoginUserGoogle({
      googleId,
      email,
      emailVerified,
      name,
      avatar_url,
    });
    this.authService.setJWTtokenToCookie(res, user);
    const statusCode = isNewUser ? HttpStatus.CREATED : HttpStatus.ACCEPTED;
    res.status(statusCode);
    console.log(chalk.bgGreen.bold(`User ${email} loggedIn by Google`));
    console.log(user);
    return this.mapToResponse(user);
    // Instead of redirecting to the frontend (res.redirect), just send the token as JSON
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
      ride_style_id: user.ride_style_id,
      is_active: user.is_active || false,
      last_login_at: user.last_login_at ?? null,
      updated_at: user.updated_at ?? new Date(),
      created_at: user.created_at || new Date(),
    };
  }
}
