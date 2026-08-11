// Web-only replacement for @capacitor/network. Same shape as the plugin
// (`const { connected } = await Network.getStatus()`), but it answers the
// question the plugin does not: is the internet actually reachable?
//
// navigator.onLine only reports whether a network interface is up, so it stays
// true when the router loses its uplink. Reaching a known-good public host is
// the only way to tell for sure.

export interface NetworkStatus {
  connected: boolean;
}

// Hosts that are always up and answer with a tiny body. More than one so a
// blocked or regionally unreachable host does not produce a false negative.
const PROBE_URLS: string[] = ["https://www.gstatic.com/generate_204", "https://cloudflare.com/cdn-cgi/trace"];

const PROBE_TIMEOUT_MS = 3000;

async function reachAny(urls: string[]): Promise<boolean> {
  // no-cors: these hosts send no CORS headers, so a normal request would fail
  // even when online. The response is opaque and unreadable, but that is fine —
  // resolving means the host was reached, rejecting means it was not.
  // The cache buster and no-store stop a single success from being replayed
  // from cache forever.
  const attempts = urls.map((url) =>
    fetch(`${url}?_=${Date.now()}`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
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
