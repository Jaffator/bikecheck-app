import { Controller, Post, UseGuards, Get, Res, Req, Body, HttpCode, HttpStatus, Ip } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import chalk from 'chalk';
import { Public } from './decorators/public.decorator';
import { CreateUserDto, UserResponseDto } from 'src/user/dto/user.dtos';
import { LoginDto } from './dto/auth.dtos';
import { users as UserFull } from '@prisma/client';
import type { Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';

export interface AuthRequest extends Request {
  user: UserFull;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  // --- REGISTER new user, email password endpoint
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

  // --- REFRESH token
  @ApiResponse({ status: 200, type: UserResponseDto })
  @Post('refresh')
  async refreshUser(@Req() req: Request, @Res() res: Response, @Ip() ip: string) {
    const deviceInfo = this.getDeviceInfo(req);
    const refreshToken = req.cookies['refresh_token'];
    const { newRefreshToken, newJwt_token } = await this.authService.refreshToken(refreshToken, deviceInfo, ip);
    this.setAuthCookies(res, newJwt_token, newRefreshToken);
    console.log(req);
  }

  // --- LOGOUT user, email password endpoint
  @ApiResponse({ status: 200 })
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies['refresh_token'];
    await this.authService.logout(token);
    this.deleteAuthCookies(res);
    console.log(chalk.bgBlue.greenBright(`Token revoked, user LogOut`));
    return res.status(200).json({ message: 'User successfully logged out' });
  }

  // --- LOGIN user, email password endpoint
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 202, type: UserResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Req() req: any, @Res({ passthrough: true }) res: Response, @Ip() ip: string): Promise<UserResponseDto> {
    const deviceInfo = this.getDeviceInfo(req);
    const { newRefreshToken, newJwt_token } = await this.authService.getTokens(req.user, deviceInfo, ip);

    this.setAuthCookies(res, newJwt_token, newRefreshToken);

    console.log(chalk.bgGreen.greenBright(`User ${req.user.email} LoggedIn by password`));
    return this.mapToResponse(req.user);
  }

  // --- GOOGLE ask for auth
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth(): void {
    // initiates the Google OAuth2 login flow
  }

  // --- GOOGLE auth callback endpoint
  @Public()
  @UseGuards(GoogleAuthGuard)
  @ApiResponse({ status: 201 | 202, type: UserResponseDto })
  @Get('google/callback')
  async googleAuthRedirect(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<UserResponseDto> {
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

    const deviceInfo = this.getDeviceInfo(req);
    const { newRefreshToken, newJwt_token } = await this.authService.getTokens(user, deviceInfo, ip);

    this.setAuthCookies(res, newJwt_token, newRefreshToken);

    const statusCode = isNewUser ? HttpStatus.CREATED : HttpStatus.ACCEPTED;
    res.status(statusCode);
    console.log(chalk.bgGreen.bold(`User ${email} loggedIn by Google`));
    console.log(user);
    return this.mapToResponse(user);
    // Instead of redirecting to the frontend (res.redirect), just send the token as JSON
  }

  // ---- Private methods ----
  private deleteAuthCookies(res: Response): void {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true, // Musí být stejné jako při vytváření
      sameSite: 'lax', // Musí být stejné jako při vytváření
      path: '/', // Velmi důležité – musí sedět cesta!
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true, // Musí být stejné jako při vytváření
      sameSite: 'lax', // Musí být stejné jako při vytváření
      path: '/', // Velmi důležité – musí sedět cesta!
    });
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private getDeviceInfo(req: any): string {
    const userAgentRaw = req.headers['user-agent'];
    const parser = new UAParser(userAgentRaw);
    const ua = parser.getResult();
    const deviceName = `${ua.browser.name || 'Unknown'} on ${ua.os.name || 'Unknown'}`;
    return deviceName;
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
