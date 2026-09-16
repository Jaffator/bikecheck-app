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
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthService, GoogleUserType } from './googleAuth.service';
import { TokenService } from './token.service';
import { AUTH_CONFIG } from './auth.config';
import { UserService } from '../user/user.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateUserDto, UserResponseDto } from '../user/dto/user.dtos';
import {
  ChangePasswordDto,
  GoogleTokenDto,
  LoginDto,
  RegisterResponseDto,
  ResendVerificationDto,
  VerifyEmailDto,
  VerifyEmailResponseDto,
} from './dto/auth.dtos';
import { users as UserFull } from '@prisma/client';
import type { Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';

export interface AuthRequest extends Request {
  user: UserFull;
}

// The query flags a refused web Google sign-in carries back to the login page (ADR 0031).
// The frontend reads the same names: the address of an Unverified Account, for the inbox
// state, or the error code to show under the Google button.
const GOOGLE_EMAIL_NOT_VERIFIED_PARAM = 'emailNotVerified';
const GOOGLE_ERROR_PARAM = 'googleError';

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
  // Ends on "check your inbox" (ADR 0031): 201 with the address the Verification Email
  // went to, no cookies. 409 only for a Verified Email; an Unverified Account is replaced.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBody({ type: CreateUserDto })
  @Public()
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 409 })
  @Post('register')
  async createUser(@Body() data: CreateUserDto): Promise<RegisterResponseDto> {
    return this.authService.registerLocal(data);
  }

  // --- RESEND the Verification Email to an address (ADR 0031)
  // Public - nobody is signed in yet. 204 in every case, whether the address belongs to an
  // Unverified Account (a fresh email goes out), a Verified Email or nobody (nothing does),
  // so the endpoint cannot be used to find out who has an account. Tighter throttle than
  // verify: every call that lands can put an email in someone's inbox.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Public()
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verification/resend')
  async resendVerification(@Body() data: ResendVerificationDto): Promise<void> {
    await this.authService.resendVerificationEmail(data.email);
  }

  // --- VERIFY the address named by the link in a Verification Email (ADR 0031)
  // A POST, never a GET: the link is opened, not fetched, so a mail scanner following it
  // verifies nothing. Public - nobody is signed in yet - and no cookies come out of it:
  // the token proves an address, not a password. 200 for a fresh and a repeated link
  // alike; 400 VERIFICATION_TOKEN_INVALID for every refusal, one code for all of them.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, type: VerifyEmailResponseDto })
  @ApiResponse({ status: 400, description: 'VERIFICATION_TOKEN_INVALID' })
  @HttpCode(HttpStatus.OK)
  @Post('verification/verify')
  async verifyEmail(@Body() data: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    return this.authService.verifyEmail(data.token);
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
  // @Public() on purpose: this is called precisely when the access token is
  // expired, so requiring a valid one here would make the endpoint unreachable.
  // The refresh token cookie is the credential being checked instead.
  @Public()
  @ApiResponse({ status: 200 })
  @Post('refresh')
  async refreshUser(@Req() req: Request, @Res() res: Response, @Ip() ip: string) {
    const deviceInfo = this.getDeviceInfo(req);
    const currentRefreshToken = req.cookies['refresh_token'];
    if (!currentRefreshToken) {
      throw new UnauthorizedException('Session expired');
    }
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

  // --- CHANGE PASSWORD of the logged-in user
  // Not @Public(): the session is what says whose password this is. The refresh token
  // cookie names the device the change is made from, so that one session survives it.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() data: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const currentRefreshToken: string | null = req.cookies['refresh_token'] ?? null;
    await this.authService.changePassword(Number(userId), data.currentPassword, data.newPassword, currentRefreshToken);
    return { message: 'Password changed' };
  }

  // --- LOGIN user, classic email password endpoint
  // 401 for a wrong password; 403 EMAIL_NOT_VERIFIED for the right one on an Unverified
  // Account (LocalStrategy -> AuthService). The one door; nothing past it checks the column.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 202, type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'EMAIL_NOT_VERIFIED' })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Req() req: any, @Res({ passthrough: true }) res: Response, @Ip() ip: string): Promise<UserResponseDto> {
    console.log('LOGIN-----------');
    const deviceInfo = this.getDeviceInfo(req);
    const { refreshToken, accessToken } = await this.tokenService.createRefreshAndAccessTokens(
      req.user,
      deviceInfo,
      ip,
    );
    console.log(deviceInfo);
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
  // 403 EMAIL_NOT_VERIFIED with no cookies for an Unverified Account (the Verification
  // Email is on its way); 409 GOOGLE_EMAIL_UNVERIFIED when an address Google does not vouch
  // for meets a Verified Email - the password is the way in (ADR 0031).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @ApiBody({ type: GoogleTokenDto })
  @ApiResponse({ status: 200 | 201, type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'EMAIL_NOT_VERIFIED' })
  @ApiResponse({ status: 409, description: 'GOOGLE_EMAIL_UNVERIFIED' })
  @Post('google/token')
  async googleReceiveToken(
    @Body() data: GoogleTokenDto, //
    @Req() req: Request, // deu to headers for device info
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<UserResponseDto> {
    const profile = await this.googleService.verifyIdToken(data.idToken);
    console.log('Google ID token verified, profile:', profile);
    const { user, isNewUser } = await this.googleService.googleLogin(profile);
    console.log('Google login successful:', user, 'Is new user:', isNewUser);
    const deviceInfo = this.getDeviceInfo(req);
    const { refreshToken, accessToken } = await this.tokenService.createRefreshAndAccessTokens(user, deviceInfo, ip);
    res.status(isNewUser ? HttpStatus.CREATED : HttpStatus.OK);
    this.setAuthCookies(res, accessToken, refreshToken);
    return this.mapToResponse(user);
  }

  // --- GOOGLE auth callback endpoint
  // The browser is mid-redirect, so a refusal cannot be answered as JSON: it travels to the
  // login page as a query flag instead (see googleRefusalUrl). No cookies either way.
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

    const { googleId, email, emailVerified, picture: avatar_url, firstName: name } = req.user;
    let login: GoogleUserType;
    try {
      login = await this.googleService.googleLogin({ googleId, email, emailVerified, name, avatar_url });
    } catch (error) {
      return res.redirect(this.googleRefusalUrl(error, email));
    }
    const { user, isNewUser } = login;
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

  // Where a refused web Google sign-in lands: the login page, with the refusal as a query
  // flag the form reads. An Unverified Account arrives as its address, for the inbox state;
  // a Verified Email met by an unvouched address arrives as the error code, to be told to
  // use its password. Anything else is not a refusal and is rethrown.
  private googleRefusalUrl(error: unknown, email: string): string {
    const url = new URL(process.env.FRONTEND_URL!);
    if (error instanceof ForbiddenException) {
      url.searchParams.set(GOOGLE_EMAIL_NOT_VERIFIED_PARAM, email);
      return url.toString();
    }
    if (error instanceof ConflictException) {
      url.searchParams.set(GOOGLE_ERROR_PARAM, error.message);
      return url.toString();
    }
    throw error;
  }

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

    // Mirrors the DB expiry. Hardcoding a shorter value would drop the cookie
    // while the token is still valid, logging the user out for no reason.
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_CONFIG.REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
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
      tire_pressure_unit: user.tire_pressure_unit,
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
