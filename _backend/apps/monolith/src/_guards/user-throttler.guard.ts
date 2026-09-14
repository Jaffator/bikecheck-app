import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { JwtUser } from '../auth/decorators/current-user.decorator';

// The app's rate limit, counted per user wherever there is one. The default tracker is the
// remote address, and mobile users behind CGNAT share one - they would take each other's
// limit. A caller with no token still falls back to the address, which is all a public route
// has to go on.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as JwtUser | undefined;
    if (user?.userId !== undefined) return `user-${user.userId}`;

    return await super.getTracker(req);
  }
}
