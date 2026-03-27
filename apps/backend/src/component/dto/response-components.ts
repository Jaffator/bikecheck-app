import { ApiProperty } from '@nestjs/swagger';
import { components_mounted } from '@prisma/client';

export class ResponseComponentsDto implements components_mounted {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  bike_id!: number;

  @ApiProperty({ example: 12 })
  component_type_id!: number;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z', nullable: true })
  mounted_at!: Date | null;

  @ApiProperty({ example: null, nullable: true })
  removed_at!: Date | null;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z', nullable: true })
  updated_at!: Date | null;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z', nullable: true })
  created_at!: Date | null;

  @ApiProperty({ example: 1200, nullable: true })
  total_mileage_km!: number | null;

  @ApiProperty({ example: 'Mounted after spring service', nullable: true })
  note!: string | null;

  @ApiProperty({ example: true, nullable: true })
  is_active!: boolean | null;

  @ApiProperty({ example: 2, nullable: true })
  interval_id!: number | null;

  @ApiProperty({ example: 350, nullable: true })
  brake_load_since_service!: number | null;

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z', nullable: true })
  last_serviced_at!: Date | null;

  @ApiProperty({ example: false, nullable: true })
  is_deleted!: boolean | null;

  @ApiProperty({ example: null, nullable: true })
  deleted_at!: Date | null;

  @ApiProperty({ example: 'Fox 38 Factory Grip2', nullable: true })
  component_desc!: string | null;
}
