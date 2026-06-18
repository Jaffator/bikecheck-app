import dotenv from 'dotenv';
dotenv.config({ path: 'apps/monolith/.env' });

export const AUTH_CONFIG = {
  JWT_EXPIRATION: Number(process.env.JWT_EXPIRATION ?? 60 * 15),
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_EXPIRATION_DAYS: parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '14'),
} as const;
