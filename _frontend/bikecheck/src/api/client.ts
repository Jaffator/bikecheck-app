// Shared fetch wrapper centralizes URLs, credentials, and non-2xx errors.
import { Network } from "./network";
import { useOfflineWhenCallApiStore } from "../store/store";
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

// Thrown for any non-2xx response so callers can inspect the status code.
export class ApiError extends Error {
  readonly status: number;
  // Server-provided validation messages.
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(details.length > 0 ? `${message} — ${details.join("; ")}` : message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Nest puts the reason in "message", either as a string or one entry per field.
function extractErrorDetails(body: unknown): string[] {
  if (typeof body !== "object" || body === null) return [];
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string") return [message];
  if (Array.isArray(message)) return message.map((entry) => String(entry));
  return [];
}

// Auth endpoints whose 401 responses must not trigger token refresh.
const NO_REFRESH_PATHS: string[] = ["/auth/refresh", "/auth/login", "/auth/register", "/auth/google/token"];

// Shared in-flight refresh prevents competing rotated-token requests.
let refreshPromise: Promise<boolean> | null = null;

// App bootstrap sets this when refresh failure must end the session.
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

  // FormData requires the browser-generated multipart Content-Type.
  const isFormData = options?.body instanceof FormData;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...options?.headers,
      },
    });
  } catch {
    throw new NetworkError();
  }

  // Refresh expired access tokens once before replaying the request.
  if (response.status === 401 && !retried && !NO_REFRESH_PATHS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
    onSessionExpired?.();
  }

  if (!response.ok) {
    // Read JSON error details when available.
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      `API request failed: ${response.status} ${response.statusText}`,
      extractErrorDetails(body),
    );
  }

  return (await response.json()) as T;
}

export class NetworkError extends Error {
  constructor() {
    super("No internet connection");
    this.name = "NetworkError";
  }
}
