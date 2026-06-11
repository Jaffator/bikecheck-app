import { Controller, ForbiddenException, Get, HttpCode, Post, Query, Req, RawBody } from '@nestjs/common';
import type { Request } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaWebhookService } from './strava-webhook.service';
import { StravaWebhookEventDto } from './dto/strava-webhook-event.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('strava')
export class WebhookController {
  constructor(
    @InjectPinoLogger(WebhookController.name) private readonly logger: PinoLogger,
    @InjectQueue('strava-webhook-queue') private readonly webhookQueue: Queue,
    private readonly stravaWebhookService: StravaWebhookService,
  ) {}

  // ------------------------------------------------------------
  // ---------- Handle incoming webhook events from Strava ------
  // ------------------------------------------------------------
  @Post('/webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @RawBody() rawBody: Buffer): Promise<string> {
    if (!this.stravaWebhookService.verifySignature(req, rawBody)) {
      this.logger.error('Invalid signature on webhook event');
      throw new ForbiddenException('Invalid signature');
    }

    this.logger.info({ custom: true }, 'Successfully received Strava event');

    // Add the event to the BullMQ queue for processing
    await this.webhookQueue.add('process-strava-event', req.body as StravaWebhookEventDto);

    // response under 2sec with OK HTTP 200 to avoid retries from Strava
    // event is in Redis queue
    return 'EVENT_RECEIVED';
  }
  @Get()
  test(): string {
    return 'Strava Microservice is online';
  }

  // ----------------------------------------------------------
  // ---------- Only for subscrription of Strava webhook ------
  // ----------------------------------------------------------
  @Get('/webhook')
  verifyWebhook(
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.mode') mode: string,
  ): { 'hub.challenge': string } {
    return this.stravaWebhookService.verifyChallenge(mode, token, challenge);
  }
}

// {"id":346298} strava subscription id, use to delete subscription if needed
// ngrok url: https://syrup-latch-certainty.ngrok-free.dev/

// ---------------------------------------------
//-------------DELETE SUBSCRIPTION -------------
// ---------------------------------------------
// curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/346258?client_id=235898&client_secret=3c70e23b491afd63f6a5add7a724858ace130b90"

// ---------------------------------------------
// -------------CREATE SUBSCRIPTION-------------
// ---------------------------------------------
// curl -X POST \
//   https://www.strava.com/api/v3/push_subscriptions \
//   -F client_id=235898 \
//   -F client_secret=3c70e23b491afd63f6a5add7a724858ace130b90 \
//   -F callback_url=https://syrup-latch-certainty.ngrok-free.dev/strava/webhook \
//   -F verify_token=STRAVA

// ---------------------------------------------
// 1. Authorize url:
// ---------------------------------------------
// http://www.strava.com/oauth/authorize?client_id=235898&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=activity:read_all

// ---------------------------------------------
// 2. GET this url after authorization to exchange code for access token
// ---------------------------------------------
// GET https://www.strava.com/oauth/token?client_id=235898&client_secret=266e76f34e4608992e69bff363a2fb1124ad8e0e&code=266e76f34e4608992e69bff363a2fb1124ad8e0e&grant_type=authorization_code

// ---------------------------------------------
// Example of incoming webhook event from Strava
// ---------------------------------------------
// {
//     "aspect_type": "update",
//     "event_time": 1516126040,
//     "object_id": 1360128428,
//     "object_type": "activity",
//     "owner_id": 134815,
//     "subscription_id": 120475,
//     "updates": {
//         "title": "Messy"
//     }
// }

// curl -X POST http://localhost:3002/strava/webhook \
//   -H "Content-Type: application/json" \
//     -H "x-strava-signature: t=$(date +%s),v1=fakesignature" \
//       -d '{
//           "aspect_type": "update",
//               "event_time": 1516126040,
//                   "object_id": 18658538174,
//                       "object_type": "activity",
//                           "owner_id": 20678962,
//                               "subscription_id": 120475,
//                                   "updates": {
//                                         "title": "Messy"
//                                             }
//                                               }'
