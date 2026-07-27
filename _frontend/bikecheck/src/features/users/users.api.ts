// Knows which endpoint to call and what type comes back. Uses the shared
// apiFetch client — no fetch, base URL or token handling lives here.
// Backend route is under "/auth" (see auth.controller.ts).
import { apiFetch } from "@/api/client";
import type { User, LoginCredentials } from "./users.types";

// GET /auth/me — the currently logged-in user (401 if not authenticated).
export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

// POST /auth/login — sets the auth cookies and returns the logged-in user.
export async function loginUser(credentials: LoginCredentials): Promise<User> {
  return apiFetch<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
