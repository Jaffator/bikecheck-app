import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type SendResponse } from 'firebase-admin/messaging';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PushService implements OnModuleInit {
  constructor(
    @InjectPinoLogger(PushService.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  // Initialize firebase-admin once, from a base64-encoded service account in env.
  onModuleInit(): void {
    if (getApps().length > 0) return;

    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!base64) {
      this.logger.warn({ custom: true }, 'FIREBASE_SERVICE_ACCOUNT_BASE64 not set; push notifications disabled');
      return;
    }

    const json = Buffer.from(base64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(json) as ServiceAccount;
    initializeApp({ credential: cert(serviceAccount) });
  }

  // Sends a push to every device of the user, then removes tokens FCM reports as dead.
  async sendToUser(userId: number, title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (getApps().length === 0) return;

    const devices = await this.prisma.device_tokens.findMany({ where: { user_id: userId } });
    if (devices.length === 0) return;

    const tokens = devices.map((device) => device.token);
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });

    const deadTokens = this.collectDeadTokens(tokens, response.responses);
    if (deadTokens.length > 0) {
      await this.prisma.device_tokens.deleteMany({ where: { token: { in: deadTokens } } });
      this.logger.info({ custom: true, count: deadTokens.length }, 'Removed dead device tokens');
    }
  }

  // Tokens FCM no longer accepts must be deleted so we stop targeting them.
  private collectDeadTokens(tokens: string[], responses: SendResponse[]): string[] {
    const deadTokens: string[] = [];
    responses.forEach((res, index) => {
      const code = res.error?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        deadTokens.push(tokens[index]);
      }
    });
    return deadTokens;
  }
}
