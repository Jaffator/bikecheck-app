// The handle rule mirrored for hints as the owner types. The server's reason code is the
// authority: a drifted mirror costs a wrong hint, never a wrong save.
import { ApiError } from "@/api/client";
import { HANDLE_ERROR_CODES, type HandleErrorCode } from "./profile.types";

const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 30;
const HANDLE_CHARS = /^[a-z0-9_-]+$/;
const HANDLE_START = /^[a-z0-9]/;

// Mirrors the backend's reserved-handles.ts: brand words and every top-level route.
const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin",
  "bikecheck",
  "support",
  "help",
  "official",
  "staff",
  "moderator",
  "api",
  "system",
  "root",
  "bikes",
  "settings",
  "profile",
  "chat",
  "rides",
  "service",
  "reports",
  "notifications",
  "legal",
  "login",
  "verify-email",
  "strava-connected",
  "follows",
  "users",
  "r",
  "u",
]);

// What the field says under itself for each refusal.
export const HANDLE_ERROR_KEY: Record<HandleErrorCode, string> = {
  HANDLE_TOO_SHORT: "sharing.handleTooShort",
  HANDLE_TOO_LONG: "sharing.handleTooLong",
  HANDLE_INVALID_CHARS: "sharing.handleInvalidChars",
  HANDLE_LEADING_DASH: "sharing.handleLeadingDash",
  HANDLE_RESERVED: "sharing.handleReserved",
  HANDLE_TAKEN: "sharing.handleTaken",
};

// The field lowercases as it goes, so what the owner sees is what will be stored.
export function normalizeHandle(raw: string): string {
  return raw.toLowerCase();
}

// Why the typed handle would be refused, or null when it passes the local rule.
export function handleError(handle: string): HandleErrorCode | null {
  if (handle.length < HANDLE_MIN_LENGTH) return "HANDLE_TOO_SHORT";
  if (handle.length > HANDLE_MAX_LENGTH) return "HANDLE_TOO_LONG";
  if (!HANDLE_CHARS.test(handle)) return "HANDLE_INVALID_CHARS";
  if (!HANDLE_START.test(handle)) return "HANDLE_LEADING_DASH";
  if (RESERVED_HANDLES.has(handle)) return "HANDLE_RESERVED";
  return null;
}

// The reason a save was refused for the handle, when that is what the server said.
export function handleErrorFromApi(error: unknown): HandleErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  return HANDLE_ERROR_CODES.find((code) => error.details.includes(code)) ?? null;
}

export function profileUrl(origin: string, handle: string): string {
  return `${origin}/u/${handle}`;
}
