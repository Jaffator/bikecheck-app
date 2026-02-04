// auth.interface.ts is normal types or interfaces used in auth module

import { users } from 'generated/prisma/client';
import { Request } from 'express';

export type SafeUserType = Omit<users, 'password_hash'>;

export interface AuthenticatedRequest extends Request {
  user: SafeUserType;
}

export function toSafeUser(user: users): SafeUserType {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}
