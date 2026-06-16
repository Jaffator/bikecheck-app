import { ApiProperty } from '@nestjs/swagger';

export class ResponseNotificationDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'strava_unmatched_activity' })
  type!: string;

  @ApiProperty({ example: 'Nepřiřazená aktivita ze Stravy' })
  title!: string;

  @ApiProperty({ example: 'Kolo "Trek Fuel EX" ještě nemáš přiřazené' })
  body!: string;

  @ApiProperty({ example: { gearId: 'b12345' }, nullable: true })
  payload!: unknown;

  @ApiProperty({ example: false })
  is_read!: boolean;

  @ApiProperty({ example: null, nullable: true })
  read_at!: Date | null;

  @ApiProperty({ example: '2026-06-16T12:00:00.000Z' })
  created_at!: Date;
}
