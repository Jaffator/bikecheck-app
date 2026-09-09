import { Controller, DefaultValuePipe, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Throwaway probe for #76: does a held chunked response reach the Capacitor WebView line
// by line, or only once the body ends? Not part of the app - it dies with this branch.
@Controller('probe')
export class ProbeController {
  // Deliberately open. A success here with a failure below means the session cookie is
  // the problem, not the transport - which is the confusion this ticket has to avoid.
  @Public()
  @Post('stream')
  async stream(
    @Res() res: Response,
    @Query('seconds', new DefaultValuePipe(90), ParseIntPipe) seconds: number,
  ): Promise<void> {
    await dribble(res, seconds, null);
  }

  // The same stream behind the guard every other endpoint sits behind.
  @Post('stream-auth')
  async streamAuth(
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
    @Query('seconds', new DefaultValuePipe(90), ParseIntPipe) seconds: number,
  ): Promise<void> {
    await dribble(res, seconds, Number(userId));
  }
}

// One NDJSON line every 500 ms, each carrying how long the server has been writing. The
// client compares that against its own arrival times: matching gaps mean the chunks came
// through as they were written, one burst at the end means something buffered the body.
async function dribble(res: Response, seconds: number, userId: number | null): Promise<void> {
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  // nginx buffers proxied responses by default, which would hide the answer behind the proxy.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // A client that hangs up stops the writing; without this the loop runs to the end.
  let aborted = false;
  res.on('close', () => {
    aborted = true;
  });

  const startedAt = Date.now();
  const total = seconds * 2;

  for (let i = 1; i <= total; i += 1) {
    await sleep(500);
    if (aborted) return;
    res.write(`${JSON.stringify({ i, total, elapsed_ms: Date.now() - startedAt, user_id: userId })}\n`);
  }

  res.end(`${JSON.stringify({ done: true, elapsed_ms: Date.now() - startedAt })}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
