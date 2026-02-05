import { ApiProperty } from '@nestjs/swagger';

import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsInt, IsPositive } from 'class-validator';

// ------ DTOs for API ------
// CREATE
export class CreateUserDto {
  // Must have
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  // Optional
  @IsOptional()
  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'strongPassword123' })
  password: string;

  @IsOptional()
  @IsString()
  googleId: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'en' })
  language?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @ApiProperty({ example: 'John Doe' })
  name?: string;

  @MinLength(1)
  @IsOptional()
  @IsString()
  googleId: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @ApiProperty({ example: 'en' })
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  @ApiProperty({ example: 'czk' })
  currency?: string;

  @IsOptional()
  @IsPositive()
  @ApiProperty({ example: 70 })
  weight_kg?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1 })
  ride_style_id?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatar_url?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 'John Doe' })
  name: string;
  @ApiProperty()
  email: string;
  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatar_url: string | null;
  @ApiProperty({ example: 'en', nullable: true })
  language: string | null;
  @ApiProperty({ example: 'czk', nullable: true })
  currency: string | null;
  @ApiProperty({ example: 70, nullable: true })
  weight_kg: number | null;
  @ApiProperty({ example: 1, nullable: true })
  ride_style_id: number | null;
  @ApiProperty({ example: true })
  is_active: boolean;
  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  last_login_at: Date | null;
  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  created_at: Date;
  @ApiProperty({ example: '2024-01-02T12:00:00Z' })
  updated_at: Date;
}
