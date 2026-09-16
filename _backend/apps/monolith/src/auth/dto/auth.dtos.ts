// auth.dtos.ts is classes used like types becouse class validation techniques are used

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsBoolean } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jaffa@jaffa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'jaffajaffa123' })
  @IsString()
  @MinLength(8)
  password!: string;
}

// Sent by the native app after a Google sign-in. Only the token is accepted:
// the profile is read from its verified payload, never from the request body.
export class GoogleTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...' })
  @IsString()
  @MinLength(1)
  idToken!: string;
}

// Changing a password while logged in: the old one is the proof of identity, so no mailer
// and no token table. `currentPassword` is only compared, never stored, so it carries no
// length rule — a wrong one has to reach the service and come back 401, not 400.
export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  // The same strength registration enforces (CreateUserDto), no stricter.
  @ApiProperty({ example: 'newStrongPassword123' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

// What registration answers (ADR 0031): the address the Verification Email went to, so
// the inbox screen can show it. No profile - a placeholder has none worth reading - and
// no cookies; the login form is the one door.
export class RegisterResponseDto {
  @ApiProperty({ example: 'jaffa@jaffa.com' })
  email!: string;
}

// "Send it again" (ADR 0031): the address the Verification Email should go to once more.
// The answer is the same whether or not an account exists behind it, so this is the only
// thing the request carries.
export class ResendVerificationDto {
  @ApiProperty({ example: 'jaffa@jaffa.com' })
  @IsEmail()
  email!: string;
}

// The link in a Verification Email, handed back by the page on a tap (ADR 0031). Only the
// token: everything else - who, which address - is read from its signed payload.
export class VerifyEmailDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' })
  @IsString()
  @MinLength(1)
  token!: string;
}

// What verifying answers: the address that is now verified, so the page can hand it to the
// login form. No profile and no cookies; the token proves an address, not a password.
export class VerifyEmailResponseDto {
  @ApiProperty({ example: 'jaffa@jaffa.com' })
  email!: string;
}

export class LoginGoogleDto {
  @IsString()
  @MinLength(1)
  avatar_url!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  googleId!: string;

  @IsBoolean()
  emailVerified!: boolean;

  @IsString()
  @IsEmail()
  email!: string;
}
