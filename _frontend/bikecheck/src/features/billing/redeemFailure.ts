import { ApiError } from "@/api/client";

const TOO_MANY_REQUESTS = 429;

// The translation key of why the server refused what was entered.
export function redeemFailureText(error: Error): string {
  if (!(error instanceof ApiError)) return "billing.keyFailed";
  if (error.details.includes("KEY_NOT_VALID")) return "billing.keyNotValid";
  if (error.details.includes("KEY_USED_UP")) return "billing.keyUsedUp";
  if (error.status === TOO_MANY_REQUESTS) return "billing.keyTooMany";
  return "billing.keyFailed";
}
