import type { CookieOptions } from 'express';

// The Android App's WebView origin: Capacitor's default androidScheme https and hostname localhost.
const NATIVE_APP_ORIGIN = 'https://localhost';

// The App calls the API cross-site, where a Lax cookie is neither sent nor stored; the web stays
// same-origin on Lax. Setting and clearing must both use this, or the browser keeps the cookie.
export function authCookieOptions(origin: string | undefined): CookieOptions {
  if (origin === NATIVE_APP_ORIGIN) {
    return { httpOnly: true, secure: true, sameSite: 'none', path: '/' };
  }
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
}
