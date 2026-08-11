import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { LoginGoogleDto } from './dto/auth.dtos';
import { users as UserFull } from '@prisma/client';
import { UserService } from '../user/user.service';

type GoogleUserType = {
  user: UserFull;
  isNewUser: boolean;
};

@Injectable()
export class GoogleAuthService {
  private readonly oauthClient = new OAuth2Client();

  constructor(private userService: UserService) {}

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

  async googleLogin(dto: LoginGoogleDto): Promise<GoogleUserType> {
    // 1. Google user exist
    const userGoogle = await this.userService.getUserbyGoogleId(dto.googleId);
    if (userGoogle?.googleId === dto.googleId) {
      return { user: userGoogle, isNewUser: false };
    }

    // 2. Google user does NOT exist but email YES -> link googleiId to user account
    const userEmail = await this.userService.getUserbyEmail(dto.email);
    if (userEmail && userEmail?.googleId != dto.googleId && userEmail?.email === dto.email && dto.emailVerified) {
      const updatedUser = await this.userService.updateUserProfile(userEmail.id, {
        googleId: dto.googleId,
        avatar_url: dto.avatar_url,
      });
      return { user: updatedUser, isNewUser: false };
    }

    // 3 User does NOT exist at all -> create new register
    const newUser = await this.userService.createUserByGoogle(dto);
    return { user: newUser, isNewUser: true };
  }
}
