import { matchPath } from "react-router-dom";

// Every route App.tsx draws, in match order: /bikes/new must beat /bikes/:id.
const ROUTE_PATTERNS: readonly string[] = [
  "/r/:token",
  "/u/:handle",
  "/u/:handle/:bikeId",
  "/legal/:document",
  "/verify-email",
  "/",
  "/bikes",
  "/bikes/new",
  "/bikes/:id",
  "/bikes/:id/edit",
  "/bikes/:id/setup",
  "/bikes/:id/history",
  "/reports",
  "/follows",
  "/service",
  "/service/new",
  "/service/history",
  "/rides",
  "/chat",
  "/profile",
  "/settings",
  "/notifications",
  "/users/:handle",
  "/users/:handle/:bikeId",
  "/strava-connected",
];

// An unknown path may still carry an id, so all of them share one bucket.
const UNKNOWN_ROUTE = "/unknown";

// The route pattern a path matches, so no id, handle or token reaches analytics.
export function routePattern(pathname: string): string {
  return ROUTE_PATTERNS.find((pattern) => matchPath(pattern, pathname) !== null) ?? UNKNOWN_ROUTE;
}
