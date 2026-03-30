import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';
import { CreateComponentsDto } from '../../component/dto/create-components';

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

  // Optional
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bike_model?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  organization_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @ApiProperty({ example: 'Tarmac SL7' })
  bikename?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 2024, required: false })
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Serviced bike, top health', required: false })
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 2, required: false })
  wheel_size_id?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 3, required: false })
  bike_size_id?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1, required: false })
  bike_type_id?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1540, required: false })
  mileage_km?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @ApiProperty({ example: 'Carbon', required: false })
  frame_material?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @ApiProperty({ example: 'https://example.com/bike-image.jpg', required: false })
  image_url?: string;
}

export class CreateBikeWithComponentsDto {
  @ApiProperty({ type: CreateBikeDto })
  @ValidateNested()
  @Type(() => CreateBikeDto)
  bike: CreateBikeDto;

  @ApiProperty({ type: [CreateComponentsDto], isArray: true })
  @ValidateNested({ each: true })
  @Type(() => CreateComponentsDto)
  @IsArray()
  components: CreateComponentsDto[];
}
