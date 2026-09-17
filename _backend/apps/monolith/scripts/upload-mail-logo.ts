// Puts the email logo into R2 under a fixed key, so mails can link it from a public origin.
// Run once (`npm run mail:logo`) and again whenever the PNG changes.
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { StorageService } from '../src/storage/storage.service';
import { MAIL_LOGO_KEY } from '../src/mail/mail-layout';

config({ path: join(__dirname, '../.env') });

const LOGO_PATH = resolve(__dirname, '../../../../_frontend/bikecheck/public/logo-mail.png');

async function main(): Promise<void> {
  const storage = new StorageService();
  const url = await storage.uploadFileR2CloudFare(readFileSync(LOGO_PATH), MAIL_LOGO_KEY, 'static');
  console.log(`Uploaded: ${url}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
