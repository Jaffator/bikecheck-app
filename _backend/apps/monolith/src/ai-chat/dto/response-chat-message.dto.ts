import { ApiProperty } from '@nestjs/swagger';

export type ChatRole = 'user' | 'assistant';

// One turn of the thread as it is read back. What the model did to answer is stored beside it
// and never returned: the thread is what was said, not how it was found out.
export class ResponseChatMessageDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: ['user', 'assistant'], example: 'assistant' })
  role!: ChatRole;

  @ApiProperty({ example: 'You have two bikes: a Santa Cruz Hightower and a Canyon Grail.' })
  content!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 12,
    description: 'The bike bound when the question was asked; a change between turns is the divider',
  })
  bike_id!: number | null;

  @ApiProperty({ example: '2026-09-09T08:39:40.000Z' })
  created_at!: string;
}
