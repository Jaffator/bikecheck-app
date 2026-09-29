// Mirrors the backend's SYNC_COOLDOWN_MS; the backend enforces it, the client only explains it.
export const SYNC_COOLDOWN_MIN = 5;

const MINUTE_MS = 60 * 1000;

// Whole minutes until the next sync is allowed, rounded up; 0 when it is allowed now.
export function syncCooldownLeftMin(lastSyncAt: string | null, now: number): number {
  if (lastSyncAt === null) return 0;
  const leftMs = new Date(lastSyncAt).getTime() + SYNC_COOLDOWN_MIN * MINUTE_MS - now;
  return leftMs > 0 ? Math.ceil(leftMs / MINUTE_MS) : 0;
}
