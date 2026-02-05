// auth.dtos.ts is classes used like types becouse class validation techniques are used

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'strongPassword123' })
  password: string;
}

export class LoginGoogleDto {
  @IsString()
  @MinLength(1)
  avatar_url: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  googleId: string;

  @IsBoolean()
  emailVerified: boolean;

  @IsString()
  @IsEmail()
  email: string;
}
