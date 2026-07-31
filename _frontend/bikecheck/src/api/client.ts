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

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { connected } = await Network.getStatus();
  console.log(connected);
  let response: Response;

  if (!connected) {
    console.log("No internet connection. Setting offlineWhenCallApi to true.");
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
