import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsInt, IsPositive } from 'class-validator';

export class CreateBikeDto {
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 2 })
  bike_brand_model_id: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1 })
  bike_type_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @ApiProperty({ example: 'Tarmac SL7' })
  bikename: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @MaxLength(4)
  @ApiProperty({ example: 2024, required: false })
  year: number;

  @IsOptional()
  @MaxLength(4)
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Serviced bike, top health', required: false })
  description: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @MaxLength(3)
  @ApiProperty({ example: 2, required: false })
  wheel_size_id: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 3, required: false })
  bike_size_id: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1540, required: false })
  mileage_km: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @ApiProperty({ example: 'Carbon', required: false })
  frame_material: string;
}

// (alias) type bikes = {
//     id: number;
//     created_at: Date | null;
//     updated_at: Date | null;
//     is_deleted: boolean | null;
//     deleted_at: Date | null;
//     organization_id: number;
//     bike_brand_id: number;
//     bike_type_id: number | null;
//     year: number | null;
//     wheel_size_id: number | null;
//     bike_size_id: number | null;
//     mileage_km: number | null;
//     frame_material: string | null;
//     bike_model_id: number | null;
//     bikename: string | null;
// }
