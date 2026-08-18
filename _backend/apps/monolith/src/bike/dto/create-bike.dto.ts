import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsInt, IsPositive, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';
import { CreateMountedComponentsDto } from '../../component/dto/create-components';

export class DefaultComponentsRequestDto {
  @ApiProperty({ example: false, description: 'Is the bike an e-bike' })
  @IsBoolean()
  ebike!: boolean;
}

export class CreateBikeDto {
  // Required
  // Not sent by the client: ownership is taken from the authenticated user, so
  // the controller overwrites whatever arrives here.
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  user_id?: number;

  @ApiProperty({ example: 'Trek' })
  @IsString()
  @MaxLength(50)
  bike_brand!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  ebike!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  has_front_suspension!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  has_rear_suspension!: boolean;

  // Optional
  // Scraped model names carry the full trim and colourway, so they run long.
  @ApiProperty({ example: 'Domane SL7', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bike_model?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  organization_id?: number;

  // The user's own name for the bike, typed freely on the wizard - 30 chars was
  // too tight for what people actually write.
  @ApiProperty({ example: 'Tarmac SL7', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bikename?: string;

  @ApiProperty({ example: 2024, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  year?: number;

  @ApiProperty({ example: 'Serviced bike, top health', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ example: '29"', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  wheel_size?: string;

  @ApiProperty({ example: 'L', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bike_size?: string;

  // The client picks the type by name; the service resolves it to bike_type_id,
  // so the form never has to carry ids it cannot know.
  @ApiProperty({ example: 'Enduro', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bike_type?: string;

  // A brand new bike has zero kilometres, so this is Min(0) rather than positive.
  @ApiProperty({ example: 1540, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  total_km?: number;

  @ApiProperty({ example: 'https://example.com/bike-image.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  image_url?: string;
}

export class CreateBikeWithComponentsDto {
  @ApiProperty({ type: () => CreateBikeDto })
  @ValidateNested()
  @Type(() => CreateBikeDto)
  bike!: CreateBikeDto;

  @ApiProperty({
    type: () => CreateMountedComponentsDto,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @Type(() => CreateMountedComponentsDto)
  @IsArray()
  components!: CreateMountedComponentsDto[];
}
