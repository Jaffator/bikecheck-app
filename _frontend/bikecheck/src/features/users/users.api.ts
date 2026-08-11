// Knows which endpoint to call and what type comes back. Uses the shared
// apiFetch client — no fetch, base URL or token handling lives here.
// Backend route is under "/auth" (see auth.controller.ts).
import { apiFetch } from "@/api/client";
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  GoogleTokenCredentials,
  UpdateUserPayload,
} from "./users.types";

// GET /auth/me — the currently logged-in user (401 if not authenticated).
export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

// POST /auth/logout — logs out the currently logged-in user.
export async function logoutUser(): Promise<void> {
  return apiFetch<void>("/auth/logout", {
    method: "POST",
  });
}

// POST /auth/login — sets the auth cookies and returns the logged-in user.
export async function loginUser(credentials: LoginCredentials): Promise<User> {
  return apiFetch<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// POST /auth/register — creates the user and returns it. Note: it does NOT
// set the auth cookies, so the caller still has to log in afterwards.
export async function registerUser(credentials: RegisterCredentials): Promise<User> {
  return apiFetch<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// PATCH /users/:id — the backend only allows patching your own profile.
export async function updateUser(id: number, data: UpdateUserPayload): Promise<User> {
  return apiFetch<User>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// POST /auth/google/token — when google sign-in is done natively, the app gets an ID token from Google and sends it to the backend. The backend verifies it and returns the logged-in user.
// set the auth cookies, so the caller still has to log in afterwards.
export async function sendGoogleToken(credentials: GoogleTokenCredentials): Promise<User> {
  return apiFetch<User>("/auth/google/token", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
