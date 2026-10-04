import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import 'dotenv/config';

// Without these Google answers every sign-in with an error page, so the app refuses to boot.
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`${name} is not set; Google sign-in cannot start`);
  return value;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: requiredEnv('GOOGLE_CLIENT_ID'),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Must equal a redirect URI on the Google Web client.
      callbackURL: requiredEnv('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback): any {
    const { id, name, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      // Google's own `email_verified` claim (ADR 0031); only an explicit true vouches.
      emailVerified: emails[0].verified === true,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
    };

    done(null, user);
  }
}
