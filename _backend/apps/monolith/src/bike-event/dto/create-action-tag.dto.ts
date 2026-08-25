import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// A tag one user adds to a catalogue action for themselves. It joins the seeded tags on
// that action and is offered to nobody else - see ADR 0008.
export class Create_ActionTagDto {
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 42, description: 'The catalogue action the tag belongs to' })
  event_action_id!: number;

  @IsString()
  @IsNotEmpty()
  // A tag is a chip, and a chip that runs past a phone's width has stopped being one.
  @MaxLength(60)
  @ApiProperty({ example: 'Bearing check' })
  tag!: string;
}
