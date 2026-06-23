import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeviceTokenDto {
  @ApiProperty({ example: 'caYcjw...:APA91b...' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'android', required: true })
  @IsString()
  platform!: string;
}
