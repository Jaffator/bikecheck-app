// Typed user endpoints use the shared API client.
import { apiFetch } from "@/api/client";
import type { User, LoginCredentials, RegisterCredentials, GoogleTokenCredentials, UpdateUserPayload } from "./users.types";

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

// Creates a user without establishing auth cookies.
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

// Sends a native Google ID token for backend verification and login.
export async function sendGoogleToken(credentials: GoogleTokenCredentials): Promise<User> {
  return apiFetch<User>("/auth/google/token", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
