import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsInt, IsPositive, Length, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';
import { CreateMountedComponentsDto } from '../../component/dto/create-components';

export class SearchBikeExternalRequestDto {
  @ApiProperty({ example: 'Orebea Rallon' })
  @IsString()
  @MaxLength(100)
  bikeName!: string;

  @ApiProperty({ example: '2024', required: true })
  @IsString()
  @Length(4)
  year!: string;
}

export class DefaultComponentsRequestDto {
  @ApiProperty({ example: false, description: 'Is the bike an e-bike' })
  @IsBoolean()
  ebike!: boolean;
}

export class CreateBikeDto {
  // Required
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  user_id!: number;

  @ApiProperty({ example: 'Trek' })
  @IsString()
  @MaxLength(50)
  bike_brand!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  ebike!: boolean;

  // Optional
  @ApiProperty({ example: 'Domane SL7', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bike_model?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  organization_id?: number;

  @ApiProperty({ example: 'Tarmac SL7', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
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

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  wheel_size_id?: number;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  bike_size_id?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  bike_type_id?: number;

  @ApiProperty({ example: 1540, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  mileage_km?: number;

  @ApiProperty({ example: 'Carbon', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  frame_material?: string;

  @ApiProperty({ example: 'https://example.com/bike-image.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
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
