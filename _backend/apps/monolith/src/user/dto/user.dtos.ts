import { ApiProperty } from '@nestjs/swagger';

import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsInt, IsPositive, IsBoolean } from 'class-validator';

// ------ DTOs for API ------
// CREATE
export class CreateUserDto {
  // Must have
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com' })
  email!: string;

  // Optional
  @IsOptional()
  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'strongPassword123' })
  password?: string;

  @IsOptional()
  @IsString()
  googleId?: string;

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

  @IsOptional()
  @IsString()
  @MinLength(1)
  googleId?: string;

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
  @IsString()
  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatar_url?: string;

  // Mutes push only; the notification row and the bell are unaffected.
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true })
  notifications_enabled?: boolean;
}

// What an account still holds, counted just before it is destroyed. Read by the delete
// dialog so the rider is told what disappears rather than asked to remember it.
export class AccountDeletionSummaryDto {
  @ApiProperty({ example: 3 })
  bikes!: number;
  @ApiProperty({ example: 412 })
  rides!: number;
  @ApiProperty({ example: 27 })
  services!: number;
  // Only the links that answer today: published and not revoked. A closed Report is
  // already unreachable, so counting it would overstate what the world loses.
  @ApiProperty({ example: 2 })
  publicReports!: number;
}

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;
  @ApiProperty({ example: 'John Doe' })
  name!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatar_url!: string | null;
  @ApiProperty({ example: 'en', nullable: true })
  language!: string | null;
  @ApiProperty({ example: 'czk', nullable: true })
  currency!: string | null;
  @ApiProperty({ example: 70, nullable: true })
  weight_kg!: number | null;
  @ApiProperty({ example: true })
  is_active!: boolean;
  // Whether a local password exists at all — the hash itself never leaves the server.
  // False for a Google account, which has nothing to change.
  @ApiProperty({ example: true })
  has_password!: boolean;
  // Null means never chosen, which the processor reads as on.
  @ApiProperty({ example: true, nullable: true })
  notifications_enabled!: boolean | null;
  // Set once the user completes the Strava OAuth flow. Null means not linked —
  // this is what the app reads to tell the two states apart.
  @ApiProperty({ example: '20678962', nullable: true })
  strava_athlete_id!: string | null;
  // Snapshot of the linked athlete, taken when the account was linked. Strava
  // returns no email, so these name the account instead of the athlete id.
  // Any of them can be null — Strava guarantees none.
  @ApiProperty({ example: 'Jaroslav', nullable: true })
  strava_firstname!: string | null;
  @ApiProperty({ example: 'Lufinka', nullable: true })
  strava_lastname!: string | null;
  @ApiProperty({ example: 'jlufinka', nullable: true })
  strava_username!: string | null;
  @ApiProperty({ example: 'https://dgalywyr863hv.cloudfront.net/pictures/athletes/.../large.jpg', nullable: true })
  strava_avatar_url!: string | null;
  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  last_login_at!: Date | null;
  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  created_at!: Date;
  @ApiProperty({ example: '2024-01-02T12:00:00Z' })
  updated_at!: Date;
}
