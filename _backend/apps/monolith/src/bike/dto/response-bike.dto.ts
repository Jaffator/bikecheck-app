import { ApiProperty } from '@nestjs/swagger';
import { bikes } from '@prisma/client';

class BikeModels {
  @ApiProperty({ example: 'Nomad' })
  model_name!: string;
  @ApiProperty({ example: 42 })
  brand_id!: number;
}

class BikeBrands {
  @ApiProperty({ example: 'Santa Cruz' })
  bike_brand!: string;
  @ApiProperty({ example: 42 })
  id!: number;
}

export class NewBikeFormDataDto {
  @ApiProperty({ type: [String] })
  bikeTypes!: string[];
  @ApiProperty({ type: [BikeBrands] })
  bikeBrands!: BikeBrands[];
  @ApiProperty({ type: [BikeModels] })
  bikeModels!: BikeModels[];
}

export class SearchBikeExternalResponseDto {
  @ApiProperty({ example: 'Orbea Rallon' })
  name!: string;
  @ApiProperty({ example: 'Orbea 2025' })
  bikeBrand!: string;
  @ApiProperty({ example: 'https://example.com/bike-image.jpg' })
  imageUrl!: string | null;
  @ApiProperty({ example: 'https://example.com/bike/1' })
  bikeUrl!: string;
  // A search answers with both: links straight to one bike, and links to a
  // collection of variants sold under one model name. A collection has to be
  // opened before anything can be picked from it.
  @ApiProperty({ enum: ['model', 'family'], example: 'model' })
  kind!: 'model' | 'family';
}

export class BikeComponentExternalResponseDto {
  @ApiProperty({ example: 'Fork' })
  component_name!: string;

  @ApiProperty({ example: 12 })
  component_type_id!: number;

  @ApiProperty({ example: 'Fox 38 Factory Grip2' })
  component_desc!: string;
}

// Mirrors the bikes row, except for the weight: a Decimal column is narrowed to a number
// before it goes out, so that one field is declared here rather than inherited.
export class ResponseBikeDto implements Omit<bikes, 'bike_weight_kg'> {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 15 })
  user_id!: number; // NOT NULL

  @ApiProperty({ example: true })
  ebike!: boolean;

  @ApiProperty({ example: 10, nullable: true })
  organization_id!: number | null;

  @ApiProperty({ example: 'Specialized', nullable: true })
  bike_brand!: string;

  @ApiProperty({ example: 'Stumpjumper', nullable: true })
  bike_model!: string | null;

  @ApiProperty({ example: 'https://example.com/bike-image.jpg', nullable: true })
  image_url!: string | null;

  @ApiProperty({ example: 1, nullable: true })
  bike_type_id!: number | null;

  // The type by name, which is how the client speaks about it - the edit form is offered a
  // list of names and sends one back, and never sees an id it could not have known.
  @ApiProperty({ example: 'Enduro', nullable: true })
  bike_type!: string | null;

  @ApiProperty({ example: 'Tarmac SL7', nullable: true })
  bikename!: string | null;

  @ApiProperty({ example: 2024, nullable: true })
  year!: number | null;

  @ApiProperty({ example: 'Serviced bike, top health', nullable: true })
  description!: string | null;

  @ApiProperty({ example: '29"', nullable: true })
  wheel_size!: string | null;

  @ApiProperty({ example: 'L', nullable: true })
  bike_size!: string | null;

  @ApiProperty({ example: 1540, nullable: true })
  total_km!: number | null;

  @ApiProperty({ example: 3600, nullable: true })
  total_time_min!: number | null;

  // A Decimal column, narrowed to a number at the service boundary the way costs are.
  @ApiProperty({ example: 7.25, nullable: true })
  bike_weight_kg!: number | null;

  @ApiProperty({ example: 15623, nullable: true })
  total_elevation_m!: number | null;

  @ApiProperty({ example: false })
  has_front_suspension!: boolean;

  @ApiProperty({ example: false })
  has_rear_suspension!: boolean;

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

  @ApiProperty({ example: 'b12345678', nullable: true })
  strava_gear_id!: string | null;

  @ApiProperty({ example: 'My Enduro Bike', nullable: true })
  strava_name!: string | null;
}
