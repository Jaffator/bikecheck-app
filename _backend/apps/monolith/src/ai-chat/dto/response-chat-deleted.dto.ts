import { ApiProperty } from '@nestjs/swagger';

// What deleting the thread answers with: how many messages it actually reached. The server
// decides the count, not the thread the caller was looking at when they asked.
export class ResponseChatDeletedDto {
  @ApiProperty({ example: 12, description: 'How many messages the deletion reached' })
  count!: number;
}
