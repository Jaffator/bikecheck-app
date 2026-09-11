// Typed user endpoints use the shared API client.
import { apiFetch } from "@/api/client";
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  GoogleTokenCredentials,
  UpdateUserPayload,
  ChangePasswordPayload,
  AccountDeletionSummary,
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

// POST /auth/change-password — 401 when the current password is wrong, 400 when the
// account has no password at all. The session it is sent from stays signed in; every other
// device of the same user is logged out.
export async function changePassword(data: ChangePasswordPayload): Promise<void> {
  return apiFetch<void>("/auth/change-password", {
    method: "POST",
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

// GET /users/me/deletion-summary — the counts the delete dialog names. Read when the sheet
// opens, not before: nothing else on the profile needs them.
export async function getAccountDeletionSummary(): Promise<AccountDeletionSummary> {
  return apiFetch<AccountDeletionSummary>("/users/me/deletion-summary");
}

// DELETE /users/me — destroys the account and everything belonging to it. The typed email
// guards the dialog only; the server knows whose session this is (ADR 0028). The response
// clears the auth cookies, so the session is over the moment it returns.
export async function deleteAccount(): Promise<void> {
  await apiFetch<{ message: string }>("/users/me", { method: "DELETE" });
}
