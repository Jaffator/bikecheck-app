import { ArgumentsHost, Catch, ExceptionFilter, Logger, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';

// The query flags a refused web Google sign-in carries back to the login page (ADR 0031).
// The frontend reads the same names: the address of an Unverified Account, for the inbox
// state, or the error code to show under the Google button.
export const GOOGLE_EMAIL_NOT_VERIFIED_PARAM = 'emailNotVerified';
export const GOOGLE_ERROR_PARAM = 'googleError';
export const GOOGLE_SIGN_IN_FAILED = 'GOOGLE_SIGN_IN_FAILED';

// The callback runs mid-redirect, so a JSON error would strand the browser on it.
// A cancel (passport's 401) returns to the login page quietly; anything else carries the flag.
@Catch()
export class GoogleCallbackFilter implements ExceptionFilter {
  private readonly logger = new Logger(GoogleCallbackFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const url = new URL(process.env.FRONTEND_URL!);
    if (!(exception instanceof UnauthorizedException)) {
      this.logger.error(exception);
      url.searchParams.set(GOOGLE_ERROR_PARAM, GOOGLE_SIGN_IN_FAILED);
    }
    host.switchToHttp().getResponse<Response>().redirect(url.toString());
  }
}
