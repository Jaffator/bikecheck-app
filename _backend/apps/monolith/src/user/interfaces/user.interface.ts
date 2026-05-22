// ------ REPOSITORY LAYER types ------

export interface CreateUserData {
  name: string;
  email: string;
  googleId: string | null;
  password_hash: string | null;
  is_active: boolean;
  language: string | null;
  avatar_url: string | null;
  // last_login_at: Date | null;
  // currency: string | null;
  // weight_kg: number | null;
  // ride_style_id: number | null;
  // created_at - automatic from DB
  // updated_at - automatic from DB
}

export interface UpdateUserData {
  name?: string | undefined;
  language?: string | undefined;
  currency?: string | undefined;
  weight_kg?: number | undefined;
  ride_style_id?: number | undefined;
  avatar_url?: string | undefined;
  // updated_at - automatic from DB
}
