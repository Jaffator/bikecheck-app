// Umami, cookieless. Loaded only when the build carries a website ID, so dev and local builds never count.
import { Capacitor } from "@capacitor/core";
import { routePattern } from "./analyticsRoutes";

// Only what the DB does not already count (bikes, services, Strava and AI chat stay out).
export type AnalyticsEvent = "auth-open" | "auth-google" | "share-profile";
export type AnalyticsData = Record<string, string>;

interface UmamiPayload {
  url: string;
  title: string;
  referrer: string;
  [key: string]: unknown;
}

interface Umami {
  track: (name: string, data?: AnalyticsData) => Promise<void>;
}

// The tracker looks its data-before-send hook up on window by this name.
const BEFORE_SEND = "bikecheckBeforeSend";

declare global {
  interface Window {
    umami?: Umami;
    [BEFORE_SEND]?: (type: string, payload: UmamiPayload) => UmamiPayload;
  }
}

// Events fired before the script arrived (the login screen opens at once); null while analytics is off.
let pending: [AnalyticsEvent, AnalyticsData | undefined][] | null = null;

// Native builds route in the hash (AppRouter), the web in the path.
function routeOf(url: string): string {
  const parsed = new URL(url, window.location.origin);
  const path = Capacitor.isNativePlatform() ? parsed.hash.slice(1).split("?")[0] : parsed.pathname;
  return routePattern(path || "/");
}

// Ids, handles, share tokens and profile names in the title never leave the device.
function scrub(_type: string, payload: UmamiPayload): UmamiPayload {
  const route = routeOf(payload.url);
  // The tracker strips our own origin, so an in-app referrer starts with "/".
  const referrer = payload.referrer.startsWith("/") ? routeOf(payload.referrer) : payload.referrer;
  return { ...payload, url: route, title: route, referrer };
}

export function loadAnalytics(): void {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL;
  // A half-set build env must not take the App down with it.
  if (!websiteId || !scriptUrl || !URL.canParse(scriptUrl)) return;

  pending = [];
  window[BEFORE_SEND] = scrub;
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.dataset.websiteId = websiteId;
  script.dataset.hostUrl = new URL(scriptUrl).origin;
  script.dataset.beforeSend = BEFORE_SEND;
  script.onload = (): void => pending?.splice(0).forEach(([name, data]) => trackEvent(name, data));
  document.head.appendChild(script);
}

export function trackEvent(name: AnalyticsEvent, data?: AnalyticsData): void {
  if (window.umami) {
    void window.umami.track(name, data);
    return;
  }
  pending?.push([name, data]);
}
