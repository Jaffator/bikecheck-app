import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Resend } from 'resend';
import { users as UserFull } from '@prisma/client';
import { buildVerificationMail, buildWelcomeMail, MailText } from './mail-texts';

// What an email needs from the row: where to send it, whom to greet, in which language.
export type MailRecipient = Pick<UserFull, 'id' | 'email' | 'name' | 'language'>;

// Named in the log when a send fails, so the failure says which email did not arrive.
type MailKind = 'verification' | 'welcome';

// The email channel (ADR 0031). Resend behind two named methods; nothing outside this
// service knows the provider. Mirrors push without Firebase: with no API key it warns once
// at startup and every send is a no-op, and a provider failure is logged and swallowed -
// the row is already written and "send it again" is the recovery, never a 500.
@Injectable()
export class MailService implements OnModuleInit {
  private client: Resend | null = null;
  private from = '';

  constructor(@InjectPinoLogger(MailService.name) private readonly logger: PinoLogger) {}

  onModuleInit(): void {
    const apiKey = process.env.RESEND_API_KEY;
    console.log(apiKey);
    const from = process.env.MAIL_FROM;
    if (!apiKey || !from) {
      this.logger.warn({ custom: true }, 'RESEND_API_KEY or MAIL_FROM not set; email disabled');
      return;
    }

    this.client = new Resend(apiKey);
    this.from = from;
  }

  // The one email an Unverified Account receives: the link that verifies the address.
  async sendVerificationEmail(user: MailRecipient, link: string): Promise<void> {
    // So a registration can be finished locally without a mailbox.
    if (process.env.NODE_ENV === 'development') {
      this.logger.info({ custom: true, userId: user.id, link }, 'Verification link');
    }

    await this.send(user, 'verification', buildVerificationMail(user.language, link));
  }

  // Sent the moment an account becomes usable; never to an Unverified Account.
  async sendWelcomeEmail(user: MailRecipient): Promise<void> {
    await this.send(user, 'welcome', buildWelcomeMail(user.language, user.name));
  }

  // ---- Private methods ----

  // The SDK answers a provider refusal as { error } and a transport failure as a throw;
  // both end here, in the log, with who and what.
  private async send(user: MailRecipient, kind: MailKind, mail: MailText): Promise<void> {
    console.log(this.client?.apiKeys);
    if (this.client === null) return;

    try {
      const { error } = await this.client.emails.send({
        from: this.from,
        to: user.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      if (error) {
        this.logger.error({ custom: true, userId: user.id, kind, reason: error.message }, 'Email not sent');
        return;
      }
      this.logger.info({ custom: true, userId: user.id, kind }, 'Email sent');
    } catch (error) {
      this.logger.error({ custom: true, userId: user.id, kind, err: error }, 'Email not sent');
    }
  }
}
