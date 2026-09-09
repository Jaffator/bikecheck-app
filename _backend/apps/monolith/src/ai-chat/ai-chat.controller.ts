import { Body, Controller, Delete, Get, Post, Res } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiChatService } from './ai-chat.service';
import { AskChatDto } from './dto/ask-chat.dto';
import { ResponseChatDeletedDto } from './dto/response-chat-deleted.dto';
import { ResponseChatMessageDto } from './dto/response-chat-message.dto';
import type { ChatStreamEvent } from './ai-chat.types';

// How often a line is sent while the loop has nothing to say. Between two tool rounds the loop
// is quiet for a long time, so without a heartbeat the client cannot tell a dead connection from
// a model still thinking - and a phone that changes network never fails the read, it hangs it.
const KEEPALIVE_MS = 10_000;

// A pass-through, plus the two things the transport owes the loop: writing a line to a
// connection that may already be gone, and keeping that line audible. What an answer is made of
// is decided in AiChatService.
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

  // ---------- DELETE the thread of the logged-in user ----------
  // The same path as the GET, and the same reason there is no id in it.
  @Delete('thread')
  @ApiResponse({ status: 200, type: ResponseChatDeletedDto })
  async deleteThread(@CurrentUser('userId') userId: string): Promise<ResponseChatDeletedDto> {
    const count = await this.aiChatService.deleteThread(Number(userId));

    return { count };
  }

  // ---------- POST one question, answered on a held connection ----------
  // NDJSON, one JSON per line: `step` on every tool round, `ping` while a round runs, then
  // `done` with the saved message or `error` with a reason. No job and no polling - the state is
  // the connection.
  // Ten questions a minute, counted per user rather than per address - see
  // UserThrottlerGuard. The daily token budget is the cost limit; this is only the burst.
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiResponse({
    status: 200,
    description: 'NDJSON stream, one JSON per line: {"type":"step"|"ping"|"done"|"error", ...}',
  })
  async ask(@CurrentUser('userId') userId: string, @Body() dto: AskChatDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    // No buffering anywhere on the way: a progress line that arrives at the end is not progress.
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.flushHeaders();

    // Runs beside the loop rather than inside it: how often the line has to be heard from is a
    // property of the connection, which the loop knows nothing about.
    const keepalive = setInterval(() => writeEvent(res, { type: 'ping' }), KEEPALIVE_MS);
    try {
      await this.aiChatService.ask(Number(userId), dto, (event) => writeEvent(res, event));
    } finally {
      clearInterval(keepalive);
    }

    if (!res.writableEnded) res.end();
  }
}

// A dead socket is not an error: the turn was paid for in tool rounds and is saved either way,
// so a write nobody can read is dropped rather than raised.
function writeEvent(res: Response, event: ChatStreamEvent): void {
  if (res.writableEnded || res.destroyed) return;

  res.write(`${JSON.stringify(event)}\n`, () => undefined);
}
