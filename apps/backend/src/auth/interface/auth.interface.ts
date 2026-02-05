// auth.interface.ts is normal types or interfaces used in auth module

import { users } from 'generated/prisma/client';
import { Request } from 'express';

export type SafeUserType = Omit<users, 'password_hash'>;
