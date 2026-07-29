import {
  Controller,
  Post,
  UseGuards,
  Get,
  Res,
  Req,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './googleAuth.service';
import { TokenService } from './token.service';
import { AUTH_CONFIG } from './auth.config';
import { UserService } from '../user/user.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateUserDto, UserResponseDto } from '../user/dto/user.dtos';
import { GoogleTokenDto, LoginDto } from './dto/auth.dtos';
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
    private googleService: GoogleAuthService,
    private tokenService: TokenService,
  ) {}

  // Testing endpoint
  @Public()
  @Get('/test')
  test(@Res() res: Response) {
    return res.status(200).json({ message: 'Test endpoint working' });
  }

  // --- REGISTER new user, email password endpoint
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBody({ type: CreateUserDto })
  @Public()
  @ApiResponse({ status: 201, type: UserResponseDto })
  @Post('register')
  async createUser(@Body() data: CreateUserDto): Promise<UserResponseDto> {
    const newUser = await this.userService.createUserLocal(data);
    return this.mapToResponse(newUser);
  }

  // --- ME - who is currently logged in (used by the frontend to gate routes)
  @ApiResponse({ status: 200, type: UserResponseDto })
  @Get('me')
  async getMe(@CurrentUser('userId') userId: string): Promise<UserResponseDto> {
    console.log('Current userId:---------');
    const user = await this.userService.getUserbyId(Number(userId));
    console.log('Current user:', user);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponse(user);
  }

  // --- REFRESH token
  @ApiResponse({ status: 200 })
  @Post('refresh')
  async refreshUser(@Req() req: Request, @Res() res: Response, @Ip() ip: string) {
    const deviceInfo = this.getDeviceInfo(req);
    const currentRefreshToken = req.cookies['refresh_token'];
    const { refreshToken, accessToken } = await this.tokenService.refreshToken(currentRefreshToken, deviceInfo, ip);
    this.setAuthCookies(res, accessToken, refreshToken);
    return res.status(200).json({ message: 'Refresh token done' });
  }

  // --- LOGOUT user
  @ApiResponse({ status: 200 })
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    console.log('Logging out user...');
    const token = req.cookies['refresh_token'];
    await this.authService.logout(token);
    this.deleteAuthCookies(res);
    return res.status(200).json({ message: 'User successfully logged out' });
  }

  // --- LOGIN user, classic email password endpoint
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 202, type: UserResponseDto })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Req() req: any, @Res({ passthrough: true }) res: Response, @Ip() ip: string): Promise<UserResponseDto> {
    const deviceInfo = this.getDeviceInfo(req);
    const { refreshToken, accessToken } = await this.tokenService.createRefreshAndAccessTokens(
      req.user,
      deviceInfo,
      ip,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return this.mapToResponse(req.user);
  }

  // --- GOOGLE ask for auth
  // @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth(): void {
    // initiates the Google OAuth2 login flow
  }

  // --- GOOGLE Endpoint for the ID token sent by the native app.
  // The web flow redirects through Google, the native app already holds the
  // token, so it posts it here. Everything past the verification is identical
  // to google/callback, except there is no redirect — the app stays put.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @ApiBody({ type: GoogleTokenDto })
  @ApiResponse({ status: 200 | 201, type: UserResponseDto })
  @Post('google/token')
  async googleReceiveToken(
    @Body() data: GoogleTokenDto, //
    @Req() req: Request, // deu to headers for device info
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<UserResponseDto> {
    const profile = await this.googleService.verifyIdToken(data.idToken);
    const { user, isNewUser } = await this.googleService.googleLogin(profile);

    const deviceInfo = this.getDeviceInfo(req);
    const { refreshToken, accessToken } = await this.tokenService.createRefreshAndAccessTokens(user, deviceInfo, ip);
    res.status(isNewUser ? HttpStatus.CREATED : HttpStatus.OK);
    this.setAuthCookies(res, accessToken, refreshToken);
    return this.mapToResponse(user);
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
  ): Promise<void> {
    // 1. In req.user is now data from GoogleStrategy.validate()
    // 2. Find the user in the DB or create them (registration)

    const { googleId, email, emailVerified, avatar_url, firstName: name } = req.user;
    const { user, isNewUser } = await this.googleService.googleLogin({
      googleId,
      email,
      emailVerified,
      name,
      avatar_url,
    });
    console.log('Google login successful:', user, 'Is new user:', isNewUser);
    const deviceInfo = this.getDeviceInfo(req);
    const { refreshToken, accessToken } = await this.tokenService.createRefreshAndAccessTokens(user, deviceInfo, ip);
    const statusCode = isNewUser ? HttpStatus.CREATED : HttpStatus.ACCEPTED;
    res.status(statusCode);
    this.setAuthCookies(res, accessToken, refreshToken);
    console.log(`Redirecting ------------ ${process.env.FRONTEND_URL}`);
    return res.redirect(`${process.env.FRONTEND_URL}`);
  }

  // ---- Private methods ----
  private deleteAuthCookies(res: Response): void {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Musí být stejné jako při vytváření
      sameSite: 'lax', // Musí být stejné jako při vytváření
      path: '/', // Velmi důležité – musí sedět cesta!
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Musí být stejné jako při vytváření
      sameSite: 'lax', // Musí být stejné jako při vytváření
      path: '/', // Velmi důležité – musí sedět cesta!
    });
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    // maxAge mirrors the JWT lifetime. Without it this is a session cookie, so
    // closing the browser or killing the app process drops it and the user
    // lands back on the login screen despite having a valid session.
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_CONFIG.JWT_EXPIRATION * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
      is_active: user.is_active || false,
      last_login_at: user.last_login_at ?? null,
      updated_at: user.updated_at ?? new Date(),
      created_at: user.created_at || new Date(),
    };
  }
}
