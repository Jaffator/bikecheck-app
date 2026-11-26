import { ApiProperty } from '@nestjs/swagger';

export class ResponseBikeLimitDto {
  @ApiProperty({ example: 1, description: 'How many Bikes the account may hold without Pro' })
  bike_limit!: number;

  @ApiProperty({ example: 1, description: 'Bikes counted against the limit, archived ones included' })
  bike_count!: number;

  @ApiProperty({ example: false, description: 'True when an Archived Bike is among the counted' })
  has_archived_bikes!: boolean;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: '2026-11-25T10:00:00.000Z',
    description: 'When Pro started, null without Pro. With Pro the limit does not apply',
  })
  pro_since!: Date | null;
}
