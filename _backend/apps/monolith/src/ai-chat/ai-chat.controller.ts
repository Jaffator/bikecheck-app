import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiChatService } from './ai-chat.service';
import { AskChatDto } from './dto/ask-chat.dto';
import { ResponseChatMessageDto } from './dto/response-chat-message.dto';
import type { ChatStreamEvent } from './ai-chat.types';

// A pass-through, plus the one thing the transport owes the loop: writing a line to a
// connection that may already be gone. What an answer is made of is decided in AiChatService.
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  // ---------- GET the thread of the logged-in user ----------
  // No thread in the path: there is one per user, implied by being logged in.
  @Get('thread')
  @ApiResponse({ status: 200, type: ResponseChatMessageDto, isArray: true })
  async getThread(@CurrentUser('userId') userId: string): Promise<ResponseChatMessageDto[]> {
    return await this.aiChatService.getThread(Number(userId));
  }

  // ---------- POST one question, answered on a held connection ----------
  // NDJSON, one JSON per line: `step` on every tool round, then `done` with the saved message
  // or `error` with a reason. No job and no polling - the state is the connection.
  @Post()
  @ApiResponse({
    status: 200,
    description: 'NDJSON stream, one JSON per line: {"type":"step"|"done"|"error", ...}',
  })
  async ask(@CurrentUser('userId') userId: string, @Body() dto: AskChatDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    // No buffering anywhere on the way: a progress line that arrives at the end is not progress.
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.flushHeaders();

    await this.aiChatService.ask(Number(userId), dto, (event) => writeEvent(res, event));

    if (!res.writableEnded) res.end();
  }
}

// A dead socket is not an error: the turn was paid for in tool rounds and is saved either way,
// so a write nobody can read is dropped rather than raised.
function writeEvent(res: Response, event: ChatStreamEvent): void {
  if (res.writableEnded || res.destroyed) return;

  res.write(`${JSON.stringify(event)}\n`, () => undefined);
}
