import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OAuth2Client } from 'google-auth-library';
import { LoginGoogleDto } from './dto/auth.dtos';
import { users as UserFull } from '@prisma/client';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { MailService } from '../mail/mail.service';

// `isNewUser` says whether the account became usable in this call: born verified, a
// placeholder taken over or verified. The controller answers 201 for it.
export type GoogleUserType = {
  user: UserFull;
  isNewUser: boolean;
};

@Injectable()
export class GoogleAuthService {
  private readonly oauthClient = new OAuth2Client();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private mailService: MailService,
    @InjectPinoLogger(GoogleAuthService.name) private readonly logger: PinoLogger,
  ) {}

  // Verifies an ID token coming from the native app and unpacks the profile
  // from it. The request body is attacker-controlled, the token payload is not:
  // verifyIdToken checks Google's signature, the audience and the expiry, so
  // anything read from it can be trusted. Throws on any mismatch.
  async verifyIdToken(idToken: string): Promise<LoginGoogleDto> {
    const ticket = await this.oauthClient
      .verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID!,
      })
      .catch(() => {
        throw new UnauthorizedException('Invalid Google ID token');
      });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Google ID token has no email');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      name: payload.name ?? '',
      avatar_url: payload.picture ?? '',
    };
  }

  // Google's own word on the address counts (ADR 0031). Three lookups in order - by Google
  // id, by address, none - each split on whether Google vouches for the address and whether
  // the row is verified. A vouched sign-in is verified from birth and takes a placeholder
  // over; an unvouched one becomes a placeholder like any other, is sent the Verification
  // Email and refused with 403 EMAIL_NOT_VERIFIED - the same door login refuses at.
  async googleLogin(dto: LoginGoogleDto): Promise<GoogleUserType> {
    const byGoogleId = await this.userService.getUserbyGoogleId(dto.googleId);
    if (byGoogleId) return this.signInByGoogleId(byGoogleId, dto);

    const byEmail = await this.userService.getUserbyEmail(dto.email);
    if (byEmail) return this.signInByEmail(byEmail, dto);

    return this.signInNew(dto);
  }

  // ---- Private methods ----

  // The row already carries the Google id. Verified: signed in as today. A placeholder an
  // unvouched sign-in left behind: vouched for now, it is verified here and greeted;
  // still unvouched, it gets the link again and is refused.
  private async signInByGoogleId(user: UserFull, dto: LoginGoogleDto): Promise<GoogleUserType> {
    if (user.email_verified_at !== null) {
      this.logger.info({ userId: user.id }, 'Google sign-in');
      return { user, isNewUser: false };
    }

    if (!dto.emailVerified) return this.refuseUnverified(user);

    // The conditional write says whether this call made the null -> set transition, so
    // two sign-ins at once greet once.
    const verified = await this.userService.verifyEmail(user.id);
    if (verified) {
      await this.mailService.sendWelcomeEmail(user);
      this.logger.info({ userId: user.id }, 'Google sign-in verified the placeholder, welcome email sent');
    }
    return { user, isNewUser: true };
  }

  // The address is known, the Google id is not. A Verified Email: vouched, the Google id is
  // linked and the rider signed in; unvouched, nothing is written - the password is the
  // way in. A placeholder: vouched, it is taken over outright - Google id, name and avatar,
  // the password gone, the row verified - so the impostor's row never becomes the owner's;
  // unvouched, the Google id goes onto it and it gets the link again and is refused.
  private async signInByEmail(user: UserFull, dto: LoginGoogleDto): Promise<GoogleUserType> {
    if (user.email_verified_at !== null) {
      if (!dto.emailVerified) {
        this.logger.warn({ userId: user.id }, 'Unvouched Google sign-in on a Verified Email; refused');
        throw new ConflictException('GOOGLE_EMAIL_UNVERIFIED');
      }

      const linked = await this.userService.linkGoogleId(user.id, dto);
      this.logger.info({ userId: user.id }, 'Google id linked, signed in');
      return { user: linked, isNewUser: false };
    }

    if (!dto.emailVerified) {
      const placeholder = await this.userService.linkGoogleId(user.id, dto);
      return this.refuseUnverified(placeholder);
    }

    const takenOver = await this.userService.takeOverPlaceholder(user.id, dto);
    if (takenOver === null) return this.signInAfterLostTakeover(dto);

    await this.mailService.sendWelcomeEmail(takenOver);
    this.logger.info({ userId: user.id }, 'Google sign-in took the placeholder over, welcome email sent');
    return { user: takenOver, isNewUser: true };
  }

  // Another write verified the row between read and write, so it is met as a Verified Email: linked,
  // no second Welcome Email (the winner sent it). Gone altogether, the sign-in starts over as new.
  private async signInAfterLostTakeover(dto: LoginGoogleDto): Promise<GoogleUserType> {
    const user = await this.userService.getUserbyEmail(dto.email);
    if (!user) return this.signInNew(dto);

    const linked = await this.userService.linkGoogleId(user.id, dto);
    this.logger.info({ userId: user.id }, 'Google sign-in lost the takeover; Google id linked, signed in');
    return { user: linked, isNewUser: false };
  }

  // Nobody has the address. Vouched: born verified and greeted. Unvouched: a placeholder
  // with the Google id on it, sent the link and refused.
  private async signInNew(dto: LoginGoogleDto): Promise<GoogleUserType> {
    const user = await this.userService.createUserByGoogle(dto);
    if (!dto.emailVerified) return this.refuseUnverified(user);

    await this.mailService.sendWelcomeEmail(user);
    this.logger.info({ userId: user.id }, 'Registered through Google, welcome email sent');
    return { user, isNewUser: true };
  }

  // An Unverified Account cannot sign in: the Verification Email goes out to the row as it
  // now stands, and the refusal is the one code login answers with.
  private async refuseUnverified(user: UserFull): Promise<never> {
    await this.authService.sendVerificationEmail(user);
    this.logger.warn({ userId: user.id }, 'Google sign-in on an Unverified Account; verification email sent');
    throw new ForbiddenException('EMAIL_NOT_VERIFIED');
  }
}
