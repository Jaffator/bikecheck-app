import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { publicAppOrigin } from '../_config/public-app-origin';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { users as UserFull } from '@prisma/client';
import { RefreshTokenService } from '../refreshtoken/refreshtoken.service';
import { TokenService } from './token.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from '../user/dto/user.dtos';
import { RegisterResponseDto, VerifyEmailResponseDto } from './dto/auth.dtos';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private refreshTokenRepository: RefreshTokenService,
    private tokenService: TokenService,
    private mailService: MailService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {}

  // Registration ends on "check your inbox", not in the app (ADR 0031): the row is
  // written as a placeholder, the Verification Email carries the link that proves the
  // address, and the answer names the address and nothing else - no session, no profile.
  // Create and replace answer alike, so nothing here says whether the address was known.
  async registerLocal(dto: CreateUserDto): Promise<RegisterResponseDto> {
    const user = await this.userService.registerLocal(dto);
    await this.sendVerificationEmail(user);
    this.logger.info({ userId: user.id }, 'Registered, verification email sent');
    return { email: user.email };
  }

  // The link verifies (ADR 0031). The token proves an address, not a password, so nothing
  // here opens a session; the login form stays the one door. Every refusal is the one code,
  // so the page has nothing to tell apart. The address is checked against the row, so a
  // link minted for one placeholder never verifies a row replaced under another address.
  // Already verified reads as success, writes nothing and greets nobody: a second tap on
  // the link must never show an error for something that already worked.
  async verifyEmail(token: string): Promise<VerifyEmailResponseDto> {
    const { sub, email } = this.tokenService.readVerificationToken(token);
    const user = await this.userService.getUserbyId(sub);
    if (!user || user.email !== email) {
      this.logger.warn({ userId: sub }, 'Verification token refused: names no row with that address');
      throw new BadRequestException('VERIFICATION_TOKEN_INVALID');
    }

    if (user.email_verified_at !== null) {
      this.logger.info({ userId: user.id }, 'Verification link used on a Verified Email; nothing to do');
      return { email: user.email };
    }

    // The conditional write says whether this call made the null -> set transition, so
    // two taps at once send the Welcome Email once.
    const verified = await this.userService.verifyEmail(user.id);
    if (verified) {
      await this.mailService.sendWelcomeEmail(user);
      this.logger.info({ userId: user.id }, 'Email verified, welcome email sent');
    }

    return { email: user.email };
  }

  // "Send it again" (ADR 0031): a lost Verification Email is a tap away. Only an Unverified
  // Account gets one - the link just mints another token, there is nothing to revoke. A
  // Verified Email and an unknown address get nothing, and every case answers alike, so
  // the endpoint says nothing about who has an account.
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userService.getUserbyEmail(email);
    if (!user || user.email_verified_at !== null) {
      this.logger.info('Resend asked for an address with no Unverified Account; nothing sent');
      return;
    }

    await this.sendVerificationEmail(user);
    this.logger.info({ userId: user.id }, 'Verification email sent again');
  }

  async loginUserLocal(email: string, password: string): Promise<UserFull | null> {
    const user = await this.userService.getUserbyEmail(email);
    if (!user) {
      this.logger.warn({ email }, 'User not found');
      return null;
    }

    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        this.logger.warn({ userId: user.id, email }, 'Invalid credentials');
        return null;
      }

      // Password first, so the 403 never tells someone who does not know it that a
      // placeholder exists. This is the one door; nothing past it checks the column.
      if (user.email_verified_at === null) {
        this.logger.warn({ userId: user.id }, 'Login on an Unverified Account');
        throw new ForbiddenException('EMAIL_NOT_VERIFIED');
      }

      this.logger.info({ userId: user.id }, 'User logged in');
      return user;
    }

    if (user.googleId && user.email === email) {
      this.logger.warn({ userId: user.id, email }, 'Google account attempted local login');
      throw new UnauthorizedException('This account was created by google account, use Google sign in instead');
    }

    this.logger.warn({ userId: user.id, email }, 'User has no authentication method');
    return null;
  }
  // The user is already logged in, so the old password is the only proof of identity
  // needed — no mailer, no reset token. The refresh token the request arrived with is kept
  // alive; every other session of theirs is dropped, because a changed password is exactly
  // when someone else's device has to stop working.
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    currentRefreshToken: string | null,
  ): Promise<void> {
    const user = await this.userService.getUserbyId(userId);
    if (!user) {
      this.logger.warn({ userId }, 'Password change for unknown user');
      throw new UnauthorizedException('Invalid credentials');
    }

    // A Google account has no password to replace, so this is a bad request, not a
    // rejected credential.
    if (!user.password_hash) {
      this.logger.warn({ userId }, 'Password change on an account without a password');
      throw new BadRequestException('This account has no password to change');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      this.logger.warn({ userId }, 'Password change with wrong current password');
      throw new UnauthorizedException('Current password is not correct');
    }

    await this.userService.updatePassword(userId, newPassword);
    await this.refreshTokenRepository.revokeAllUserTokensExcept(userId, currentRefreshToken);
    this.logger.info({ userId }, 'Password changed, other sessions revoked');
  }

  async logout(refresh_token: string): Promise<void> {
    if (!refresh_token) return;
    await this.refreshTokenRepository.revokeToken(refresh_token);
    this.logger.info('Token revoked');
  }

  // The Verification Email to a row in hand, minted and addressed here so every way an
  // Unverified Account is born - registration, an unvouched Google sign-in - sends the same
  // link. The link is opened, not fetched: it lands on the app's own page, which does the
  // verifying on a tap. A failed send is the mailer's to log; the row stays written.
  async sendVerificationEmail(user: UserFull): Promise<void> {
    const token = this.tokenService.mintVerificationToken(user);
    const link = `${publicAppOrigin('verification link')}/verify-email?token=${encodeURIComponent(token)}`;
    await this.mailService.sendVerificationEmail(user, link);
  }
}
