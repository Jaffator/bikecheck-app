import { ApiProperty } from '@nestjs/swagger';

export class Response_EarliestDayDto {
  @ApiProperty({
    type: String,
    example: '2023-04-02',
    nullable: true,
    description: 'Day of the earliest ride or dated Service; null for an empty garage',
  })
  day!: string | null;
}
