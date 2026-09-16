import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

// The email channel. Imported by auth today; the notification processor's email channel
// will import the same module when it is wired.
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
