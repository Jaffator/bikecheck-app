import { ApiProperty } from '@nestjs/swagger';
import { bikes } from '@prisma/client';

export class SearchBikeExternalResponseDto {
  @ApiProperty({ example: 'Orbea Rallon' })
  name!: string;
  @ApiProperty({ example: 'https://example.com/bike-image.jpg' })
  imageUrl!: string | null;
  @ApiProperty({ example: 'https://example.com/bike/1' })
  bikeUrl!: string;
}

export class BikeComponentExternalResponseDto {
  @ApiProperty({ example: 'Fork' })
  component_name!: string;

  @ApiProperty({ example: 12 })
  component_type_id!: number;

  @ApiProperty({ example: 'Fox 38 Factory Grip2' })
  component_desc!: string;
}

export class ResponseBikeDto implements bikes {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 15 })
  user_id!: number; // NOT NULL

  @ApiProperty({ example: 10, nullable: true })
  organization_id!: number | null;

  @ApiProperty({ example: 'Trail', nullable: true })
  ride_style_id!: number | null;

  @ApiProperty({ example: 'Specialized', nullable: true })
  bike_brand!: string;

  @ApiProperty({ example: 'Stumpjumper', nullable: true })
  bike_model!: string | null;

  @ApiProperty({ example: 'https://example.com/bike-image.jpg', nullable: true })
  image_url!: string | null;

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
