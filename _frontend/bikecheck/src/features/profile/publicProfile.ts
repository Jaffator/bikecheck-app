// The web page's addresses, and where it sends a reader who has no app.

// The listing, not a custom scheme: Play shows Open with the app installed, Install without.
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.bikecheck.app";

// Both keep the handle as the reader typed it, so garage and bike share one query cache.
export function publicGaragePath(handle: string): string {
  return `/u/${handle}`;
}

export function publicBikePath(handle: string, bikeId: number): string {
  return `/u/${handle}/${String(bikeId)}`;
}

// "Jarda Novák" -> "JN"; the handle's first letter for an account without a name.
export function initialsOf(name: string | null, handle: string): string {
  const source = name?.trim() || handle;
  return source
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
