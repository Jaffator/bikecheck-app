import dotenv from 'dotenv';
dotenv.config({ path: 'apps/monolith/.env' });

export const AUTH_CONFIG = {
  JWT_EXPIRATION: Number(
    process.env.NODE_ENV === 'development'
      ? (process.env.JWT_EXPIRATION_DEV ?? 60 * 15) // 15 minutes
      : (process.env.JWT_EXPIRATION_PROD ?? 60 * 1440), // 1 day
  ),
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_EXPIRATION_DAYS: parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '365'),
  // How close to expiry a refresh token has to be before it gets rotated.
  // 30 days against a 1 year expiry, so an active user is never caught out.
  REFRESH_TOKEN_ROTATION_THRESHOLD_HOURS: 30 * 24,
} as const;
