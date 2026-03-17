import { ApiProperty } from '@nestjs/swagger';
import { bikes } from '@prisma/client';

export class ResponseBikeDto implements bikes {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 2 })
  bike_brand_model_id!: number;

  @ApiProperty({ example: 1, nullable: true })
  bike_type_id!: number | null;

  @ApiProperty({ example: 'Tarmac SL7', nullable: true })
  bikename!: string | null;

  @ApiProperty({ example: 2024, nullable: true })
  year!: number | null;

  @ApiProperty({ example: 'Serviced bike, top health', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 2, nullable: true })
  wheel_size_id!: number | null;

  @ApiProperty({ example: 3, nullable: true })
  bike_size_id!: number | null;

  @ApiProperty({ example: 1540, nullable: true })
  mileage_km!: number | null;

  @ApiProperty({ example: '2024-01-01T12:00:00.000Z', nullable: true })
  created_at!: Date | null;

  @ApiProperty({ example: '2024-01-02T12:00:00.000Z', nullable: true })
  updated_at!: Date | null;

  @ApiProperty({ example: 'Carbon', nullable: true })
  frame_material!: string | null;

  @ApiProperty({ example: false, nullable: true })
  is_deleted!: boolean | null;

  @ApiProperty({ example: null, nullable: true })
  deleted_at!: Date | null;
}
