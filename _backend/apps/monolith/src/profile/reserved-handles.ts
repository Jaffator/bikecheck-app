// Handles nobody may take: words that would impersonate the app, and every top-level route
// of the web app, so /u/<handle> can never shadow a page (PRD #131). Mirrored in the
// frontend's handle.ts for inline hints; this list is the authority.
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Brand and impersonation
  'admin',
  'bikecheck',
  'support',
  'help',
  'official',
  'staff',
  'moderator',
  'api',
  'system',
  'root',
  // The web garage's API prefix, /profiles/public/:handle
  'public',
  // Top-level routes (App.tsx)
  'bikes',
  'settings',
  'profile',
  'chat',
  'rides',
  'service',
  'reports',
  'notifications',
  'legal',
  'login',
  'verify-email',
  'strava-connected',
  'follows',
  'users',
  'r',
  'u',
]);
