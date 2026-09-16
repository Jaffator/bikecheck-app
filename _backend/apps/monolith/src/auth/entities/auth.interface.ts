// auth.interface.ts is normal types or interfaces used in auth module

import { users } from '@prisma/client';
import { Request } from 'express';

export type SafeUserType = Omit<users, 'password_hash'>;

// What an access token carries. `purpose` is never set on one; it is what a verification
// token carries instead, and the JWT strategy refuses any payload that has it.
export interface AccessTokenPayload {
  sub: number;
  email: string;
  purpose?: string;
}

// The link in a Verification Email, as a signed JWT (ADR 0031): the purpose tells it apart
// from an access token, the address is checked against the row when it is used.
export interface VerificationTokenPayload {
  purpose: 'email_verification';
  sub: number;
  email: string;
}
