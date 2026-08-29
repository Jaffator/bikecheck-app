// auth.dtos.ts is classes used like types becouse class validation techniques are used

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { UserResponseDto } from '../../user/dto/user.dtos';

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

// Sent by a native client on refresh. The web client keeps using the cookie and
// sends nothing, so the field is optional.
export class RefreshTokenDto {
  @ApiProperty({ example: 'a3f1c9...', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}

// Login / Google response. Additive on purpose: the web client keeps reading
// the same user fields and ignores the tokens, a native client has no cookie
// jar and reads the tokens instead.
export class AuthResponseDto extends UserResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' })
  accessToken!: string;

  @ApiProperty({ example: 'a3f1c9...' })
  refreshToken!: string;
}

// Refresh response. Same reasoning as AuthResponseDto: the message stays for
// the web client, the rotated tokens are there for the native one.
export class RefreshResponseDto {
  @ApiProperty({ example: 'Refresh token done' })
  message!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' })
  accessToken!: string;

  @ApiProperty({ example: 'a3f1c9...' })
  refreshToken!: string;
}
