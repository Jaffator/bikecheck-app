// Typed user endpoints use the shared API client.
import { apiFetch } from "@/api/client";
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  RegisterResponse,
  ResendVerificationPayload,
  VerifyEmailPayload,
  VerifyEmailResponse,
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

// POST /auth/login — sets the auth cookies and returns the logged-in user. 401 for a wrong
// password; 403 EMAIL_NOT_VERIFIED for the right one on an account whose address is not
// yet verified.
export async function loginUser(credentials: LoginCredentials): Promise<User> {
  return apiFetch<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// POST /auth/register — writes a placeholder and sends the Verification Email. No cookies:
// the account cannot sign in until the link in that email is used. 409 when the address
// belongs to a verified account.
export async function registerUser(credentials: RegisterCredentials): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// POST /auth/verification/resend — sends the Verification Email again when the address
// belongs to an account not yet verified. 204 in every case, known address or not, so the
// answer says nothing about who has an account.
export async function resendVerificationEmail(payload: ResendVerificationPayload): Promise<void> {
  return apiFetch<void>("/auth/verification/resend", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// POST /auth/verification/verify — verifies the address the token names. No cookies: the
// token proves an address, not a password, and the rider signs in afterwards. 400
// VERIFICATION_TOKEN_INVALID for an expired, forged or stale link; a link used twice
// answers 200 both times.
export async function verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
  return apiFetch<VerifyEmailResponse>("/auth/verification/verify", {
    method: "POST",
    body: JSON.stringify(payload),
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

// POST /auth/google/token — sends a native Google ID token for backend verification and
// login. A 2xx is a session. 403 EMAIL_NOT_VERIFIED, no cookies, when the address is not
// yet verified (the Verification Email is on its way); 409 GOOGLE_EMAIL_UNVERIFIED when an
// address Google does not vouch for meets a verified password account.
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
