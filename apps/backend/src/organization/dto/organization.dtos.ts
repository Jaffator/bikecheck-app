import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;
}

export class AddMemberDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  user_id!: number;

  @ApiProperty({ example: 'owner, admin, member' })
  @IsEnum(['owner', 'admin', 'member'])
  @IsNotEmpty()
  role_type!: 'owner' | 'admin' | 'member';
}

export class OrganizationResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  created_at!: Date | null;

  @ApiProperty()
  updated_at!: Date | null;
}

export class OrganizationMemberResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  user_id!: number;

  @ApiProperty()
  organization_id!: number;

  @ApiProperty()
  role_type!: string;
}
