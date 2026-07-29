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
