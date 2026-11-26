import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { trimString } from '../../setup/dto/create-setup-profile.dto';

export class RedeemKeyDto {
  @ApiProperty({
    example: 'ABCD-1234',
    minLength: 1,
    maxLength: 100,
    description: 'Letter case and surrounding spaces do not matter',
  })
  @Transform(trimString)
  @IsString()
  @Length(1, 100)
  code!: string;
}
