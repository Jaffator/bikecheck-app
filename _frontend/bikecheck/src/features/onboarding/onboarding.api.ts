import { apiFetch } from "@/api/client";
import type { User } from "@/features/users/users.types";

// POST /users/me/welcome-seen: stamped on the server, a repeat call keeps the first stamp.
export async function markWelcomeSeen(): Promise<User> {
  return apiFetch<User>("/users/me/welcome-seen", { method: "POST" });
}
