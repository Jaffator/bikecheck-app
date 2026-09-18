// PROTOTYPE #121 — throwaway. The handle rules from #114, enough for inline validation.
import type { User } from "@/features/users/users.types";

const HANDLE_PATTERN = /^[a-z0-9_-]{3,30}$/;

// Brand words and the app's own routes (#114).
const RESERVED = new Set([
  "bikecheck",
  "admin",
  "api",
  "app",
  "support",
  "bikes",
  "service",
  "rides",
  "chat",
  "settings",
  "notifications",
  "reports",
  "legal",
  "login",
  "profile",
  "r",
  "u",
]);

export function handleError(handle: string): string | null {
  if (handle.length < 3) return "Aspoň 3 znaky";
  if (handle.length > 30) return "Nejvíc 30 znaků";
  if (!HANDLE_PATTERN.test(handle)) return "Jen a–z, 0–9, pomlčka a podtržítko";
  if (RESERVED.has(handle)) return "Tohle jméno je rezervované";
  return null;
}

// Strava username first, then the name slugged (#114).
export function suggestHandle(user: User | null): string {
  const source = user?.strava_username ?? user?.name ?? "jarda";
  const slug = source
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length >= 3 ? slug : "rider";
}

export function profileUrl(handle: string): string {
  return `https://bikecheck.app/u/${handle}`;
}

export function profileHost(): string {
  return "bikecheck.app";
}
