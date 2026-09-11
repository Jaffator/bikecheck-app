// Mirrors the backend LoginDto (auth/dto/auth.dtos.ts).
export interface LoginCredentials {
  email: string;
  password: string;
}

// Mirrors the backend CreateUserDto (user/dto/user.dtos.ts).
export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  language: string;
}

export interface GoogleTokenCredentials {
  idToken: string;
}

// Mirrors the backend ChangePasswordDto (auth/dto/auth.dtos.ts).
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// Mirrors UpdateUserDto; the backend ignores undefined fields.
export interface UpdateUserPayload {
  name?: string;
  language?: string;
  currency?: string;
  weight_kg?: number;
  avatar_url?: string;
  notifications_enabled?: boolean;
}

// Mirrors UserResponseDto with JSON dates represented as ISO strings.
export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  language: string | null;
  currency: string | null;
  weight_kg: number | null;
  is_active: boolean;
  // Whether a local password exists; false for a Google account, which has none to change.
  has_password: boolean;
  // Push only; null means never chosen, which the backend reads as on.
  notifications_enabled: boolean | null;
  // Set once the Strava OAuth flow completes. Null means not linked.
  strava_athlete_id: string | null;
  // Optional linked-athlete snapshot cleared when Strava disconnects.
  strava_firstname: string | null;
  strava_lastname: string | null;
  strava_username: string | null;
  strava_avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// Mirrors AccountDeletionSummaryDto. What the account still holds, read out by the delete
// dialog before the rider confirms.
export interface AccountDeletionSummary {
  bikes: number;
  rides: number;
  services: number;
  // Published, unrevoked Share Links - the ones that stop answering the moment the account
  // is gone.
  publicReports: number;
}
