// Web network probe matching the Capacitor Network API.

export interface NetworkStatus {
  connected: boolean;
}

// Multiple lightweight probe hosts reduce false offline results.
const PROBE_URLS: string[] = ["https://www.gstatic.com/generate_204", "https://cloudflare.com/cdn-cgi/trace"];

const PROBE_TIMEOUT_MS = 3000;

async function reachAny(urls: string[]): Promise<boolean> {
  // No-CORS probes only need to resolve; cache busting prevents stale success.
  const attempts = urls.map((url) =>
    fetch(`${url}?_=${Date.now()}`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    }),
  );

  try {
    await Promise.any(attempts);
    return true;
  } catch {
    return false;
  }
}

export async function getStatus(): Promise<NetworkStatus> {
  // A false here is trustworthy (no interface at all), so skip the network call.
  if (!navigator.onLine) {
    return { connected: false };
  }

  return { connected: await reachAny(PROBE_URLS) };
}

// Namespace object so call sites read the same as the Capacitor plugin.
export const Network = { getStatus };
