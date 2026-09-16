import { InternalServerErrorException } from '@nestjs/common';

// Web origin every handed-out link is built on (share links, the Verification Email). Read at
// call time so tests can set it; refused rather than guessed, since a link on an empty origin is worse than none.
export function publicAppOrigin(link: string): string {
  const origin = process.env.PUBLIC_APP_URL;
  if (origin === undefined || origin === '') {
    throw new InternalServerErrorException(`PUBLIC_APP_URL is not set, so no ${link} can be addressed`);
  }

  return origin.replace(/\/+$/, '');
}
