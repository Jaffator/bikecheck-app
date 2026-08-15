// Shared fetch wrapper for the whole app. This is the ONLY place that knows
// the base URL, attaches the auth token, and turns non-2xx responses into
// errors. Feature api files call this instead of using fetch directly.
import { Network } from "./network";
import { useOfflineWhenCallApiStore } from "../store/store";
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

// Thrown for any non-2xx response so callers can inspect the status code.
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Endpoints whose own 401 means "bad credentials", not "expired access token".
// Refreshing on these would either loop forever (/auth/refresh) or hide a real
// login failure.
const NO_REFRESH_PATHS: string[] = ["/auth/refresh", "/auth/login", "/auth/register", "/auth/google/token"];

// In-flight refresh, shared by every caller. The backend rotates the refresh
// token, so two parallel refreshes would race and revoke each other's token —
// everyone waits on the same promise instead.
let refreshPromise: Promise<boolean> | null = null;

// Called when the refresh token is gone too. Set by App bootstrap so this
// module stays free of React Query imports.
let onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(handler: () => void): void {
  onSessionExpired = handler;
}

async function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async (): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      return response.ok;
    } catch {
      // Network failure, not an expired session — do not log the user out.
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function apiFetch<T>(path: string, options?: RequestInit, retried = false): Promise<T> {
  const { connected } = await Network.getStatus();
  let response: Response;

  if (!connected) {
    useOfflineWhenCallApiStore.getState().setOfflineWhenCallApi(true);
    throw new NetworkError();
  }

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new NetworkError();
  }

  // Access token expired: refresh once, then replay the original request. A
  // second 401 is a real authorization failure, so it is not retried again.
  if (response.status === 401 && !retried && !NO_REFRESH_PATHS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
    onSessionExpired?.();
  }

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export class NetworkError extends Error {
  constructor() {
    super("No internet connection");
    this.name = "NetworkError";
  }
}
