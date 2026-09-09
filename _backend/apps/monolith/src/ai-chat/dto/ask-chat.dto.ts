import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

// One question. The thread is not in the body either: it is implied by the logged-in user.
export class AskChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @ApiProperty({ example: 'Jaká mám kola?' })
  question!: string;

  // The bike bound in the chat's picker. It binds softly - a question that names another bike
  // overrides it - and an id that matches no bike of the user's reads as all bikes.
  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional({ example: 12, description: 'The bike selected in the chat; absent is all bikes' })
  bike_id?: number;
}
