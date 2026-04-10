import { ApiProperty } from '@nestjs/swagger';

export class ResponseBikeEventDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 15, nullable: true })
  bike_id!: number | null;

  @ApiProperty({ example: 'Replaced chain and cassette', nullable: true })
  note!: string | null;

  @ApiProperty({ example: 150.5, nullable: true })
  total_cost!: any;

  @ApiProperty({ example: '2024-01-01T12:00:00Z', nullable: true })
  created_at!: Date | null;

  @ApiProperty({ example: '2024-01-02T12:00:00Z', nullable: true })
  updated_at!: Date | null;

  @ApiProperty({ example: false, nullable: true })
  is_deleted!: boolean | null;

  @ApiProperty({ example: null, nullable: true })
  deleted_at!: Date | null;
}

export class ResponseGroupsDto {}
