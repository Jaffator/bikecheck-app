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
}

export interface GoogleTokenCredentials {
  idToken: string;
}

// Mirrors the backend UserResponseDto (user/dto/user.dtos.ts).
// Dates arrive as ISO strings over JSON, so they are typed as string here.
export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  language: string | null;
  currency: string | null;
  weight_kg: number | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}
