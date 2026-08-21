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

// Mirrors UpdateUserDto; the backend ignores undefined fields.
export interface UpdateUserPayload {
  name?: string;
  language?: string;
  currency?: string;
  weight_kg?: number;
  avatar_url?: string;
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
