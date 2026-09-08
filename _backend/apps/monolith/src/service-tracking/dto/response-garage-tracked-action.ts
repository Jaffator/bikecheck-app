import { ApiProperty } from '@nestjs/swagger';
import { Response_TrackedActionDto } from './response-tracked-action';

// One Tracked Action as the dashboard reads it. The list is flat across the whole garage,
// so a row has to name the bike it belongs to as well - the bike is what opening it leads
// to, and what tells the owner which machine is being asked about.
export class Response_GarageTrackedActionDto extends Response_TrackedActionDto {
  @ApiProperty({ example: 'Santa Cruz' })
  bike_brand!: string;

  @ApiProperty({ type: String, example: 'Hightower', nullable: true })
  bike_model!: string | null;

  @ApiProperty({ type: Number, example: 2022, nullable: true })
  year!: number | null;
}
