import { IsIn, IsNumber, IsObject } from 'class-validator';

export class StravaWebhookEventDto {
  @IsIn(['create', 'update', 'delete'])
  aspect_type!: 'create' | 'update' | 'delete';

  @IsNumber()
  event_time!: number;

  @IsNumber()
  object_id!: number;

  @IsIn(['activity', 'athlete'])
  object_type!: 'activity' | 'athlete';

  @IsNumber()
  owner_id!: number;

  @IsNumber()
  subscription_id!: number;

  @IsObject()
  updates!: Record<string, string>;
}
