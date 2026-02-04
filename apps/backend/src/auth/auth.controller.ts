/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Res,
  Req,
  Body,
} from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import chalk from 'chalk';
import { Public } from './decorators/public.decorator';
import { CreateUserDto, UserResponseDto } from 'src/user/dto/user.dtos';
import { users } from 'generated/prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}
  // Register, email password endpoint
  @Public()
  @ApiOperation({ summary: 'Register new user, email and password' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @Post('register')
  async createUser(@Body() data: CreateUserDto): Promise<UserResponseDto> {
    const newUser = await this.userService.createUserLocal(data);
    if (newUser) {
      console.log(chalk.greenBright(`User ${data.email} created`));
    }
    return this.mapToResponse(newUser);
  }

  // Login, email password endpoint
  @Public()
  @ApiOperation({ summary: 'Login user' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req) {
    console.log(chalk.greenBright(`User ${req.user.email} logged in`));
    return this.authService.login(req.user);
  }

  // Google auth endpoint
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {
    // initiates the Google OAuth2 login flow
  }

  // Google auth callback endpoint
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleAuthRedirect(@Req() req, @Res() res) {
    console.log(req.user);
    // 1. V req.user máš teď data z GoogleStrategy.validate()
    // 2. Tady buď uživatele najdeš v DB nebo ho vytvoříš (registrace)
    // 3. Vygeneruješ svůj standardní JWT token
    const { access_token } = this.authService.login(req.user);

    // Pro testování bez frontendu:
    // Místo přesměrování na frontend (res.redirect) prostě pošli token jako JSON
    return res.json({
      message: 'Přihlášení úspěšné!',
      backend_jwt_token: access_token,
      user_details: req.user,
    });
  }
  private mapToResponse(user: users): UserResponseDto {
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
      // password:  obviously not passed to response
    };
  }
}
