# Going live on Hetzner

*Research note, 2026-10-04. Branch `feat/sheet-motion` @ `477f906`. External sources fetched 2026-10-04.*
*Builds on [`hosting.md`](hosting.md), which chose the provider (Hetzner CX23, docker compose, Caddy on `bikecheck.cloud`). That choice is not revisited here.*
*Two parts follow the checklist. **Part A** covers auth: Google sign-in, Strava, and sessions on web vs Android. **Part B** audits the prod files and gives the go-live runbook. A `§` reference points inside its own part. **[reasoning]** marks an inference, not a sourced fact.*

**What changed since hosting.md:** e-mail sending now exists (Resend, DNS already live). The schema is 83 migrations / 35 models, not 62 / 32. There is still no cron, because plan reminders are BullMQ delayed jobs.

---

## 0. The short version

### 0.1 Where each flow stands

| Flow | Desktop browser | Mobile browser | Android app (store build) |
|---|---|---|---|
| E-mail sign-up / login | works once deployed | works | ❌ **no session**: cross-site Lax cookies are dropped (A §4) |
| Google sign-in | ❌ callback hard-coded to `http://localhost:3000` (`google.strategy.ts:12`) | ❌ same | ⚠️ works in dev only. A store build needs an Android OAuth client with the Play signing SHA-1, plus the cookie fix |
| Strava connect (link) | ❌ dead-ends on `bikecheck://strava-connected` (`tokens.controller.ts:55`) | ❌ same | ✅ deep link works. Needs the cookie fix |
| Strava, any rider but you | ❌ the Strava app is in single-player mode: **capacity 1**, self-upgrade to 10, review beyond that | | |
| Register **with** Strava | ❌ does not exist. Strava gives no e-mail, and ADR 0031 requires a verified one (A §3.5) | | |

### 0.2 Blockers, most critical first

1. **The Android store build will keep no session, for any login method.** The app runs at `https://localhost` and calls `bikecheck.cloud`, which is cross-site, and the cookies are `SameSite=Lax`. Fix: `SameSite=None; Secure` for `Origin: https://localhost` only, plus strict `CORS_ORIGINS` (A §4.4).
2. **A fresh prod DB has no catalogue.** Migrations create no component types, actions, intervals or brands, and every seeder is commented out (B §4).
3. **Web Google login is hard-coded to `localhost:3000`**, and the monolith **crashes on boot** if `GOOGLE_CLIENT_ID` is blank, as it is in the example env (A §2.5, B §1).
4. **Without `trust proxy`, every anonymous user shares one rate-limit bucket behind Caddy.** That means login at 5/min for the whole world (B §2.5).
5. **Prod logs go nowhere** (Loki-only, pointed at itself), and `console.log` writes `RESEND_API_KEY` and `INTERNAL_API_SECRET` to stdout (B §1 item 3).
6. **The SPA build env is not committed**, so a CI build has `VITE_API_BASE_URL = undefined`. The APK needs an absolute URL (B §3).
7. **Strava connect dead-ends on desktop**, and nobody but you can connect until the app is upgraded (A §3.2–3.3).
8. **Every SPA redeploy breaks `/u/*`, `/r/*` and the Report PDF** until the monolith restarts, because the preview `index.html` is cached forever (B §1 item 6).
9. **The repo is public**, with the Strava client secret at HEAD (`subscription-url.md:4`) and DB dumps holding real e-mails. Rotate the secret and remove the dumps.
10. **No backups, no CI, DNS still at Forpsi**, and `www` is missing from the Caddyfile.

### 0.3 Your decisions (nothing below is decided)

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| D1 | How the catalogue reaches prod: a one-off SQL load or a data migration | Data migration (ADR 0019's spirit), exported from the dev DB | The dev DB has drifted from `seed_data.json`, so the dev DB is the real source |
| D2 | R2 public URL: keep `r2.dev`, or move DNS to Cloudflare for `files.bikecheck.cloud` | Decide **before the first prod upload** | Full URLs are stored in the DB. `r2.dev` is rate-limited and meant for dev only |
| D3 | Build "Sign in with Strava"? | Not for launch: Google + e-mail are the ways in, Strava stays a link | Capped at 10 athletes until Strava reviews the app. Needs an ADR, a nullable state user and an e-mail screen |
| D4 | Rewrite git history (public repo, secret, dumps)? | At least rotate the secret and `git rm` the dumps. A rewrite is your call | Anything in history is already public |
| D5 | Logs: plain `docker logs` or Grafana Cloud | `docker logs` + rotation for month one | Grafana Cloud needs a basic-auth code change |
| D6 | Ship the Android app at the same time? | Web first, Android on Play's closed test in parallel | New personal Play accounts need 12 testers × 14 days before production |

### 0.4 Master checklist

Ordered. Tags: **[code]** repo change, **[console]** web consoles, **[server]** VPS shell, **[dns]** Forpsi.

**Phase 1: code, before any server**
1. [code] Delete the secret-leaking `console.log`s: `mail.service.ts:26,57`, `strava.service.ts:177-178`, `storage.service.ts:85-86`.
2. [code] `app.set('trust proxy', 'loopback, uniquelocal')` in the monolith `main.ts`.
3. [code] Google: callback from `GOOGLE_CALLBACK_URL`. A cancel or error goes back to `FRONTEND_URL?googleError=…` instead of a JSON 401.
4. [code] Cookies: `SameSite=None; Secure` when `Origin === 'https://localhost'`, in both set and clear (5 call sites).
5. [code] Strava: store `return_to` (`web`|`native`) in `oauth_states`, so web goes back to `${FRONTEND_URL}/strava-connected` in the same tab. Also handle `error=access_denied` and check the granted `scope`.
6. [code] Strava: handle the athlete deauth webhook event, switch to `POST /oauth/revoke` (`/deauthorize` dies on 2027-06-01), and drop `activity:write` + `read_all`.
7. [code] A prod stdout pino target. `enableShutdownHooks()` in both apps. `exec node` + `init: true` in compose.
8. [code] Caddyfile: a `www` redirect, an access `log`, and a 404 for a missing `/assets/*`. Compose: `image:` tags.
9. [code] Frontend: commit `.env.web` (`/api`) and `.env.android` (`https://bikecheck.cloud/api`), and build with `--mode`. The name `.env.production` is git-ignored. Remove `server.url` from `capacitor.config.ts`.
10. [code] Preview shell: invalidate the `index.html` cache on mtime, or restart the monolith on every SPA deploy.
11. [code] Catalogue delivery (D1).
12. [code] Repo hygiene: `git rm` the 3 dumps, scrub `subscription-url.md`, extend `.dockerignore`.
13. [code] Public pages: a logged-out `/` that describes the app and links privacy + terms (Google brand verification), and `/legal/delete-account` (Play requirement).
14. [code] Privacy policy: add Resend and CARTO, the backup retention, and the R2 orphans gap (ADR 0025 is unbuilt). Restore the CARTO/OSM attribution (`RideMapLeaflet.tsx:43`).
15. [code] Official "Connect with Strava" button and "Powered by Strava" attribution.
16. [code] **Local dry run:** prod compose with `PUBLIC_HOST=localhost`, migrations on an empty PG18, catalogue loaded, then register, add a bike, and log a service.

**Phase 2: consoles**

17. [console] Google Web client: add redirect URIs `https://bikecheck.cloud/api/auth/google/callback` and `http://localhost:5173/api/auth/google/callback`.
18. [console] Google Auth Platform: branding (home, privacy, terms, authorized domain), Search Console verification of `bikecheck.cloud`, publish **In production**, then brand verification.
19. [console] Strava: rotate the secret, set the callback domain to `bikecheck.cloud`, and upgrade capacity to 10. Create a **separate dev app**, because each app has one callback domain and one webhook.
20. [console] R2: a prod bucket and a scoped token, plus a backup bucket with a lifecycle rule. Settle D2.
21. [console] Resend (check Verified, create a prod key), Firebase service account, OpenAI/Gemini keys with spend caps, GitHub deploy secrets.
22. [console] Hetzner: SSH key, plus a Cloud Firewall allowing TCP 22/80/443, UDP 443 and ICMP.

**Phase 3: server and DNS**

23. [server] CX23, Ubuntu 24.04, nbg1 or fsn1 (the privacy policy says Germany), IPv4+IPv6, Backups on.
24. [server] Harden: `deploy` user, SSH key only, unattended-upgrades, 2 GB swap. Install Docker from the official repo, with json-file log rotation.
25. [server] `/opt/bikecheck`: compose file, Caddyfile, `.env.production` (chmod 600), and the web-mode `dist/`.
26. [dns] Lower the TTL, then point A/AAAA at Hetzner. **Do not touch MX/SPF/DMARC/Resend.**

**Phase 4: deploy, smoke, safety net**

27. [server] `up -d`, then load the catalogue and run the smoke checks (B §7 step 23).
28. [console] Strava webhook: delete the ngrok subscription and create one for `https://bikecheck.cloud/strava/webhook`. Then check that real events pass the stubbed signature check.
29. [server] Nightly encrypted `pg_dump` of both DBs to R2, a Healthchecks ping, and **one restore test**. Add UptimeRobot.
30. [code] A GitHub Actions workflow: images to GHCR, the SPA artifact, then rsync and SSH deploy (B §7 Phase G).

**Phase 5: Android (in parallel, see D6)**

31. [code] A release keystore and `signingConfigs`, a `versionCode` bump, and a signed AAB.
32. [console] Play Console ($25): Play App Signing. Copy the **SHA-1** into a Google Android OAuth client in the **same project as the Web client**, and the **SHA-256** into `assetlinks.json`.
33. [console] Data safety form, privacy URL, the deletion URL, internal test, then the closed test (12 testers × 14 days), then production.

**Phase 6: first user**, end to end on web and on Android. Sign up, open the verification mail, verify, then Google login, add a bike, log a service, connect Strava, and confirm a ride arrives through the webhook.

---

## Part A: Auth on web and Android

### 1. TL;DR: blocking problems, most critical first

1. **The standalone Android app will not keep a session in production, whatever the login method.** The bundled app runs at `https://localhost` (Capacitor defaults) and calls `https://bikecheck.cloud/api`, which is **cross-site**. Every auth cookie is `SameSite=Lax` (`auth.controller.ts:307-321`), and Lax cookies are neither sent on, nor stored from, a cross-site `fetch`. The app targets SDK 36, so the WebView applies modern SameSite rules. Today it only works because `server.url` points the WebView at the Vite dev server, which makes the API same-origin. **Fix:** give native callers (`Origin: https://localhost`) cookies with `SameSite=None; Secure`, and do the same in `deleteAuthCookies`. Set `CORS_ORIGINS` exactly (`https://bikecheck.cloud,https://localhost`). Build the APK with an absolute `VITE_API_BASE_URL=https://bikecheck.cloud/api` and remove `server.url`. Bearer tokens on native are the fallback (§4).
2. **Google on web is broken by a hard-coded callback.** `google.strategy.ts:12` has `callbackURL: 'http://localhost:3000/api/auth/google/callback'`.
   - **Dev:** Google sends the browser straight to `:3000`, past the Vite proxy, so the cookies land on host `localhost`. The monolith then redirects to `FRONTEND_URL=http://172.21.32.1:5173` (monolith `.env:10`). That is a different host, so the cookies are missing and the Login screen comes back.
   - **Prod:** every visitor's browser is sent to *their own* `localhost:3000`.
   - **Fix:** read the callback from `GOOGLE_CALLBACK_URL`. Register `https://bikecheck.cloud/api/auth/google/callback` (prod) and `http://localhost:5173/api/auth/google/callback` (dev, through the Vite proxy) on the Web client, and set `FRONTEND_URL` to the same host.
3. **Strava athlete capacity.** *"All new applications start in single-player mode… only your own Strava account can authenticate with the app."* No other rider can connect until you self-upgrade to 10 athletes in the API settings. Beyond 10 you need the Developer Program review, which requires brand-guideline compliance.
4. **Strava connect dead-ends on desktop.** The callback always redirects to `bikecheck://strava-connected` (`tokens.controller.ts:55`), and on web `Browser.open` is just `window.open(url,'_blank')` (`@capacitor/browser` `web.js:8`). The link *is* saved, but the user is left on a dead tab. **Fix:** store the return target (`web`|`native`) in `oauth_states`. Web goes back to `${FRONTEND_URL}/strava-connected` in the same tab; native keeps the custom scheme.
5. **Throttling behind Caddy will lock out logins.** Public auth routes are throttled per IP (`user-throttler.guard.ts:15`), and `main.ts` never sets `trust proxy`. Behind Caddy, `req.ip` is Caddy's container address, so **login (5/min), register (5/min) and google/token (10/min) become global limits** **[reasoning]**. **Fix:** `app.set('trust proxy', 'loopback, uniquelocal')`.
6. **Google on Android release builds** needs an **Android OAuth client** for `com.bikecheck.app` with the **Play App Signing SHA-1**, plus the upload-key SHA-1 if you sideload release APKs. It must sit in the same Google Cloud project as the Web client `583185376372-…`, which is *not* the Firebase project `888033455634` in `google-services.json`. Without it, Credential Manager fails on store builds.
7. **Google Auth Platform must go to *In production* and pass brand verification.** That means domain ownership of `bikecheck.cloud` in Search Console, plus a public homepage that describes the app and links `/legal/privacy` and `/legal/terms`. Until then the app name is not shown on the consent screen. Today `/` renders only a login form for logged-out visitors (`App.tsx:107-110`), which is a likely review problem **[reasoning]**.
8. **Register / log in *with* Strava does not exist.** Strava is link-only (`oauth_states.user_id NOT NULL`, monolith `GET /strava/connect` requires a session). Strava returns **no email** (removed 2019), while `users.email` is `NOT NULL UNIQUE` and ADR 0031 forbids sign-in before the email is verified. This needs an ADR-level decision. On Android a login callback runs in a Custom Tab and **cannot set WebView cookies**, so a one-time code handed back by deep link is required (§3.5).
9. **Strava production hygiene:**
   - Move the webhook subscription off ngrok (only one subscription per app).
   - Handle the athlete **deauthorization** event, which today is processed as an activity and fails.
   - Move `POST /oauth/deauthorize` to `/oauth/revoke` before **1 June 2027**.
   - Check the granted `scope` on callback.
   - Use a **separate dev Strava app**: there is one callback domain and one webhook subscription per app.

---

### 2. Google sign-in

#### 2.1 Current flow (code)

| Step | Web (desktop + mobile browser) | Android app (Capacitor) |
|---|---|---|
| Init | `main.tsx:24-29` `GoogleSignIn.initialize({ clientId: VITE_GOOGLE_CLIENT_ID })` runs on every platform; harmless on web because the plugin's `signIn` is never called there | same; the plugin passes `clientId` as Credential Manager **server client ID** (capawesome README: *"This must be a web client ID on all platforms, even on Android and iOS"*) |
| Click | `Authentication.tsx:168-169` → `window.location.href = ${VITE_API_BASE_URL}/auth/google` (`/api/auth/google` via `.env.local:6`) | `Authentication.tsx:170-180` → `GoogleSignIn.signIn()` → plugin `GoogleSignIn.java:78-111` `GetSignInWithGoogleOption.Builder(clientId)` → Credential Manager bottom sheet → **ID token** |
| Backend entry | `auth.controller.ts:198-203` `GET /auth/google` + `GoogleAuthGuard` (passport-google-oauth20) → 302 to Google with `redirect_uri` = **hard-coded** `http://localhost:3000/api/auth/google/callback` (`google.strategy.ts:12`), scopes `email profile` (`:13`), **no `state`** | `auth.controller.ts:218-234` `POST /auth/google/token { idToken }` |
| Verify | passport exchanges the code with `GOOGLE_CLIENT_SECRET`, reads OIDC userinfo (`passport-google-oauth20/lib/profile/openid.js:33` maps `email_verified` → `emails[0].verified`) | `googleAuth.service.ts:32-40` `OAuth2Client.verifyIdToken({ audience: GOOGLE_CLIENT_ID })`: signature, aud, exp |
| Account logic | `googleAuth.service.ts:61-152` (ADR 0031: link by googleId → by email → create; unvouched email → placeholder + 403) | same |
| Session | `auth.controller.ts:264` `setAuthCookies` then `:266` `res.redirect(FRONTEND_URL)`; refusals go back as `?emailNotVerified=` / `?googleError=` (`:275-286`, read in `Authentication.tsx:105-107`) | `:232` `setAuthCookies` on the JSON response; refusals as 403/409 handled in `Authentication.tsx:176-178`, `:87-92` |
| Cookies | `access_token`, `refresh_token`: `httpOnly`, `secure` only in production, **`sameSite:'lax'`**, no `domain` (`auth.controller.ts:307-321`) | same |

Env in use: the monolith `.env` has `GOOGLE_CLIENT_ID` = the same Web client as frontend `VITE_GOOGLE_CLIENT_ID` (project number `583185376372`), plus `GOOGLE_CLIENT_SECRET` and `FRONTEND_URL=http://172.21.32.1:5173`. `google-services.json` is Firebase project `bikecheck-c55fd` / `888033455634`, used for FCM; its `oauth_client` is `[]` (`:15`), so the Google sign-in client lives in a *different* Cloud project **[reasoning]**.

#### 2.2 Why it works on mobile and not on web

**Mobile works** because nothing is redirected. Credential Manager returns an ID token whose `aud` is the server client ID passed in, which is the Web client (Android docs: `.setServerClientId(WEB_CLIENT_ID)`, *"Web Client ID, not Android Client ID"*). The backend verifies it against that same `GOOGLE_CLIENT_ID` (`googleAuth.service.ts:36`). The POST goes to relative `/api/...` from a WebView loaded off the Vite dev server (`capacitor.config.ts:10-13` `server.url: http://192.168.1.111:5173`), so it is **same-origin** and the Lax cookies are stored first-party. Credential Manager also needs an Android OAuth client (package name + SHA-1) in that project; since it works, a debug-key client presumably exists **[reasoning, not verifiable from repo]**.

**Web fails** for these reasons, in order of likelihood:

1. **Host mismatch (dev).** The redirect URI bypasses the Vite proxy and hits `localhost:3000`, so cookies are stored for host `localhost`. *"Cookies do not provide isolation by port"* (RFC 6265 §8.5) helps only if the SPA is also on `localhost`. But the callback then redirects to `FRONTEND_URL=http://172.21.32.1:5173` (`auth.controller.ts:266`), a different host, so `/api/auth/me` gets no cookie and returns 401. The refresh also returns 401, and the Login screen comes back (`App.tsx:107-110`). Opening the SPA on `localhost:5173` alone does not help, because the redirect still goes to `172.21.32.1`.
2. **Non-dev-machine browsers.** A phone browser or a second PC is sent to *its own* `localhost:3000`: connection refused.
3. **Redirect URI registration.** Google requires an exact match: *"The http or https scheme, case, and trailing slash ('/') must all match"*. Raw IPs are rejected: *"Hosts cannot be raw IP addresses. Localhost IP addresses are exempted."* So a `192.168.x.x`/`172.21.x.x` dev callback can never be registered. Whether `http://localhost:3000/...` is registered: **unverified** (console).
4. **Production:** the same hard-coded localhost, so it is broken for everyone.
5. **UX gap:** if the user cancels at Google, passport calls `this.fail()` (`passport-oauth2/lib/strategy.js:135-136`). Nest's AuthGuard then answers a **JSON 401 in the browser tab** instead of returning to the login page.

#### 2.3 What each platform needs in production

| | (a) Desktop browser `https://bikecheck.cloud` | (b) Mobile browser | (c) Android app, standalone (no `server.url`) |
|---|---|---|---|
| Flow | Existing passport redirect flow (server-side code flow with secret) | Same as (a); `Capacitor.getPlatform()==='web'` | Credential Manager ID token → `POST /api/auth/google/token` |
| Callback / origin | Redirect URI `https://bikecheck.cloud/api/auth/google/callback` on the **Web** client; `FRONTEND_URL=https://bikecheck.cloud` | same | none (no redirect); needs **Android** client(s) with package + SHA-1 in the same project |
| Cookies | Lax is fine: the callback is a top-level navigation and then same-site **[reasoning]** | same | **Lax fails** (cross-site `https://localhost` → `bikecheck.cloud`). Needs `SameSite=None; Secure` or bearer (§4) |
| CORS | not involved (same origin) | same | `CORS_ORIGINS` must contain `https://localhost` (`main.ts:20-23`; without it, `origin: true` reflects any origin) |
| API base | `VITE_API_BASE_URL=/api` | same | absolute `https://bikecheck.cloud/api`; relative `/api` would be served by Capacitor's local server (`WebViewLocalServer.java:205-207, 223-225` handles every request to its own host) |
| Google rule | *"A developer must not direct a Google OAuth 2.0 authorization request to an embedded user-agent"*. Never run the web redirect inside the WebView. The native path avoids it. | | |

#### 2.4 Google Cloud console checklist (Google Auth Platform, formerly "OAuth consent screen")

- [ ] **Web application client** (existing `583185376372-…`):
  - Authorized redirect URIs: `https://bikecheck.cloud/api/auth/google/callback` and dev `http://localhost:5173/api/auth/google/callback`. Rules: HTTPS except localhost, no raw IPs, no wildcards, exact match.
  - Authorized JavaScript origins are needed only if GIS is adopted (§2.6): `https://bikecheck.cloud`, `http://localhost`, `http://localhost:5173`. GIS docs: *"add both http://localhost and http://localhost:<port_number>"*.
- [ ] **Android client(s)**, package `com.bikecheck.app`, in the **same project** as the Web client:
  - debug SHA-1 (`keytool -list -v -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore`, password `android`).
  - **Play App Signing** SHA-1. Google: *"you can get your SHA-1 from the Google Play Console on the Release > Setup > App Integrity page"* and *"the upload key certificate will be different than the app signing key certificate"*.
  - Upload-key SHA-1 if you test locally signed release APKs **[reasoning]**.
  - Google: *"When you prepare to release your app… create a new OAuth 2.0 client ID for your production app."*
- [ ] **Audience → Publishing status: In production.** *"Testing are limited to up to 100 test users"*. There is an exception: when the app requests only basic profile scopes, *"users do not need to be in the trusted user list"*, and the 7-day refresh-token expiry in Testing does not apply *"if the only OAuth scopes requested are a subset of name, email address, and user profile"*. BikeCheck requests only `openid email profile` (`google.strategy.ts:13`; plugin defaults), so Testing would technically work, but production is the intended state **[reasoning]**.
- [ ] **Branding:**
  - App name, support email, homepage `https://bikecheck.cloud`, privacy `https://bikecheck.cloud/legal/privacy`, terms `https://bikecheck.cloud/legal/terms` (all exist as public routes: `App.tsx:51`, `legal.types.ts:7`).
  - Authorized domain `bikecheck.cloud`.
  - Consent links *"must be hosted on an Authorized Domain"*.
- [ ] **Brand verification.** Required when External + published and *"you want your app to display a logo or display name on the OAuth consent screen"*. Android docs: *"Your brand must be verified for your app name to be visible to users"*. Requirements:
  - Search Console ownership of `bikecheck.cloud` by an account that is owner on the Cloud project.
  - Homepage *"must be publicly accessible, and not just accessible to your site's logged-in users"*, with a description and links to the privacy policy and terms.
  - Privacy policy *"hosted within the same domain as your application's home page"* that discloses Google user-data use.
  - Usually minutes; manual review *"2-3 business days"*.
- [ ] **Scopes:** keep `openid email profile`. Full OAuth app verification is mandatory only for sensitive or restricted scopes: *"If your app utilizes only non-sensitive scopes, it is not mandatory for your app to complete the app verification process."*
- [ ] **Deprecations, already satisfied:** *"Google Sign-In for Android… is deprecated"*, so use Credential Manager, which the capawesome plugin does (`GoogleSignIn.java:7-17`). The repo does not use `gapi`/`gapi.auth2`.

#### 2.5 Recommended minimal fix (keep the passport redirect flow for web)

Why this option: the callback, refusal flags, frontend handling and ADR 0031 logic are already built. In production the SPA and the API share one origin, so Lax cookies from a top-level callback just work.

1. `google.strategy.ts:12`: `callbackURL: process.env.GOOGLE_CALLBACK_URL!`. Fail fast at boot if it is missing.
   - prod: `GOOGLE_CALLBACK_URL=https://bikecheck.cloud/api/auth/google/callback`, `FRONTEND_URL=https://bikecheck.cloud`
   - dev: `GOOGLE_CALLBACK_URL=http://localhost:5173/api/auth/google/callback`, `FRONTEND_URL=http://localhost:5173`, and open the SPA on `localhost`, not a LAN IP. The callback then goes through the Vite proxy (`vite.config.ts:34-37`, `changeOrigin:false`), so the cookies land on the SPA's host.
2. Add `GOOGLE_CALLBACK_URL` to `.env.production.example`.
3. Hardening, not blocking:
   - Send a Google cancel or error back to `FRONTEND_URL?googleError=…`. Override `handleRequest` in `GoogleAuthGuard`, or catch in the callback.
   - Add OAuth `state` against login CSRF. passport's `state:true` needs express-session (`passport-oauth2/lib/state/store.js:39`: *"requires session support"*), so either pass a small custom `store` (signed short-lived cookie) or accept the risk for v1.

```ts
// google.strategy.ts — illustrative
super({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!, // must equal a redirect URI on the Web client
  scope: ['email', 'profile'],
});
```

The Android path needs **no code change** for Google itself. It needs the release SHA-1 clients (§2.4) and the session fix (§4).

#### 2.6 Alternatives considered (not recommended now)

- **Google Identity Services button + `POST /auth/google/token`** would unify web and Android behind one endpoint, with no secret and no redirect. Costs: Google's rendered button replaces the custom `GoogleButton`, JS origins must be registered, and FedCM nuances apply (*"One Tap shows the top-level domain name instead of application name"*; the button is affected only if `use_fedcm_for_button` is set). It is more change than the one-line fix above. `verifyIdToken` already accepts an array of audiences if more client IDs appear later.
- **capawesome web implementation** (`web.js:65-74`) uses the implicit flow (`response_type: 'id_token token'`, tokens in the URL fragment) and needs `redirectUrl` + `handleRedirectCallback`. It would work with `/auth/google/token`, but it puts tokens in the browser URL. The server-side code flow already exists, so prefer it **[reasoning]**.

---

### 3. Strava connect and registration

#### 3.1 Current flow (code): link-only

1. The user is already signed in. Entry points: `useConnectStrava` (`strava.queries.ts:19-26`) and the add-bike wizard (`useAddBikeWizard.ts:558-566`, `StravaConnectScreen.tsx`).
2. `GET /api/strava/connect` (`monolith strava.controller.ts:20-23`, session required) → `StravaEventsService.buildAuthorizeUrl` (`strava.service.ts:101-115`) → internal `POST ${STRAVA_SERVICE_URL}/strava/oauth-state` with `x-internal-secret`.
3. strava-service `tokens.service.ts:36-56` inserts `oauth_states(state, user_id, expires_at = now+10min)`. The migration has `user_id INTEGER NOT NULL` (`1787059200000_add-oauth-states.mjs:12-17`). It returns `https://www.strava.com/oauth/authorize?...` with:
   - `redirect_uri=${STRAVA_SERVICE_URL}/strava/exchange_token` (`:48`): today the ngrok host (strava `.env:15`); in prod `PUBLIC_APP_URL` (`docker-compose.prod.yml:97`)
   - `approval_prompt=force` (`:49`)
   - `scope=profile:read_all,activity:read_all,activity:write,read_all` (`:50`)
4. Frontend `Browser.open({url})`. On Android that is a Chrome Custom Tab (`@capacitor/browser` Android uses `CustomTabsIntent`); on web, `window.open(url,'_blank')` (`web.js:7-9`).
5. Strava → `GET /strava/exchange_token?code&state` (`tokens.controller.ts:42-56`, public, exposed by Caddy `Caddyfile:29-32`):
   - `consumeState` (single-use `DELETE … RETURNING`, `tokens.service.ts:63-74`)
   - `exchangeToken` (`:98-129`): token POST, upserts tokens, enqueues the BullMQ `strava-authorization` job carrying the athlete profile
   - **always** `res.redirect(${APP_DEEP_LINK_URL}strava-connected)` = `bikecheck://strava-connected`
6. Android: intent filter `scheme="bikecheck"` (`AndroidManifest.xml:29-34`) → `useStravaDeepLink.ts:20-29` (`appUrlOpen`) closes the tab, invalidates `currentUser` and navigates to `/strava-connected` (`App.tsx:143`). That hook returns early on web (`:18`).
7. Monolith job `strava.processor.ts:17-18` → `accountLinked` (`strava.service.ts:835-855`) writes `strava_athlete_id` (unique, `schema.prisma:521`) and the `strava_*` profile fields onto **the existing user**.

`FRONTEND_URL` is set in strava-service's `.env:17` but **read nowhere** (grep: no usage in `apps/strava-service`).

**Answer: today Strava is only "link an existing BikeCheck account". Nothing creates an account or a session from Strava.**

#### 3.2 Return path: desktop vs Android

| | Today | Production need |
|---|---|---|
| Android app | Custom Tab → `bikecheck://strava-connected` → app. Works. | Same. A custom scheme can be claimed by other apps (Capacitor: *"Universal/App Links use HTTPS URLs that link to a website domain that you own, ensuring that no other app can use your links"*). Low risk here because the state is server-side and the deep link carries no secret **[reasoning]**. |
| Desktop / mobile browser | New tab → Strava → `bikecheck://…` → browser error / "open app?" prompt. Tokens **are** saved, but the original tab never refreshes `currentUser`. | Same-tab navigation (`window.location.assign(url)`), callback → `${FRONTEND_URL}/strava-connected`, which is a protected route, works with same-origin cookies, and re-reads `/auth/me`. |

Minimal change **[reasoning]**:
- `GET /api/strava/connect?platform=web|native`
- forward to `oauth-state`
- `ALTER TABLE oauth_states ADD COLUMN return_to TEXT NOT NULL DEFAULT 'native'`
- `consumeState` returns `{ user_id, return_to }`
- callback redirects to `${FRONTEND_URL}/strava-connected` for `web`, `${APP_DEEP_LINK_URL}strava-connected` for `native`

Also handle `error=access_denied` (Strava docs: *"error=access_denied"* on denial). Today a denied consent consumes the state, calls `exchangeToken(undefined)` and ends on a 500 page.

Race **[reasoning]**: the link is written asynchronously by the BullMQ job, but the app invalidates `currentUser` immediately (`useStravaDeepLink.ts:26`), so `/strava-connected` can render before `strava_athlete_id` exists. Same on web.

#### 3.3 Strava platform rules (primary docs)

- **Callback domain.**
  - The redirect URI *"Must be within the callback domain specified by the application. `localhost` and `127.0.0.1` are white-listed."*
  - *"When taking your app live, change 'Authorization Callback Domain' to a real domain."*
  - It is one domain per app. Set prod to `bikecheck.cloud`; both `/strava/exchange_token` and any future `/api/auth/strava/callback` sit under it.
  - Desktop dev can still use `http://localhost:3002/strava/exchange_token` thanks to the localhost whitelist **[reasoning: reading of the docs sentence]**. A phone in dev cannot reach `localhost` (use `adb reverse tcp:3002 tcp:3002`, or a dev app with an ngrok callback domain).
- **Endpoints:** web `GET https://www.strava.com/oauth/authorize`; mobile `GET https://www.strava.com/oauth/mobile/authorize` via an Android *Implicit Intent*, which hands off to the Strava app. *"If a user does not have the Strava app installed, they should be redirected to mobile web to complete OAuth."* Optional UX upgrade; the current Custom Tab plus web authorize is valid.
- **`approval_prompt`:** `force` always shows the prompt, `auto` is the default. Keep `force` for linking; use `auto` for a future "sign in with Strava".
- **Scopes:** `activity:read_all` = *"the same access as activity:read, plus privacy zone data and access to read the user's activities with visibility set to Only You"*. `profile:read_all` covers bikes/gear on `/athlete`. `activity:write` and `read_all` are requested (`tokens.service.ts:50`) but the code only GETs `/activities/{id}`, `/athlete` and `/athlete/activities` (`strava-webhook.service.ts:92,112,155`). Drop both for least privilege **[reasoning]**. The callback's `scope` is *"A space-delimited list of scopes granted. This may differ from the originally-requested list if the athlete unchecked…"*. The code ignores it, so check it and refuse without `activity:read_all`.
- **Tokens:** *"Access tokens expire six hours after they are created"*; refresh tokens rotate: *"always use the most recent refresh token for subsequent requests"*. The code persists the new one (`tokens.service.ts:171-176`). OK.
- **Deauthorization:** *"As of June 1, 2026 applications can choose to leverage the endpoint POST https://www.strava.com/oauth/revoke. This is the recommended method… only endpoint supported for deauthorization effective June 1, 2027."* The code uses `/oauth/deauthorize` (`tokens.service.ts:140`).
- **No email.** OAuth updates: *"January 15, 2019 — Email address is no longer part of the profile:read_all scope and is removed from the athlete model."*
- **Athlete capacity (the hard gate):**
  - *"All new applications start in single-player mode. This is the default state where only your own Strava account can authenticate with the app."*
  - *"Once your app is configured in your API dashboard, you can upgrade your access directly from your API Settings Dashboard"*, which gives *"Athlete capacity of 10"* and overall limits *"400 requests / 15min & 4,000 requests / day"*.
  - *"Once your app reaches 10 connected athletes and you're ready to scale further, please submit your app for review!"* (form linked from the getting-started page).
  - The rate-limits page lists the review steps: demonstrate demand, review the API terms, comply with the brand guidelines, submit the form. *"increased access is not a guarantee"*.
  - Changelog 2026-06-01: *"Self-service expanded access introduced for solo developers."*
  - *"A Strava subscription is a prerequisite for creating an app."*
- **Rate limits (default):** *"200 requests every 15 minutes, with up to 2,000 requests per day"*, non-upload *"100… 1,000"*. The 15-minute window resets at :00/:15/:30/:45; the daily window at midnight UTC.
- **Brand guidelines:**
  - *"All apps that choose to use the Connect with Strava button for OAuth must link to https://www.strava.com/oauth/authorize"*. The button comes in orange or white, 48 px @1x, and must not be modified.
  - Attribution: *"'Powered by Strava' logo or 'Compatible with Strava' logo"*.
  - Links back must read *"View on Strava"*.
  - *"You must not use the Strava name in your application name."*
  - The current custom buttons (`StravaConnectScreen.tsx:145-166`, settings card) are not the official asset, so swap them before review **[reasoning]**.
- **API agreement:** *"Strava Data provided by a specific user can only be displayed or disclosed in your Developer Application to that user."* Relevant to public profiles and reports that show ride-derived data **[reasoning; flag for review]**.
- **Webhooks:**
  - *"Each application may only have one subscription"*. The handshake echoes `hub.challenge` within 2 s; events must get 200 within 2 s.
  - The deauth event carries `"updates": {"authorized": "false"}`.
  - Getting-started says webhooks are needed *"to know when an athlete has deauthorized your API application"* per the API terms.
  - The processor (`strava-webhook.processor.ts:41-84`) treats every non-delete event as an activity and calls `downloadActivity(object_id)`, so an athlete event fails and tokens plus the monolith link stay behind. The DTO already allows `object_type: 'athlete'` (`strava-webhook-event.dto.ts:13-14`).
- **Upcoming:** API base URL moves to `https://api-v3.strava.com` (*"available January 4, 2027"*), affecting `strava-webhook.service.ts`.

#### 3.4 Production changes for the existing link flow

- **[console]** Strava app: callback domain `bikecheck.cloud`; upgrade to capacity 10; plan the review.
- **[config]** strava-service `STRAVA_SERVICE_URL=https://bikecheck.cloud` (already in compose) and `APP_DEEP_LINK_URL=bikecheck://`.
- **[console]** Delete the ngrok subscription and create one with `callback_url=https://bikecheck.cloud/strava/webhook`. Rotate the client secret that sits in git history (already in hosting.md).
- **[code]** `return_to` (§3.2), `error=access_denied`, scope check, athlete-deauth handling, `/oauth/revoke`.
- **[config]** A second **dev** Strava app (single-player mode is fine): own client ID/secret, callback domain `localhost` or ngrok, own webhook subscription.

#### 3.5 Register / log in via Strava: gap analysis

What exists: nothing. What is missing:

| Gap | Where | Note |
|---|---|---|
| Unauthenticated start | `oauth_states.user_id NOT NULL`; monolith `GET /strava/connect` behind JWT | need an `intent` (`link`\|`login`) and nullable `user_id` |
| Synchronous identity result | the athlete reaches the monolith only via an async BullMQ job (`tokens.service.ts:110-118`) | login must answer within the callback request |
| Session on Android | the callback runs in the **Custom Tab** (system browser cookie jar), not the WebView | cookies set there never reach the app. Hand back a **one-time code** via deep link and let the app redeem it with `fetch` (same shape as `/auth/google/token`) **[reasoning]** |
| Email | Strava gives none; `users.email String @unique` NOT NULL (`schema.prisma:510`) | ADR 0031: no sign-in before the email is verified |
| Account matching | `strava_athlete_id @unique` (`schema.prisma:521`); unused generic `accounts(provider, providerID)` table (`schema.prisma:14-20`) | could hold the Strava identity, but YAGNI vs the existing column |
| Brand/review | official "Connect with Strava" button; capacity >1 | §3.3 |

Minimal design that respects ADR 0031 **[reasoning; needs your decision + a new ADR before any code]**:

1. `GET /api/auth/strava/start?platform=web|native` (public) → authorize URL. State is stored with `intent=login`, `return_to`. Use `approval_prompt=auto`.
2. Callback (strava-service keeps token ownership):
   - exchange the code, save the tokens
   - call a new internal monolith endpoint with the athlete `{id, firstname, lastname, username, profile}`
   - the monolith returns a one-time login code (single-use, about 60 s TTL, stored in Redis or DB)
   - redirect to web `${FRONTEND_URL}/auth/strava?code=…`, or native `bikecheck://auth/strava?code=…`
3. SPA `POST /api/auth/strava/redeem {code}`:
   - **athlete linked to a Verified Email account** → set cookies (web: same-origin; native: §4) → signed in.
   - **athlete unknown** → reply `needsEmail` → the rider types an email → create an **Unverified Account** carrying `strava_athlete_id` and no password → send the Verification Email → "check your inbox". After verifying, the next "Continue with Strava" signs in. Strava does not vouch for the address, so this is exactly ADR 0031's placeholder.
   - **typed email belongs to a Verified Email account** → refuse ("sign in with your password/Google, then connect Strava in Settings"). Never auto-link: Strava proves nothing about the address, mirroring `GOOGLE_EMAIL_UNVERIFIED`.
4. The alternative (accounts with no email at all) contradicts CONTEXT.md *"there is no account that is usable and unverified"* and the Welcome/notification email model. Not recommended.

Product reality check **[reasoning]**: with capacity 10 until Strava reviews the app, "Sign in with Strava" cannot be a primary sign-up path at launch. Google plus email are the ways in; Strava stays a link until review passes.

---

### 4. Sessions and cookies: web vs Android

#### 4.1 What the code does

- API base: `client.ts:4` `BASE_URL = VITE_API_BASE_URL`; every call is `credentials:'include'` (`client.ts:51-55, 83-90`). `.env.local:6` = `/api`. The tracked-nowhere `.env` holds a LAN IP. Both files are git-ignored, so a build machine must supply them.
- Cookies: `sameSite:'lax'`, `secure` only when `NODE_ENV==='production'`, no `domain` → host-only (`auth.controller.ts:307-321`). Clear uses the same attributes (`:288-301`). Refresh reads the cookie only (`:134`).
- JWT: cookie first, **Bearer fallback already supported** (`jwt.strategy.ts:15-18`).
- CORS: `origin: CORS_ORIGINS?.split(',') ?? true`, `credentials:true` (`main.ts:20-23`). Unset means every origin is reflected with credentials.
- Capacitor: no `hostname`/`androidScheme` set, so the defaults are `localhost` and `https` (`@capacitor/cli` declarations: `@default localhost`, `@default https`) → origin **`https://localhost`**. No CapacitorHttp/CapacitorCookies config.
- Capacitor Android **turns third-party cookies on** for its WebView on every start: `Bridge.java:1593` → `MockCordovaWebViewImpl.java:57` → `CapacitorCordovaCookieManager.java:15` `setAcceptThirdPartyCookies(webView, true)`. Android's own default for apps targeting Lollipop+ is to disallow them (CookieManager reference).
- `targetSdkVersion = 36` (`android/variables.gradle:4`), so modern SameSite applies in the WebView. Android 12 behaviour changes: *"Cookies without a SameSite attribute are treated as SameSite=Lax"*, *"Cookies with SameSite=None must also specify the Secure attribute"*.

#### 4.2 What happens in production

| Client | Page origin | API | Same-site? | Lax cookies |
|---|---|---|---|---|
| Desktop/mobile browser | `https://bikecheck.cloud` | `https://bikecheck.cloud/api` | yes (same origin) | work |
| Android app, standalone | `https://localhost` | `https://bikecheck.cloud/api` | **no** | **not sent and not stored**. web.dev: Lax cookies go only with top-level navigations, not cross-site subrequests. So `/auth/login` and `/auth/google/token` answer 200 but the cookie is dropped, and the next `/auth/me` returns 401 **[reasoning, consistent with docs]** |

#### 4.3 Options

| | Option | Evidence | Verdict |
|---|---|---|---|
| A | **`SameSite=None; Secure` for native callers only**: pick `'none'` when `req.headers.origin === 'https://localhost'`, else `'lax'`; same in `deleteAuthCookies`, or the logout Set-Cookie is rejected cross-site; strict `CORS_ORIGINS` | `None` requires `Secure` (web.dev, Android 12 doc); WebView accepts third-party cookies because Capacitor enables them (code above) | **Recommended.** Smallest diff. Web keeps Lax, so no new CSRF surface for browsers. Inside the app no foreign page runs in the WebView (external URLs open in the system browser; `allowNavigation` is unset) **[reasoning]** |
| B | **Bearer tokens on native**: return tokens in the body for native, store the refresh token in secure storage, send `Authorization: Bearer`; refresh must also accept it from the body | JWT strategy already reads Bearer | Most robust against future cookie-policy changes. More code: refresh endpoint, storage plugin, logout. Fallback if A misbehaves |
| C | `server.hostname: 'bikecheck.cloud'` + API on `api.bikecheck.cloud` (same-site → Lax works) | Capacitor: *"It is recommended to keep this as localhost"*; the local server intercepts **all** requests to its own host (`WebViewLocalServer.java:223-225`), so `/api` on the same host breaks | Structural (new subdomain, Caddy site, CORS); shadows the real site inside the app. No |
| D | Keep `server.url: 'https://bikecheck.cloud'` in the release | Capacitor: *"This is not intended for use in production."* | No (also no offline shell) |
| E | `CapacitorHttp` (native HTTP shares the WebView cookie store, no SameSite/CORS) | The patched `fetch` builds the `Response` only after the full native result (`native-bridge.js:532-551`), so the **NDJSON chat stops streaming**. Docs: complex bodies only via the patched fetch; large files → file-transfer plugin | No |

#### 4.4 Recommendation (A), concretely

```ts
// auth.controller.ts — illustrative
const NATIVE_APP_ORIGIN = 'https://localhost';
// The app's WebView calls the API cross-site, where Lax cookies are dropped.
private cookieOptions(req: Request): CookieOptions {
  const native = req.headers.origin === NATIVE_APP_ORIGIN;
  return { httpOnly: true, secure: native || process.env.NODE_ENV === 'production', sameSite: native ? 'none' : 'lax', path: '/' };
}
```

Plus:
- **[config]** `CORS_ORIGINS=https://bikecheck.cloud,https://localhost`. This is mandatory once any cookie is `None`.
- **[config]** APK build: `_frontend/bikecheck/.env.android` with `VITE_API_BASE_URL=https://bikecheck.cloud/api` and `VITE_GOOGLE_CLIENT_ID=…`, then `vite build --mode android` (Vite: mode files *"take precedence over those in generic files"*, so it overrides `.env.local`'s `/api`).
- **[config]** Remove `server` from `capacitor.config.ts`, then `npx cap sync` (the copied `android/app/src/main/assets/capacitor.config.json:5-8` still has it).
- **[code]** `setAuthCookies`/`deleteAuthCookies` take `req` at all call sites: login, google/token, google/callback, refresh, logout.
- Images or files the WebView loads via `apiUrl()` with an `<img src>` cross-site only carry `None` cookies **[reasoning]**. Covered by A.

#### 4.5 Email verification / App Links (impact on login)

- The link `https://bikecheck.cloud/verify-email?token=…` opens the app via the App Link (`AndroidManifest.xml:42-49`, `useAppLinks.ts:43`) or the web page. Verify is a POST with no cookies (`auth.controller.ts:101-110`), then the login form. It works on both platforms with no session dependency.
- `assetlinks.json:8` lists only the debug SHA-256. Add the Play App Signing SHA-256 before release or `autoVerify` fails (already in hosting.md and the manifest TODO). If verification fails, the link opens the web page and hands off via `bikecheck://login?email=` (`EmailVerified.tsx:13,21`). That degrades gracefully but is not broken.
- After a verify on Android, the login inside the app is subject to §4. Same fix.

---

### 5. Ordered work checklist

1. **[code]** Monolith `main.ts`: `NestFactory.create<NestExpressApplication>` + `app.set('trust proxy', 'loopback, uniquelocal')`, so throttling and `@Ip()` see the real client. Express: *"req.ip… populated based on the socket address and X-Forwarded-For header, starting at the first untrusted address"*; NestJS throttler docs show `app.set('trust proxy', 'loopback')`. Caddy sets `X-Forwarded-For`.
2. **[code]** `google.strategy.ts:12` → `GOOGLE_CALLBACK_URL`. **[config]** Add it to `.env.production.example` and dev `.env`. Set dev `FRONTEND_URL=http://localhost:5173`.
3. **[console]** Google Web client: add both redirect URIs (§2.4).
4. **[code]** Cookie `SameSite` by caller (§4.4) in set and clear, on all five call sites.
5. **[config]** `CORS_ORIGINS=https://bikecheck.cloud,https://localhost`; `FRONTEND_URL=https://bikecheck.cloud`.
6. **[config]** APK build mode `.env.android` (absolute API URL, Google client ID); drop `server.url`; `cap sync`.
7. **[console]** Play Console: enrol in Play App Signing, copy the **SHA-1** (Google client) and **SHA-256** (assetlinks).
8. **[console]** Google: Android OAuth client(s) for debug, upload and app-signing SHA-1, in the **same project** as the Web client.
9. **[config]** `assetlinks.json`: add the release SHA-256.
10. **[console]** Google Auth Platform: branding (home, privacy, terms URLs, authorized domain), Search Console verification of `bikecheck.cloud`, publish **In production**, brand verification.
11. **[code]** Logged-out `/`: add a short app description and links to `/legal/privacy` and `/legal/terms` on the login screen, to satisfy the brand-verification homepage rule **[reasoning]**.
12. **[code]** Google callback: redirect cancel/error to `FRONTEND_URL?googleError=…` instead of a JSON 401. Optional: `state` via a custom store.
13. **[code]** Strava `return_to` (web/native) in `oauth_states` + `/strava/connect?platform=`; web uses same-tab `window.location.assign`; callback redirect per platform; handle `error=access_denied`; verify the granted `scope`.
14. **[code]** Strava: handle `object_type:'athlete'` + `updates.authorized:'false'` (delete tokens, clear the monolith link); switch `disconnect` to `POST /oauth/revoke`; drop `activity:write`/`read_all` from the requested scopes.
15. **[console]** Strava prod app: callback domain `bikecheck.cloud`; upgrade to capacity 10; rotate the secret; new webhook subscription to `https://bikecheck.cloud/strava/webhook`; delete the ngrok one.
16. **[console]** Strava **dev** app (single-player), with its own subscription and localhost/ngrok callback domain. **[config]** dev `.env` files point at it.
17. **[code]** Brand: official "Connect with Strava" button asset + "Powered by Strava" attribution where Strava data is shown; then **[console]** submit the Strava review when you get near 10 athletes.
18. **Decision + ADR first:** "Sign in with Strava" (§3.5). Only after approval: **[code]** intent/nullable `user_id`, internal athlete hand-off, one-time code redeem, email-collection screen.
19. **[code], later/optional:** Strava base URL → `api-v3.strava.com` (from 2027-01-04); app-to-app `oauth/mobile/authorize` on Android.

---

### 6. Open questions / not verified

- **Google console state:** which redirect URIs and Android clients (and which SHA-1s) exist on project `583185376372` today; whether the consent screen is External/Testing. Not visible from the repo.
- **Why `google-services.json` (Firebase `888033455634`) and the Google sign-in client (`583185376372`) are different projects.** Fine for Credential Manager as long as the Android client sits with the Web client **[reasoning]**. Consolidating is optional.
- **Strava app state:** is client `283561` still in single-player mode? Which callback domain is set? The old client `235898` and its secrets appear in `strava-webhook.controller.ts:139-159` comments and `subscription-url.md`.
- **What Strava shows an athlete beyond capacity** (error page wording). Not documented on the pages read.
- **Whether a Lax `Set-Cookie` on a cross-site fetch is dropped in Android WebView exactly as in Chrome.** The docs establish modern SameSite rules for targetSdk ≥ 31 and that Lax is not sent cross-site. The storing side is inferred. **Test on a release build before relying on option A.**
- **Strava's localhost whitelist when the callback domain is `bikecheck.cloud`.** The docs sentence implies it is always allowed; not tested.
- **Brand-verification acceptance of a login-form homepage.** The docs require a public homepage describing the app with policy links; whether Google's reviewer accepts the current `/`: unknown.
- **API agreement 2.3 vs public profiles/reports** that show ride-derived figures: needs a legal read, out of scope here.
- **Strava `x-strava-signature`:** the webhook signature HMAC check is stubbed (`strava-webhook.service.ts:200-210`). The webhooks page read does not document a signature header. Unverified whether Strava sends one; if not, every real event would 403 in prod. Test after moving the subscription.

---

### 7. Sources (all fetched 2026-10-04)

| URL | Used for |
|---|---|
| https://developers.strava.com/docs/authentication/ | callback domain + localhost whitelist, web vs mobile authorize, Android intent sample, `approval_prompt`, scope texts, granted `scope` param, `error=access_denied`, 6 h access tokens, rotating refresh tokens, `/oauth/revoke` vs `/oauth/deauthorize` dates |
| https://developers.strava.com/docs/getting-started/ | single-player mode, self-upgrade to capacity 10, review form, "real domain" when live, subscription prerequisite, webhooks for deauth |
| https://developers.strava.com/docs/rate-limits/ | default limits, reset schedule, headers, capacity 1 → 10 → review, "not a guarantee", review steps |
| https://developers.strava.com/docs/webhooks/ | create/view/delete subscription, one per app, deauth event format, 2 s / 200 rule |
| https://developers.strava.com/docs/oauth-updates/ | email removed from athlete model (2019-01-15) |
| https://developers.strava.com/docs/changelog/ | 2026 entries: revoke endpoint, self-service expanded access, scope field, api-v3 base URL |
| https://developers.strava.com/guidelines/ | Connect with Strava button, Powered by Strava, "View on Strava", naming |
| https://www.strava.com/legal/api | §2.3 display only to that user |
| https://developers.google.com/identity/protocols/oauth2/web-server | redirect URI validation rules, exact-match/redirect_uri_mismatch, state |
| https://developers.google.com/identity/protocols/oauth2 | 7-day refresh expiry in Testing + basic-scope exception |
| https://developers.google.com/identity/protocols/oauth2/policies | no embedded user-agents, homepage/privacy/branding policy |
| https://support.google.com/cloud/answer/15549945 | Testing 100 users, basic-scope exception, In production, user cap |
| https://support.google.com/cloud/answer/15549257 | Web client origins/redirects, Android client package + SHA-1, separate production client |
| https://support.google.com/cloud/answer/13463073 | verification needed only for sensitive/restricted; brand verification for name/logo |
| https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification | when brand verification applies, homepage/privacy/Search Console requirements, timing |
| https://developers.google.com/android/guides/client-auth | SHA-1 via keytool, Play App Signing SHA-1 location, upload vs signing key |
| https://developer.android.com/identity/sign-in/credential-manager-siwg | prerequisites, brand verification for app name |
| https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation | `setServerClientId(WEB_CLIENT_ID)`, GetSignInWithGoogleOption, server verification |
| https://codelabs.developers.google.com/sign-in-with-google-android?hl=en | create Android (package + SHA-1) and Web clients; web client ID → `setServerClientId` |
| https://developer.android.com/identity/sign-in/legacy-gsi-migration | legacy Google Sign-In for Android deprecated → Credential Manager / AuthorizationClient |
| https://developer.android.com/identity/sign-in/credential-manager-troubleshooting-guide | checked: no client-ID misconfiguration entries |
| https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid | JS origins incl. localhost + port, consent-screen links on authorized domain |
| https://developers.google.com/identity/gsi/web/guides/verify-google-id-token | aud/iss/exp checks, Node `verifyIdToken` with audience array |
| https://developers.google.com/identity/gsi/web/guides/fedcm-migration | FedCM effects on One Tap / button |
| https://capacitorjs.com/docs/config | `server.url`/`cleartext`/`allowNavigation` "not intended for production", `hostname` keep localhost, `androidScheme` |
| https://capacitorjs.com/docs/apis/cookies | CapacitorCookies patches `document.cookie`, disabled by default |
| https://capacitorjs.com/docs/apis/http | CapacitorHttp patches fetch/XHR, body-type limits, large files |
| https://capacitorjs.com/docs/apis/browser | Browser plugin (iOS SFSafariViewController; Android confirmed in source as Custom Tabs) |
| https://capacitorjs.com/docs/guides/deep-links | custom scheme vs App Links security, assetlinks setup |
| https://developer.android.com/about/versions/12/behavior-changes-12 | modern SameSite in WebView for targetSdk ≥ 31 |
| https://developer.android.com/reference/android/webkit/CookieManager | third-party cookies disallowed by default for Lollipop+ targets (via search snippet of the reference) |
| https://web.dev/articles/samesite-cookies-explained | site definition, Lax only on top-level navigations, None requires Secure |
| https://www.rfc-editor.org/rfc/rfc6265#section-8.5 | cookies not isolated by port |
| https://docs.nestjs.com/security/rate-limiting | trust proxy behind a proxy, `getTracker` |
| https://expressjs.com/en/guide/behind-proxies.html | `trust proxy` values (`loopback`, `uniquelocal`), effect on `req.ip` |
| https://vite.dev/guide/env-and-mode | `.env.[mode]` precedence, `vite build --mode` |

Repo files read:
- Backend auth: `_backend/apps/monolith/src/auth/{auth.controller.ts,googleAuth.service.ts,auth.module.ts,auth.config.ts,strategy/google.strategy.ts,strategy/jwt.strategy.ts,guards/google-auth.guard.ts,dto/auth.dtos.ts}`, `_guards/user-throttler.guard.ts`, `main.ts`, `strava/{strava.controller.ts,strava.service.ts,strava.processor.ts}`, `mail/mail-texts.ts`, `prisma/schema.prisma`
- strava-service: `_backend/apps/strava-service/src/{main.ts,tokens/*,strava-webhook/*}`, `migrations/1787059200000_add-oauth-states.mjs`
- Frontend: `_frontend/bikecheck/{package.json,vite.config.ts,capacitor.config.ts,.env,.env.local}`, `src/{main.tsx,App.tsx,api/client.ts,hooks/useStravaDeepLink.ts,hooks/useAppLinks.ts}`, `src/features/{login_page/*,strava/strava.api.ts,strava/strava.queries.ts,strava_connected_page/StravaConnected.tsx,add_bike_page/StravaConnectScreen.tsx,add_bike_page/useAddBikeWizard.ts,verify_email_page/EmailVerified.tsx}`, `public/.well-known/assetlinks.json`
- Android: `android/app/{build.gradle,google-services.json,src/main/AndroidManifest.xml,src/main/res/values/strings.xml,src/main/assets/capacitor.config.json}`, `android/variables.gradle`
- Root and docs: `docker-compose.prod.yml`, `docker/Caddyfile`, `.env.production.example`, `docs/adr/0031-*.md`, `CONTEXT.md`
- node_modules read-only: `@capawesome/capacitor-google-sign-in` (README, `web.js`, `GoogleSignIn.java`), `@capacitor/browser/dist/esm/web.js`, `@capacitor/android` (`Bridge.java`, `MockCordovaWebViewImpl.java`, `CapacitorCordovaCookieManager.java`, `CapacitorCookieManager.java`, `WebViewLocalServer.java`, `native-bridge.js`), `@capacitor/cli` declarations, `passport-oauth2`, `passport-google-oauth20`

---

## Part B: Deploy gap audit and go-live runbook

### 1. TL;DR: what breaks the first deploy (most critical first)

1. **A fresh prod DB has no catalogue, so the app is unusable.** `migrate deploy` (83 migrations, baseline `0_init`) creates the tables but no component groups, types, actions, intervals, brands or bike types. Only 4 migrations insert rows, and those patch catalogue rows that already exist. `scripts/seedData/main_dev.ts:52-70` has every seeder commented out, and ADR 0019 itself says *"`db:devseed` cannot run at all"*. `scripts/` is not in the image either. **Fix:** one-time catalogue export from the dev DB (rows with `user_id IS NULL`) loaded into prod, see §4.
2. **Boot-time crashes and a localhost OAuth callback.** If `GOOGLE_CLIENT_ID` is left blank as in the example (`.env.production.example:31`), the monolith dies on start: passport-oauth2 throws `OAuth2Strategy requires a clientID option` (`node_modules/passport-oauth2/lib/strategy.js:87`). A missing `JWT_SECRET` throws too (`jwt.strategy.ts:11-12`). Even when booted, web Google sign-in redirects to the hard-coded `http://localhost:3000/api/auth/google/callback` (`google.strategy.ts:12`). Details: Part A §2.
3. **Prod logs go nowhere, and secrets go into `docker logs`.**
   - Under `NODE_ENV=production`, the only pino target is `pino-loki` (`monolith/app.module.ts:68-98`, `strava-service/app.module.ts:30-59`). With the example `LOKI_HOST=http://localhost:3100` (`.env.production.example:48`), which is the container itself, every structured log is dropped.
   - Grafana Cloud would need `basicAuth`, which the code does not pass (pino-loki supports it, `node_modules/pino-loki/README.md:72`).
   - Meanwhile raw `console.log` calls write `RESEND_API_KEY` (`mail/mail.service.ts:26`), the Resend client's `apiKeys` (`:57`) and `INTERNAL_API_SECRET` (`strava/strava.service.ts:178`) to stdout.
   - **Fix:** add a stdout target in prod and delete those logs before the first boot.
4. **The SPA build has no committed env, and the APK needs a different one.**
   - `VITE_API_BASE_URL` (`src/api/client.ts:4`), `VITE_GOOGLE_CLIENT_ID` and `VITE_CARTO_KEY` live only in git-ignored `.env`/`.env.local`.
   - A CI or server build therefore produces `BASE_URL = undefined`, so every request goes to `undefined/auth/...` **[reasoning]**.
   - The root `.gitignore` ignores `.env.production`, so committing that filename silently fails.
   - The APK must call `https://bikecheck.cloud/api` (its WebView origin is `https://localhost`), not `/api`.
5. **Anonymous rate limits become global behind Caddy.** There is no `trust proxy` (`main.ts:9`), so `req.ip` is Caddy's Docker IP for everyone. The anonymous fallback in `UserThrottlerGuard` (`_guards/user-throttler.guard.ts:15`) therefore puts all anonymous users in one bucket:
   - login 5/min (`auth.controller.ts:175`)
   - register 5/min (`:71`)
   - verification resend 3/min (`:86`)
   - refresh 100/min (`:129`, global default)

   That's for the whole planet, and one script locks everyone out.
6. **Every SPA redeploy breaks `/u/*`, `/r/*` and the Report PDF until the monolith restarts.** `PreviewService` caches `index.html` forever (`preview/preview.service.ts:233-241`, `shellPromise ??=`). Vite empties `dist/`, so the cached shell points at deleted `/assets/index-<hash>.js`. Caddy's `try_files` then answers that JS request with HTML (`docker/Caddyfile:38`), and the page is blank **[reasoning]**.
7. **DNS still points at Forpsi, and `www` would fail TLS.**
   - `bikecheck.cloud A 81.2.196.19` (PTR `19.196.forpsi.net`, TTL 1800); 443 is closed today (checked with `nslookup`/DoH/curl on 2026-10-04).
   - `www` is a CNAME to the apex, but the Caddyfile only serves `{$PUBLIC_HOST}` (`docker/Caddyfile:3`), so `https://www…` gets no certificate.
8. **The public repo has a live Strava client secret and DB dumps.**
   - `gh repo view` reports `"visibility":"PUBLIC"`.
   - `_backend/apps/strava-service/src/strava-webhook/subscription-url.md:4` has the secret in plain text at HEAD.
   - Tracked dumps: `_backend/apps/monolith/db_dump.sql`, `db_dump_data.sql` (with real e-mail addresses) and `_backend/db_dump/bikecheck_dump.dump`.
   - **Fix:** rotate the Strava secret before prod and remove the dumps.
9. **Decide the R2 public URL before the first upload.**
   - Dev uses `https://pub-….r2.dev`. Cloudflare: *"Public access through `r2.dev` subdomains is rate-limited and should only be used for development purposes"*.
   - Uploads store the **full URL** in the DB (`storage/storage.service.ts:87`), so changing the origin later leaves old rows on r2.dev.
   - A custom domain needs bikecheck.cloud *"added as a zone in the same account as the R2 bucket"* ([R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)), but DNS is at Forpsi.
10. **Android release build still points at the dev machine.**
    - `capacitor.config.ts:10-13` still has `server.url: "http://192.168.1.111:5173"` + `cleartext: true`. Capacitor: *"This is not intended for use in production"* ([Capacitor config](https://capacitorjs.com/docs/config)).
    - No release `signingConfig` (`android/app/build.gradle:19-24`).
    - `assetlinks.json` has only the debug SHA-256.
11. **No CI and no image registry flow.** `.github/workflows/` does not exist. `docker-compose.prod.yml` has only `build:` and no `image:` (`:53-57`, `:84-88`), so the current plan is to build on the 4 GB box.
12. **No backups.** Nothing is configured. The privacy policy already promises *"backups, which are rotated and overwritten on a regular schedule"* (`src/legal/privacy.en.json`).

What **is** right (verified): Prisma 7 config path resolution, the Postgres 18 volume path, Swagger off in prod, Bull Board at `/api/queues` behind Caddy `basic_auth`, the unbuffered NDJSON proxy, `ipc: host` + `init`, Redis AOF, no DB ports published, e-mail DNS for Resend already live, `targetSdk 36`.

---

### 2. Audit of the existing prod files

#### 2.1 `_backend/Dockerfile.prod`

| | Item | Where | Finding / fix |
|---|---|---|---|
| ✅ | Debian base, not Alpine | `:6`, `:24` | `node:22-bookworm-slim`. Playwright needs glibc. Node 22 ≥ Prisma 7's floor *"20.19.0"* ([Prisma 7 upgrade](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)). |
| ✅ | OpenSSL in both stages | `:9`, `:29` | Needed by the Prisma schema engine for `migrate deploy`. |
| ✅ | `npm ci` from the lockfile with `.npmrc` | `:10-11` | Lock pins `prisma` 7.8.0, `playwright` 1.58.2. |
| ✅ | Selective `COPY`, no `.env` | `:13-20` | `.env`, `bikecheck-firebase-adminsdk.json` and the dumps never enter a layer. |
| ✅ | `prisma generate --config apps/monolith/prisma.config.ts` | `:22` | Prisma: *"Paths defined in the config file … are always resolved relative to the location of the config file"* ([config ref](https://www.prisma.io/docs/orm/reference/prisma-config-reference)). `schema: 'prisma/schema.prisma'` resolves correctly. |
| ✅ | dist paths | `:22`, compose `:62`, `:90` | Local `dist/apps/monolith/src/main.js` and `dist/apps/strava-service/main.js` match. rootDir = `apps/monolith` because `prisma/prisma.service.ts` lives outside `src/`. `@contracts` is a `.d.ts`, so it emits nothing. |
| ✅ | `NODE_ENV=production` | `:26` | Swagger skipped (`main.ts:38`), cookies `secure` (`auth.controller.ts:291`). |
| ✅ | Chromium only in the monolith image | `:38` | `playwright install --with-deps chromium`, browsers under `/ms-playwright`. |
| ⚠️ | Image size | `:31` | Full dev `node_modules` (googleapis 194 MB, @prisma 190 MB, typescript, jest, eslint, `npm`) + Chromium **and** headless shell. Probably 2–3 GB for the monolith and >1 GB for strava-service **[reasoning]**. **Optional fix:** `--only-shell`. Both launches use `headless: true` with no channel (`report/report-pdf.service.ts:28`, `bike/bike-data-scraper/bike-data-scraper.service.ts:302`). Playwright: *"you can avoid downloading the full Chromium browser by passing `--only-shell`"* ([browsers](https://playwright.dev/docs/browsers)). |
| ⚠️ | Runs as root, Chromium with no sandbox | no `USER` | The scraper opens third-party sites. Playwright: for scraping/crawling *"it's recommended to use a separate user for launching the browsers in combination with the seccomp profile"* ([Playwright Docker](https://playwright.dev/docs/docker)). Hardening, not a blocker. |
| ⚠️ | `prisma-client-js` generator | `schema.prisma:1-2` | Still works in 7.x, but *"The older `prisma-client-js` provider will be removed in future releases"* ([Prisma 7 upgrade](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)). Keep the lockfile pinned and don't `npm update` Prisma blindly. |
| ⚠️ | `.dockerignore` lacks secrets | `_backend/.dockerignore` | `**/.env`, `**/*adminsdk*.json` and `**/db_dump*` are sent in the build context (not copied into the image). Add them for defence in depth. |

#### 2.2 `docker-compose.prod.yml`

| | Item | Where | Finding / fix |
|---|---|---|---|
| ✅ | Postgres 18 volume path | `:14`, `:30` | `…:/var/lib/postgresql` is correct for 18. Docker Hub: *"The defined `VOLUME` was changed in 18 and above to `/var/lib/postgresql`"* ([postgres image](https://hub.docker.com/_/postgres)). |
| ✅ | DB/Redis healthchecks, `restart: unless-stopped` | `:15-19`, `:45-49` | `unless-stopped` *"restarts the container irrespective of the exit code"* ([compose services](https://docs.docker.com/reference/compose-file/services/)). |
| ✅ | Redis AOF | `:42` | BullMQ: *"We recommend enabling AOF"*. `maxmemory-policy noeviction` *"is the **only** setting that guarantees the correct behavior"* ([BullMQ production](https://docs.bullmq.io/guide/going-to-production)). The Redis default is `noeviction` **[reasoning]**. Don't set `maxmemory-policy`. |
| ✅ | `ipc: host`, `init: true` on the monolith | `:60-61` | Playwright: without `--ipc=host` *"Chromium can run out of memory and crash"*; `--init` prevents zombies ([Playwright Docker](https://playwright.dev/docs/docker)). |
| ✅ | Migrations before boot | `:62`, `:90` | `prisma migrate deploy --config …`, `node-pg-migrate up -m apps/strava-service/migrations` (2 `.mjs` files; v8.0.4 reads `DATABASE_URL`). One instance, so running it at start is acceptable. Prisma prefers CI/CD: *"Ideally, `migrate deploy` should be part of an automated CI/CD pipeline"* ([deploy migrations](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)). |
| ✅ | Only Caddy publishes ports | `:108-111` | DB and Redis have no `ports:`. This matters because Docker-published ports bypass ufw (§7). |
| ✅ | Internal `STRAVA_SERVICE_URL` vs public | `:69`, `:97` | Monolith → `http://strava-service:3002`. strava-service → public base for `redirect_uri` (`tokens.service.ts:48`). |
| ❌ | `sh -c "… && node …"` without `exec` | `:62`, `:90` | `sh` is the parent of node. strava-service has no `init`, so SIGTERM is ignored by sh as PID 1 and Docker SIGKILLs after the grace period. Nest also never calls `enableShutdownHooks()` (`main.ts`). Nest: shutdown hooks *"are disabled by default"* ([lifecycle](https://docs.nestjs.com/fundamentals/lifecycle-events)). BullMQ wants `worker.close()` on SIGTERM ([BullMQ](https://docs.bullmq.io/guide/going-to-production)). **Fix:** `… && exec node …`, add `init: true` to strava-service, and call `app.enableShutdownHooks()` in both `main.ts`. |
| ❌ | `dist/` bind-mounted from the repo checkout | `:73`, `:118` | (a) Combined with the preview cache, see TL;DR 6. (b) If `dist/` doesn't exist at the first `up`, Docker creates an empty root-owned dir **[reasoning]**. (c) The server needs Node, or an rsync from CI, to fill it. **Fix:** rsync a CI-built `dist/` **without `--delete`** (old hashed assets keep working), then `docker compose restart monolith`. Or make the preview cache invalidate by file mtime. |
| ⚠️ | No `image:` keys | `:53-57`, `:84-88` | `docker compose pull` has nothing to pull. Add `image: ghcr.io/jaffator/bikecheck-monolith:${TAG:-latest}` (and the strava one) next to `build:`. |
| ⚠️ | No app healthcheck | monolith, strava | Optional: `healthcheck: test: ["CMD","node","-e","fetch('http://localhost:3000/api/auth/test').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]`. `GET /api/auth/test` is `@Public` (`auth.controller.ts:62-65`). |
| ⚠️ | No log rotation | all | json-file: `max-size` *"Defaults to -1 (unlimited)"* ([json-file](https://docs.docker.com/engine/logging/drivers/json-file/)). Set it in `/etc/docker/daemon.json` (§7). |
| ⚠️ | `env_file: .env.production` on both apps | `:63`, `:91` | Every app container also gets `POSTGRES_PASSWORD` and `OPS_PASSWORD_HASH`. Acceptable; splitting is optional. |
| ⚠️ | Hairpin for the Report PDF | `:70` | Chromium in the monolith opens `PUBLIC_APP_URL/r/:token`: container → public IP → Caddy. Usually fine on a single host **[reasoning]**. If it fails, give Caddy the network alias `bikecheck.cloud` on `internal` so the container resolves straight to Caddy (same SNI and certificate). |
| ℹ️ | Example says compose sets `NODE_ENV` | `.env.production.example:3` | Compose doesn't; the Dockerfile does (`:26`). Same effect. Never put `NODE_ENV` in `.env.production`: `env_file` beats the image `ENV` **[reasoning]**. |

#### 2.3 `docker/Caddyfile`

| | Item | Where | Finding / fix |
|---|---|---|---|
| ✅ | One origin; `handle`, not `handle_path` | `:21`, `:30` | Matches `setGlobalPrefix('api')` (`main.ts:15`). |
| ✅ | NDJSON not buffered | `:23-25` | `flush_interval -1` *"disables response buffering completely and flushes immediately after each write"*. No default read/write timeout: `response_header_timeout` *"Default: No timeout"* ([reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)). The controller also calls `flushHeaders()` (`ai-chat.controller.ts:58`). |
| ✅ | `encode gzip` vs NDJSON | `:5` | The default `encode` match list has `application/json*` but **not** `application/x-ndjson`, so the chat (`ai-chat.controller.ts:55`) isn't compressed or held back to the 512-byte threshold ([encode](https://caddyserver.com/docs/caddyfile/directives/encode)). Smoke-test with `curl -N` anyway (§7, step 23). |
| ✅ | Bull Board protected | `:15-18` | bull-board honours the global prefix (`node_modules/@bull-board/nestjs/dist/bull-board.root-module.js:34-45`), so it lives at `/api/queues`. `basic_auth` is the ≥2.8 name: *"Prior to v2.8.0, this directive was named `basicauth`"* ([basic_auth](https://caddyserver.com/docs/caddyfile/directives/basic_auth)). |
| ✅ | Internal strava routes hidden | `:29` | Only `/strava/webhook` and `/strava/exchange_token` are exposed. `/strava/gear/*`, `/sync/*`, `/oauth-state`, `/disconnect`, `/mock-webhook` stay internal. |
| ✅ | Cache headers | `:39-42` | `index.html` gets `no-store`; `/assets/*` is `immutable`. Preview shells are `no-store` too (`preview.controller.ts:10`). |
| ✅ | `assetlinks.json` served | `:36-43` | `dist/.well-known/assetlinks.json` exists in the local build. `file_server` sets the type from the extension. |
| ❌ | No `www` site | `:3` | **Fix:** add `www.{$PUBLIC_HOST} { redir https://{$PUBLIC_HOST}{uri} permanent }`. |
| ⚠️ | Missing `/assets/*` falls back to `index.html` | `:38` | A deleted chunk returns HTML with status 200 (TL;DR 6). Better: `@assets path /assets/*` → `file_server` with no fallback (404). |
| ⚠️ | No access log | — | *"access logs are **not enabled by default**"* ([log](https://caddyserver.com/docs/caddyfile/directives/log)). Add `log` (stderr → docker logs, rotated by daemon.json). |
| ⚠️ | No HSTS or security headers | — | Optional: `header Strict-Transport-Security "max-age=31536000"` once HTTPS is proven. |
| ℹ️ | HTTP/3 | compose `:111` | `443/udp` is published; open UDP 443 in the Hetzner firewall too, or HTTP/3 silently falls back. |

#### 2.4 `.env.production.example`

| | Item | Where | Finding / fix |
|---|---|---|---|
| ✅ | Bcrypt hash in single quotes | `:24` | Compose: *"Single-quoted (`'`) values are used literally"* ([interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)). |
| ✅ | Postgres password limited to letters and digits | `:16-18` | Correct: it lands unescaped in the URL (compose `:66`). |
| ❌ | `GOOGLE_CLIENT_ID=` blank | `:31` | Boot crash (TL;DR 2). Mark it **required**. |
| ❌ | `LOKI_HOST=http://localhost:3100` | `:48` | Logs are lost (TL;DR 3). |
| ⚠️ | `CLOUDFLARE_PUBLIC_URL` placeholder | `:40` | Decide r2.dev vs a custom domain first (TL;DR 9). |
| ⚠️ | `JWT_EXPIRATION_DEV` | `:28` | Only read when `NODE_ENV==='development'` (`auth/auth.config.ts:6-8`). Harmless noise. |
| ⚠️ | Missing a Google callback var | — | Once `google.strategy.ts:12` reads an env var (e.g. `GOOGLE_CALLBACK_URL`), add it here. |

#### 2.5 App code that touches infra

| | Item | Where | Fix |
|---|---|---|---|
| ❌ | No `trust proxy` | `main.ts:9` | `NestFactory.create<NestExpressApplication>(…)` + `app.set('trust proxy', 'uniquelocal')`. Caddy sits on the Docker bridge (172.16/12) and sets `X-Forwarded-For` by default ([reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)). Nest: *"configure the HTTP adapter to trust the proxy"* ([rate limiting](https://docs.nestjs.com/security/rate-limiting)). Express `'uniquelocal'` = *"10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7"* ([behind proxies](https://expressjs.com/en/guide/behind-proxies.html)). Cookies aren't affected: `secure` keys off `NODE_ENV`. |
| ❌ | Prod logger is Loki-only | both `app.module.ts` | Add `{ target: 'pino/file', options: { destination: 1 } }` in prod. Optionally pass `basicAuth: { username: LOKI_USER, password: LOKI_TOKEN }` from env for Grafana Cloud. Grafana Cloud Loki uses basic auth: *"your Grafana Cloud user ID as the user name and a Cloud Access Policy token as the password"* ([loki.write](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/)). |
| ❌ | Secret-leaking `console.log` | `mail.service.ts:26,57`; `strava.service.ts:177-178`; `storage.service.ts:85-86` | Delete before the first prod boot. |
| ⚠️ | No helmet | `main.ts` | Optional; Caddy can add headers instead. |
| ⚠️ | Body limits | `bike.controller.ts:43`, `bike-event.controller.ts:34` | Multer caps uploads at 15 MB and Express JSON at its default. Caddy has no limit by default. OK as is. |
| ⚠️ | `CORS_ORIGINS` split without trim | `main.ts:21` | Write `a,b` with no spaces. The web app is same-origin and needs no CORS; the APK needs `https://localhost` (Part A §4). |

---

### 3. Complete env var table

Legend: **Boot** = the app crashes without it; **Feature** = one feature breaks; **Opt** = has a default.

| Var | App | Required? | Prod value shape | In example? | Source |
|---|---|---|---|---|---|
| `NODE_ENV` | both | Boot-ish (Swagger, cookies, logs) | `production` | set by Dockerfile `:26` | `main.ts:38`, `app.module.ts:37` |
| `PORT` | both | Opt (3000/3002) | `3000` / `3002` | compose `:65`, `:93` | `main.ts:48` |
| `DATABASE_URL` | both | Boot | `postgresql://u:p@db-monolith:5432/monolith`, `…@db-strava-service:5432/strava_service` | compose `:66`, `:94` | `prisma.service.ts:9`, `prisma.config.ts:14`, `database.service.ts:14` |
| `REDIS_HOST` | both | Boot (BullMQ) | `redis` | compose `:67`, `:95` | `app.module.ts:59`, strava `:17` |
| `CORS_ORIGINS` | monolith | Opt (falls back to reflecting any origin) | `https://bikecheck.cloud[,https://localhost]` | ✅ `:13` | `main.ts:21` |
| `JWT_SECRET` | monolith | **Boot** | 48+ random bytes, base64 | ✅ `:27` (change-me) | `jwt.strategy.ts:10-12` |
| `JWT_EXPIRATION_PROD` | monolith | Opt (86400) | seconds | ✅ `:29` | `auth.config.ts:8` |
| `JWT_EXPIRATION_DEV` | monolith | unused in prod | — | ✅ `:28` | `auth.config.ts:7` |
| `REFRESH_TOKEN_EXPIRATION_DAYS` | monolith | Opt (365) | int | ✅ `:30` | `auth.config.ts:11` |
| `GOOGLE_CLIENT_ID` | monolith | **Boot** | `…apps.googleusercontent.com` (web client) | ✅ `:31`, **blank** | `google.strategy.ts:10`, `googleAuth.service.ts:36` |
| `GOOGLE_CLIENT_SECRET` | monolith | Feature (web Google login) | secret | ✅ `:32` | `google.strategy.ts:11` |
| *(Google callback URL)* | monolith | Feature | `https://bikecheck.cloud/api/auth/google/callback` | ❌ hard-coded | `google.strategy.ts:12` |
| `FRONTEND_URL` | monolith | Feature (Google redirect) | `https://bikecheck.cloud` | ✅ `:11` | `auth.controller.ts:266,276` |
| `PUBLIC_APP_URL` | monolith | Feature (share links, verification mail, PDF, preview) | `https://bikecheck.cloud` | ✅ `:9` | `_config/public-app-origin.ts:6`, `mail-texts.ts:69` |
| `SPA_INDEX_HTML` | monolith | Feature (`/u/*`, `/r/*`) | `/srv/spa/index.html` | compose `:71` | `preview.service.ts:59,246` |
| `OPENAI_API_KEY` | monolith | Feature (chat), read implicitly by `@ai-sdk/openai` | `sk-…` | ✅ `:33` | `ai-chat.service.ts:3,125` |
| `GEMINI_API_KEY` | monolith | Feature (ride summaries) | key | ✅ `:34` | `gemini.service.ts:13` |
| `AI_CHAT_DAILY_TOKEN_BUDGET` | monolith | Opt (default constant) | int | ✅ `:35` | `ai-chat.service.ts:432` |
| `CLOUDFLARE_ACCESS_KEY_ID` / `_SECRET_ACCESS_KEY` | monolith | Feature (uploads, preview logo) | R2 token scoped to the prod bucket | ✅ `:36-37` | `storage.service.ts:53-54` |
| `CLOUDFLARE_ENDPOINT` | monolith | Feature | `https://<acct>.r2.cloudflarestorage.com` (or `.eu.` jurisdiction) | ✅ `:38` | `storage.service.ts:51` |
| `CLOUDFLARE_BUCKET_NAME` | monolith | Opt (`bikecheck`) | separate prod bucket recommended | ✅ `:39` | `storage.service.ts:57` |
| `CLOUDFLARE_PUBLIC_URL` | monolith | Feature (URLs stored in DB, mail logo) | custom domain, or `https://pub-….r2.dev` | ✅ `:40` | `storage.service.ts:87,177`, `mail-layout.ts:29` |
| `CLOUDFLARE_STORAGE_TOKEN`, `CLOUDFLARE_TOKEN_VALUE`, `UPLOAD_DIR` | — | **unused** (only in dev `.env`) | — | no | — |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | monolith | Opt (push off); a malformed value crashes boot (`JSON.parse`, `push.service.ts:24-25`) | `base64 -w0 sa.json` from project `bikecheck-c55fd` | ✅ `:41` | `push.service.ts:18` |
| `RESEND_API_KEY` | monolith | Feature: without it, no verification mail, so e-mail sign-ups stay unverified (ADR 0031) | `re_…` | ✅ `:42` | `mail.service.ts:25` |
| `MAIL_FROM` | monolith | Feature | `BikeCheck <info@email.bikecheck.cloud>` | ✅ `:43` | `mail.service.ts:27` |
| `STRAVA_SERVICE_URL` | monolith | Feature | `http://strava-service:3002` | compose `:69` | `strava.service.ts:104,136,182,596` |
| `STRAVA_SERVICE_URL` | strava | Feature (OAuth `redirect_uri`) | `https://bikecheck.cloud` | compose `:97` | `tokens.service.ts:48` |
| `INTERNAL_API_SECRET` | both | Feature (monolith ↔ strava calls) | random, identical in both | ✅ `:46` | `internal-auth.guard.ts:15`, `strava.service.ts:107` |
| `LOKI_HOST` | both | Opt, but logs are lost if unreachable | Grafana Cloud push URL (+ auth: code change) | ✅ `:48` (bad default) | `app.module.ts:76`, strava `:38` |
| `STRAVA_CLIENT_ID` / `_SECRET` | strava | Feature | **rotated** secret | ✅ `:51-52` | `tokens.service.ts:46,101-102,159-160` |
| `APP_DEEP_LINK_URL` | strava | Feature | `bikecheck://` | ✅ `:54` | `tokens.controller.ts:55` (web users also land on `bikecheck://strava-connected`: Part A §3.2) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | compose | Boot | alphanumeric | ✅ `:17-18` | compose `:10-11` |
| `PUBLIC_HOST` | caddy | Boot | `bikecheck.cloud` | ✅ `:8` | `Caddyfile:3` |
| `OPS_USER` / `OPS_PASSWORD_HASH` | caddy | Boot (Caddyfile parse) | bcrypt from `caddy hash-password` | ✅ `:23-24` | `Caddyfile:16-17` |
| `VITE_API_BASE_URL` | SPA (build) | **Boot of the SPA** | web `/api`; APK `https://bikecheck.cloud/api` | ❌ (local `.env.local` only) | `api/client.ts:4`, `Authentication.tsx:169` |
| `VITE_GOOGLE_CLIENT_ID` | SPA (build) | Feature | same web client ID | ❌ | `main.tsx:26` |
| `VITE_CARTO_KEY` | SPA (build) | Feature (ride maps) | public key; free *"for commercial use up to 1M a month"* ([CARTO basemaps](https://github.com/CartoDB/basemap-styles)) | ❌ | `RideMapLeaflet.tsx:10` |
| `VITE_STRAVA_MICROSERVICE_URL` | SPA | **unused** (only typed in `vite-env.d.ts:7`) | — | — | — |
| `VITE_API_PROXY_TARGET`, `VITE_STRAVA_PROXY_TARGET` | Vite dev server | dev only | — | — | `vite.config.ts:35,39` |

Vite: *"Variables prefixed with `VITE_` will be exposed in client-side source code"*. Mode files: `.env.[mode]` beats `.env.local`, and process env beats everything ([Vite env](https://vite.dev/guide/env-and-mode)). **Fix:** commit `_frontend/bikecheck/.env.web` (`VITE_API_BASE_URL=/api`, plus the two public keys) and `.env.android` (absolute URL). Build with `npm run build -- --mode web` / `--mode android`. Don't use the name `.env.production`: the root `.gitignore` ignores it.

---

### 4. Data, seeding, backups

#### Fresh prod DB

- **Monolith:** 83 migrations; `0_init` creates 27 tables, 13 more migrations add tables; schema has 35 models (hosting.md said 62/32, now outdated). `migration_lock.toml` is present.
- **strava-service:** 2 node-pg-migrate files (`1779196962629_init-strava-tables.mjs`, `1787059200000_add-oauth-states.mjs`). No seed needed.
- **What a usable monolith needs that no migration provides.** These are rows with `user_id IS NULL` where the column exists:
  - `component_groups`
  - `component_types` (`user_id IS NULL`)
  - `events_action` (`user_id IS NULL`)
  - `event_action_targets` (for seeded actions)
  - `event_action_tags` (`user_id IS NULL`)
  - `default_service_intervals`
  - `bike_types`
  - `bike_brands`
  - `bike_models`
  - `organization_roles`
- ADR 0019 lists known drift between `seed_data.json` and the deployed DBs: *"the type `Brakes` exists in every database and in no seed file, `Remote Lever` the reverse, and the category is named `Misc` in the databases and `Other` in the seed file"*. So the dev DB is the de-facto source of truth, not the seed files.
- **Recommended path [reasoning]:**
  - Export once from the dev DB with `psql \copy (SELECT … WHERE user_id IS NULL) TO …` per table, in FK order. A plain `pg_dump --data-only -t` would drag in user-owned rows whose `user_id` has no matching user.
  - Then `SELECT setval(pg_get_serial_sequence('t','id'), max(id)) FROM t` per table.
  - Commit it as `scripts/prodCatalogue.sql` and load it with `docker compose exec -T db-monolith psql … < prodCatalogue.sql` **after** the first `migrate deploy` and **before** the first user. ADR 0019's principle ("a person remembers to run against a database they have a shell on — which production is not") argues for a data migration instead. Your call (§8).
- **Pre-flight drift check [reasoning]:** the dev Dockerfile used `prisma db push` and there is a `db:pulldb` script, so the migration chain may never have been replayed onto an empty Postgres 18. Before ordering the server, run the full chain locally on an empty `postgres:18.1-alpine`, then `prisma migrate diff --from-migrations … --to-schema … --shadow-database-url …` to confirm it equals `schema.prisma`.
- **R2 one-offs:** `static/logo-mail.png` must exist in the prod bucket. It's used by mail (`mail-layout.ts:26-31`) and as the neutral OG card logo (`preview.service.ts:34,160-166`). Run `npm run mail:logo` locally with prod R2 credentials (`apps/monolith/scripts/upload-mail-logo.ts`).

#### Backups

| Layer | What | Cost/retention | Verdict |
|---|---|---|---|
| Hetzner Backups | Daily whole-disk image, *"seven slots for Backups. If all slots are full, the oldest Backup will be deleted"* ([enabling backups](https://docs.hetzner.com/cloud/servers/getting-started/enabling-backups/)). Running-system caveat: *"we cannot guarantee data consistency"* ([backup FAQ](https://docs.hetzner.com/cloud/servers/backups-snapshots/faq/)). | 20 % of the server price, ≈ €1.10/mo on CX23. The 20 % figure comes from search results; Hetzner's pricing UI is JS-rendered and unreadable ([search source](https://docs.hetzner.com/cloud/servers/getting-started/enabling-backups/)). Confirm in the console. | Enable: cheap "whole box" rollback. Not your DB backup of record. |
| Snapshots | Manual, *"up to 30 Snapshots across all projects"* ([overview](https://docs.hetzner.com/cloud/servers/backups-snapshots/overview/)) | per GB-month (price not readable) | Take one before risky upgrades. |
| `pg_dump` → R2 | Nightly `pg_dump -Fc` of **both** DBs. pg_dump makes *"consistent exports even when the database is actively in use"*; custom format is recommended for `pg_restore` ([pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html)). Encrypt (dumps hold bcrypt hashes, e-mails and Strava refresh tokens) **[reasoning]**, upload to a **separate** bucket with a token scoped to it ([R2 tokens](https://developers.cloudflare.com/r2/api/tokens/)), and expire via a lifecycle rule (*"delete objects after N days"*, [R2 lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)). | R2 free tier 10 GB-month (hosting.md) | **The backup of record.** Retention e.g. 14–30 days to match the privacy policy's "rotated". |
| Redis | `redis_data` volume (AOF). It holds the delayed `plan-reminder-queue` jobs (`service-tracking.service.ts:309-318`). | covered only by the Hetzner disk image | Losing it loses pending reminders. Acceptable **[reasoning]**. |

**Restore test (do it once before launch):** spin a scratch `postgres:18.1-alpine`, `pg_restore -d …`, then point a local monolith at it and log in. pg_dump doesn't dump roles (`pg_dumpall --globals-only`, [pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html)). That's fine, because the compose env recreates the role.

---

### 5. Email, push, cron

#### Email (hosting.md's "No email sending" is outdated)

- **Code:** `resend` ^6.28.0 (`_backend/package.json:78`). `MailService` (`mail/mail.service.ts`, ADR 0031) sends verification and welcome mails via the HTTPS API.
  - With no key it warns and no-ops (`:28-31`).
  - Provider errors are logged and swallowed (`:68-75`). With prod logs gone (TL;DR 3) you won't see failures.
- **DNS is already live** (queried 2026-10-04, resolvers 1.1.1.1 / Cloudflare DoH):

| Record | Value | Meaning |
|---|---|---|
| `resend._domainkey.email.bikecheck.cloud TXT` | `p=MIGf…` | Resend DKIM for `email.bikecheck.cloud`, matching `MAIL_FROM`. |
| `send.email.bikecheck.cloud` | CNAME → `send.forge.rmta.net` (MX `feedback.forge.rmta.net`, SPF TXT) | Resend's newer CNAME-style SPF/return-path. Resend: *"For domains created after August 2026, Resend may generate CNAME records instead"* ([manage domains](https://resend.com/docs/dashboard/domains/manage-domains.md)). |
| `_dmarc.bikecheck.cloud TXT` | `v=DMARC1; p=quarantine` | Applies to the subdomain too (no `sp=`) **[reasoning]**. Already past Resend's suggested `p=none` start ([Resend DMARC](https://resend.com/docs/dashboard/domains/dmarc)). Fine if DKIM aligns, and it does (`d=email.bikecheck.cloud`). Optionally add `rua=` for reports. |
| `bikecheck.cloud MX` | `mxavas.forpsi.com` | Inbound mail (`support@bikecheck.cloud`, named in the privacy policy) stays at Forpsi. **Don't touch it when you change the A record.** |
| `bikecheck.cloud TXT` | `v=spf1 a mx include:_spf.forpsi.com -all` | The `a` will also authorise the Hetzner IP after cutover. Harmless; you can drop `a`. |

- **Still to do:** confirm the domain reads "Verified" in the Resend dashboard (can't be seen from outside), create a prod sending-only API key, and test delivery to Gmail (spam folder).
- **Hetzner port 25 block doesn't matter:** the Hetzner FAQ says outbound 25/465 are blocked by default ([cloud FAQ](https://docs.hetzner.com/cloud/servers/faq/), via search), but Resend uses HTTPS.

#### Push

- `firebase-admin` init from `FIREBASE_SERVICE_ACCOUNT_BASE64` (`notification/push.service.ts:15-27`). Optional: without it, push is disabled.
- The Android `google-services.json` is tracked (project `bikecheck-c55fd`), and the Gradle plugin is applied when it's present (`android/app/build.gradle:47-54`).
- **Prod needs:** a service-account key from the **same** project (Firebase: *"Click Generate New Private Key … Securely store the JSON file"*, [admin setup](https://firebase.google.com/docs/admin/setup)), base64 into `.env.production`. Never commit it (it's already in `.gitignore`).

#### Cron / scheduled jobs

- **No cron exists.** `@nestjs/schedule` is not a dependency, and there is no `@Cron`/`@Interval` anywhere.
- **Plan reminders (fa6e0f3)** are BullMQ **delayed jobs** (`plan-reminder-queue`, `delay = reminderAt(day, tz) - now`, `service-tracking.service.ts:309-318`). The time-zone math uses `Intl` (`plan-reminder.ts`). Official Node builds ship full ICU **[reasoning]**. It needs Redis to persist (AOF ✅), not a cron.
- **ADR 0025 file-deletion cron:** *"Status: accepted, not yet built"* (`docs/adr/0025…md:3`). Consequence: deleting a bike **or an account** (ADR 0028) leaves its photos and attachments in R2. That's a GDPR-erasure gap for user photos **[reasoning]**: build it, or state it in the privacy policy.
- **Host-level cron you need:** only the backup job, plus optionally a disk check (§7).

---

### 6. Android release steps (deployment-relevant only)

1. **Remove the dev server** for release: delete `server.url`/`cleartext` (`capacitor.config.ts:10-13`), or make the block conditional on an env var. Capacitor: *"This is not intended for use in production"* ([config](https://capacitorjs.com/docs/config)).
2. **Build the web bundle for the APK** with `--mode android` (`VITE_API_BASE_URL=https://bikecheck.cloud/api`), then `npx cap sync android`. The WebView origin is `https://localhost` (`androidScheme` default `https`, `hostname` default `localhost`, [config](https://capacitorjs.com/docs/config)), so add it to `CORS_ORIGINS`. Cookies: Part A §4.
3. **Signing:** create an upload keystore and wire `signingConfigs` from a git-ignored `keystore.properties` ([app signing](https://developer.android.com/studio/publish/app-signing)). Back up the keystore off-box.
4. **Versioning:** bump `versionCode` (currently `1`, `build.gradle:10`) for every upload.
5. **Artifact:** a signed **AAB**. New apps require Play App Signing: *"you need to configure Play App Signing before you upload your app bundle"* ([app signing](https://developer.android.com/studio/publish/app-signing)).
6. **SDK level:** `targetSdkVersion 36` (`variables.gradle:4`) ✅ meets *"By August 31, 2026: New apps and app updates must target Android 16 (API level 36)"* ([target API](https://support.google.com/googleplay/android-developer/answer/11926878)).
7. **Play Console:**
   - US$25 one-time fee; ID may be required ([registration](https://support.google.com/googleplay/android-developer/answer/6112435)).
   - **Internal testing:** *"up to 100 testers"* and you *"can start an internal test before completing app setup"* ([testing](https://support.google.com/googleplay/android-developer/answer/9845334)).
   - **Production gate for personal accounts created after 13 Nov 2023:** *"a closed test … with a minimum of 12 testers who have been opted in continuously for at least 14 days"* ([testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)). Budget **≥ 2 weeks**.
8. **App content:**
   - **Privacy policy URL:** `https://bikecheck.cloud/legal/privacy`. The route `/legal/:document` is outside the auth shell (`App.tsx:51`).
   - **Data safety:** *"All developers … must complete the Data safety form, including apps on closed, open, or production testing tracks"* ([data safety](https://support.google.com/googleplay/android-developer/answer/10787469)).
   - **Account deletion:** in-app exists (ADR 0028, `DELETE /api/users/me`, `user.controller.ts:26,45`). Play also requires *"a web link resource where users can request app account deletion"* ([account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)). **Missing ⚠️:** add a public page, e.g. `/legal/delete-account`, with instructions and the support e-mail.
9. **App Links:**
   - Add the **app signing key** SHA-256 (Play Console → App integrity), plus the upload key's if you sideload release builds, to `public/.well-known/assetlinks.json`, then redeploy the SPA.
   - The file must be served over HTTPS at `/.well-known/assetlinks.json` as `application/json`, with no redirects.
   - Verify with `adb shell pm verify-app-links --re-verify com.bikecheck.app` and `adb shell pm get-app-links com.bikecheck.app` (state `verified`) ([verify App Links](https://developer.android.com/training/app-links/verify-android-applinks)).
   - The manifest's `autoVerify` filter is for `/verify-email` only (`AndroidManifest.xml:42-49`).
10. **Cleartext:** after step 1, nothing needs HTTP. There is no `network_security_config`, so platform defaults apply **[reasoning]**.

---

### 7. Go-live runbook: "order the server" → "first user signs up"

Tags: **[code]** repo change, **[console]** web consoles, **[server]** shell on the VPS, **[dns]** Forpsi DNS.

#### Phase A: code, before any server exists

1. **[code]** Delete the secret-leaking `console.log`s (`mail.service.ts:26,57`; `strava.service.ts:177-178`; `storage.service.ts:85-86`).
2. **[code]** Add a prod stdout pino target in both `app.module.ts`; optionally wire `basicAuth` for Grafana Cloud Loki.
3. **[code]** `trust proxy` (`main.ts`), `app.enableShutdownHooks()` (both apps), `exec node` + `init: true` (compose).
4. **[code]** Google callback URL from env (Part A §2.5).
5. **[code]** Caddyfile: `www` redirect, `log`, a 404 for missing `/assets/*`. Compose: `image:` tags, optional monolith healthcheck.
6. **[code]** Frontend `.env.web` / `.env.android` (non-secret), and make the build scripts pass `--mode`.
7. **[code]** Preview shell: re-read `index.html` on mtime change, or document "restart monolith after every SPA deploy".
8. **[code]** Catalogue: produce `prodCatalogue.sql` (or a data migration) from the dev DB (§4).
9. **[code]** Repo hygiene: `git rm` the three dump files and scrub `subscription-url.md`. The repo is public, so consider a history rewrite. Extend `.dockerignore`.
10. **[code]** Privacy policy (`src/legal/privacy.*.json`):
    - add Resend (e-mail) and CARTO (map tiles see the IP) as processors;
    - keep "servers in Germany", which means choosing nbg1/fsn1, not hel1;
    - state the backup retention you implement;
    - address R2 orphans (ADR 0025).
    - Separately, `RideMapLeaflet.tsx:43` hides attribution (`attributionControl={false}`), but CARTO requires *"© OpenStreetMap, © CARTO"* ([CARTO](https://github.com/CartoDB/basemap-styles)).
11. **[code]** **Local dry run [reasoning]:**
    - `docker compose -f docker-compose.prod.yml build`;
    - `up` with `PUBLIC_HOST=localhost` (Caddy issues a local CA cert);
    - confirm 83+2 migrations apply on empty PG18;
    - load the catalogue;
    - register, add a bike, run a service.

#### Phase B: accounts and consoles

12. **[console] Hetzner:** upload an SSH key. *"After the server has been created, it is no longer possible to add an SSH key via the Hetzner Console"* ([create server](https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/)).
13. **[console] Hetzner Cloud Firewall:** inbound TCP 22 (ideally your IP only), TCP 80, TCP 443, UDP 443, ICMP. *"If you do not set any rule, all inbound traffic will automatically be blocked"*; *"We do not charge for our Cloud Firewalls"* ([firewalls](https://docs.hetzner.com/cloud/firewalls/overview/)). It filters outside the VM (*"only applies to packets that leave the layer 2 domain"*, [firewall FAQ](https://docs.hetzner.com/cloud/firewalls/faq/)), so Docker's iptables can't punch through it. That matters because Docker published ports *"bypass your firewall rules"* for ufw ([Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [packet filtering](https://docs.docker.com/engine/network/packet-filtering-firewalls/)).
14. **[console] Cloudflare R2:**
    - a prod bucket, separate from dev (optionally EU jurisdiction);
    - a token scoped to it: *"you can scope your token to a set of buckets"* ([R2 tokens](https://developers.cloudflare.com/r2/api/tokens/));
    - a backup bucket with a lifecycle rule;
    - decide the public URL (r2.dev now vs. moving DNS to Cloudflare for `files.bikecheck.cloud`).
15. **[console] Third-party keys:**
    - **Resend:** verify status, prod API key.
    - **Firebase:** new service-account key.
    - **OpenAI/Gemini:** prod keys with spend caps.
    - **Strava:** **rotate the client secret** and set *"Authorization Callback Domain"* to `bikecheck.cloud`: *"When taking your app live, change it to a real domain"* ([Strava getting started](https://developers.strava.com/docs/getting-started/)). Note capacity: new apps start at *"an athlete capacity of 1"* (Single Player Mode), self-upgrade to 10, and beyond that *"Until your app has been reviewed, you won't be able to authenticate any additional athletes"* ([Strava rate limits](https://developers.strava.com/docs/rate-limits/)).
    - **Google OAuth:** redirect URIs and consent screen: Part A §2.4.
16. **[console] GitHub:** repo secrets `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_KNOWN_HOSTS`. *"secrets are not passed to the runner when a workflow is triggered from a forked repository"* ([secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)). App secrets stay **only** in `/opt/bikecheck/.env.production` on the server **[reasoning]**.

#### Phase C: server

17. **[console]** Create the server:
    - CX23, **Ubuntu 24.04**, **nbg1 or fsn1**;
    - IPv4 + IPv6 (IPv4 *"€ 0.50 … per month (excl. VAT)"*, IPv6 free, [primary IPs](https://docs.hetzner.com/cloud/servers/primary-ips/overview/));
    - SSH key, attach the firewall, **enable Backups**.
    - Price after 15 Jun 2026: CX23 *"€5.49"* excl. VAT ([price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)).
    - Optional rDNS → `bikecheck.cloud`; it must be forward-confirmed ([rDNS](https://docs.hetzner.com/cloud/servers/cloud-server-rdns/)). Only relevant if the box ever sends mail itself.
18. **[server]** Baseline hardening:
    - `apt update && apt full-upgrade`;
    - create a `deploy` user with sudo and copy `authorized_keys`;
    - `/etc/ssh/sshd_config.d/99-hardening.conf` with `PasswordAuthentication no` and `PermitRootLogin prohibit-password`. Drop-ins *"override those in the main configuration file"*; run `sudo sshd -t`, then `sudo systemctl restart ssh.service` ([OpenSSH on Ubuntu](https://ubuntu.com/server/docs/how-to/security/openssh-server/)).
    - `unattended-upgrades` is *"installed by default"* and applies `-security` ([auto updates](https://ubuntu.com/server/docs/how-to/software/automatic-updates/)). Decide on `Unattended-Upgrade::Automatic-Reboot`.
    - fail2ban is optional once passwords are off **[reasoning]**.
    - Add 2 GB swap as a safety net for Chromium spikes; check `swapon --show` first **[reasoning]**.
19. **[server]** Docker Engine from the official apt repo: keyring + `docker.sources` + `docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin` ([install](https://docs.docker.com/engine/install/ubuntu/)). Add `deploy` to the `docker` group (*"grants root-level privileges"*, [post-install](https://docs.docker.com/engine/install/linux-postinstall/)). Then `/etc/docker/daemon.json` → `{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}` ([json-file](https://docs.docker.com/engine/logging/drivers/json-file/)), and restart Docker.
20. **[server]** `/opt/bikecheck/` gets:
    - `docker-compose.prod.yml` and `docker/Caddyfile`;
    - `.env.production` (`chmod 600`, real secrets, `JWT_SECRET`/`INTERNAL_API_SECRET` via `openssl rand -base64 48`, `OPS_PASSWORD_HASH` via `docker run --rm caddy:2 caddy hash-password --plaintext '…'`);
    - `_frontend/bikecheck/dist/` (built in web mode). Fill this **before** the first `up`.
    - If images are private, run `docker login ghcr.io` once with a classic PAT holding `read:packages`. *"When you first publish a package, the default visibility is private"* ([GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)).

#### Phase D: DNS (Forpsi)

21. **[dns]**
    - A day ahead, lower the apex A TTL (currently 1800 s) to 300.
    - At cutover: `bikecheck.cloud A` → Hetzner IPv4, `AAAA` → Hetzner IPv6 (only if you've tested IPv6 to the box).
    - Keep `www` (CNAME) and **leave MX/SPF/DMARC/Resend records untouched**.
    - DNSSEC is on (DS present, AD flag), which is fine for A changes at the same provider.
    - CAA is optional: *"If you don't care about CAA, you generally don't have to do anything"* ([LE CAA](https://letsencrypt.org/docs/caa/)). If you add one, allow every CA Caddy may fall back to **[reasoning]**.
    - Caddy needs A/AAAA pointing at the box, ports 80/443 reachable and a persistent data dir ([auto HTTPS](https://caddyserver.com/docs/automatic-https)). `caddy_data` is a named volume ✅. Don't loop `up`/`down` on a broken config: *"you are likely to hit rate limits which can block your access to HTTPS for up to a week"*.

#### Phase E: first deploy and smoke

22. **[server]** `docker compose --env-file .env.production -f docker-compose.prod.yml pull` (or `build` the first time), then `up -d`. Then `docker compose logs -f monolith strava-service caddy`: expect *"All migrations have been successfully applied"*, the node-pg-migrate run, and a Caddy certificate obtained.
23. **[server]** Checks:
    - `docker compose exec -T db-monolith psql -U bikecheck -d monolith < prodCatalogue.sql`; spot-check row counts.
    - `curl -I https://bikecheck.cloud/` returns 200 with `cache-control: no-store`.
    - `/.well-known/assetlinks.json` returns `application/json`.
    - `/api/auth/test` returns 200.
    - `/api/queues` returns 401.
    - `/api` and `/api-json` return the SPA, **not** Swagger.
    - `curl -N` on the chat with a cookie shows a `ping` line every 10 s.
24. **[console/server]** Strava:
    - delete the ngrok subscription;
    - create one for `https://bikecheck.cloud/strava/webhook` with the **new** secret (the handshake echoes `hub.challenge`; the verify token `STRAVA` is hard-coded at `strava-webhook.service.ts:9`);
    - connect Strava from a test account.
25. **[server]** Feature smoke:
    - publish a report, then print the PDF (proves the hairpin);
    - open `/u/<handle>` and `/r/<token>` (OG shell);
    - upload a bike photo (R2 + URL origin);
    - trigger a push from an Android build.
26. **[server]** Run `npm run mail:logo` against the prod bucket (from the dev machine with prod R2 env) if the bucket is new.

#### Phase F: backups and monitoring (before inviting anyone)

27. **[server]** `/usr/local/bin/bikecheck-backup.sh` + a systemd timer or cron at 03:30:
    - `docker compose exec -T db-monolith pg_dump -U $POSTGRES_USER -Fc monolith`, and the same for `strava_service`;
    - encrypt (e.g. `age`) and upload with `rclone` to the backup bucket;
    - on success, `curl` a Healthchecks.io ping (free *"Monitor 20 jobs"*, [Healthchecks](https://healthchecks.io/pricing/)).
    - Do **one restore test** (§4).
28. **[console]** UptimeRobot free (*"50 monitors"*, *"5 min. monitoring interval"*, described as for *"hobby and non-profit projects"*, [UptimeRobot](https://uptimerobot.com/pricing/)):
    - keyword monitor on `https://bikecheck.cloud/api/auth/test`;
    - HTTP monitor on `/`;
    - SSL-expiry alert.
29. **[server]** Disk: a daily cron `df --output=pcent / | tail -1` that hits the Healthchecks `/fail` endpoint above 80 %. Weekly `docker image prune -f` (or after each deploy). Logs: `docker logs` with rotation is enough for month one. Grafana Cloud only after the auth code change **[reasoning]**.

#### Phase G: CI/CD (can follow the first manual deploy)

> **Built, and it differs from this outline:** deploys run from a `vX.Y.Z` tag on `main`, with a pre-deploy dump and a smoke check, not from every push. The `production` branch is retired. See [docs/deploy.md](../deploy.md) (#244).

30. **[code]** `.github/workflows/deploy.yml`. Actions are *"free for public repositories that use standard GitHub-hosted runners"* ([billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions)). Outline (pin actions to SHAs as GitHub's own examples do; versions below are **[reasoning]**):

```yaml
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, packages: write }   # GHCR push needs packages: write
jobs:
  images:
    runs-on: ubuntu-latest
    strategy: { matrix: { app: [monolith, strava-service] } }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v6
        with:
          context: _backend
          file: _backend/Dockerfile.prod
          build-args: APP=${{ matrix.app }}
          push: true
          tags: ghcr.io/jaffator/bikecheck-${{ matrix.app }}:${{ github.sha }}
  spa:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: _frontend/bikecheck } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: _frontend/bikecheck/package-lock.json }
      - run: npm ci && npm run build -- --mode web     # tsc -b && vite build --mode web
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: _frontend/bikecheck/dist }
  deploy:
    needs: [images, spa]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - run: |   # key + known_hosts from secrets
          install -m 600 /dev/null ~/.ssh/id && echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id
          echo "${{ secrets.DEPLOY_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
          rsync -az -e "ssh -i ~/.ssh/id" dist/ deploy@${{ secrets.DEPLOY_HOST }}:/opt/bikecheck/_frontend/bikecheck/dist/   # no --delete
          ssh -i ~/.ssh/id deploy@${{ secrets.DEPLOY_HOST }} "cd /opt/bikecheck && /usr/local/bin/bikecheck-backup.sh && \
            TAG=${{ github.sha }} docker compose --env-file .env.production -f docker-compose.prod.yml pull && \
            TAG=${{ github.sha }} docker compose --env-file .env.production -f docker-compose.prod.yml up -d && \
            docker compose -f docker-compose.prod.yml restart monolith && docker image prune -f"
```

- GHCR login with `GITHUB_TOKEN` and `permissions: packages: write` ([GHCR in Actions](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions)).
- **Migration order:** a pre-deploy dump, then the new container runs `migrate deploy`, then the app boots. Migrations are forward-only, so rollback means restoring the dump **[reasoning]**.
- **Downtime:** ~10–30 s of 502s while containers recreate; Strava retries webhooks (hosting.md C1).

#### Phase H: first user

31. **[server/console]**
    - Register with e-mail on `https://bikecheck.cloud`;
    - the verification mail arrives (check Gmail spam once);
    - verify (on Android, the App Link opens the app once assetlinks has the Play key);
    - the welcome mail arrives;
    - add a bike: the catalogue lists component types and actions;
    - run a service; connect Strava; a ride arrives via the webhook.

    Then invite internal testers (Play internal track) and start the 14-day closed test.

---

### 8. Open questions / unverifiable

- **Catalogue delivery:** a one-off SQL load or a data migration (ADR 0019's spirit)? The dev DB has drifted from `seed_data.json`. Which DB is canonical?
- **R2 public origin:** keep `r2.dev` for launch (rate limit undocumented), or move bikecheck.cloud DNS to Cloudflare to get `files.bikecheck.cloud`? That migration means recreating MX/SPF/DMARC/Resend records and re-doing DNSSEC DS at Forpsi. Decide **before** the first prod upload (full URLs are stored). Partial-CNAME availability per Cloudflare plan was not checked.
- **Same R2 bucket for dev and prod?** Today `CLOUDFLARE_BUCKET_NAME="bikecheck"` in dev. Recommendation: separate.
- **Hetzner Backups percentage (20 %) and snapshot price:** not readable from first-party pages (JS-rendered); from search snippets. The cost-optimized page also rendered CX23 as "currently unavailable" at fetch time. Check stock in nbg1/fsn1; fallback CX33.
- **Migration chain on empty Postgres 18:** not executed in this research (read-only). Do the dry run (§4).
- **Caddy `encode` and NDJSON:** docs say `application/x-ndjson` isn't in the default match list, but behaviour wasn't tested. Verify with `curl -N`.
- **Hairpin from the container to the public IP:** expected to work, not tested.
- **Resend domain status and region:** DNS records exist; dashboard status and sending region (EU?) are unknown.
- **Grafana Cloud vs plain `docker logs`:** needs code for basic auth. Your call.
- **ÚOOÚ/Czech cookie rule:** EU Art. 5(3) text (as amended) exempts storage *"strictly necessary for an information society service explicitly requested by the user"* ([Directive 2002/58/EC Art. 5, legislation.gov.uk copy](https://www.legislation.gov.uk/eudr/2002/58/article/5)). The app sets only auth cookies plus preference localStorage, with no analytics, so **no consent banner is needed [reasoning]**. Czech transposition: § 89(3) ZEK, per an ÚOOÚ seminar deck found by search ([ÚOOÚ PDF](https://uoou.gov.cz/media/seminare-uoou/prezentace/2024-06-12-p04-praxe-uoou-v-oblasti-cookies.pdf)), not fetched. The EUR-Lex pages returned empty to the fetcher.
- **Strava app capacity:** if more than 10 testers will connect Strava, submit the Strava review early ([rate limits](https://developers.strava.com/docs/rate-limits/)).
- **Web users after Strava OAuth** are redirected to `bikecheck://strava-connected` (`tokens.controller.ts:55`): see Part A §3.2.

---

### 9. Sources (all fetched 2026-10-04)

| URL | Used for |
|---|---|
| https://docs.docker.com/engine/install/ubuntu/ | Supported Ubuntu (24.04), apt repo steps, packages, *"ports bypass your firewall rules"* |
| https://docs.docker.com/engine/network/packet-filtering-firewalls/ | Published ports diverted before ufw |
| https://docs.docker.com/engine/logging/drivers/json-file/ | No rotation by default; daemon.json `max-size`/`max-file` |
| https://docs.docker.com/engine/install/linux-postinstall/ | `docker` group = root-level privileges |
| https://docs.docker.com/reference/compose-file/services/ | `init`, `restart: unless-stopped`, `depends_on` conditions |
| https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/ | `--env-file`, single quotes literal |
| https://hub.docker.com/_/postgres | PG18 `PGDATA` and `VOLUME /var/lib/postgresql` |
| https://docs.hetzner.com/cloud/firewalls/overview/ | Free, default inbound drop, limits |
| https://docs.hetzner.com/cloud/firewalls/faq/ | Stateful, applies to packets leaving L2 |
| https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/ | Creation steps, SSH key only at creation, 7 backup slots |
| https://docs.hetzner.com/cloud/servers/getting-started/enabling-backups/ | Daily backups, 7 slots, oldest deleted |
| https://docs.hetzner.com/cloud/servers/backups-snapshots/faq/ | No consistency guarantee on a running system |
| https://docs.hetzner.com/cloud/servers/backups-snapshots/overview/ | Snapshot limit 30 |
| https://docs.hetzner.com/cloud/servers/primary-ips/overview/ | IPv4 €0.50/mo, IPv6 free |
| https://docs.hetzner.com/cloud/servers/cloud-server-rdns/ | rDNS steps, FCrDNS |
| https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/ | CX23 €5.49 / CX33 €8.49 from 15 Jun 2026 |
| https://docs.hetzner.com/cloud/servers/faq/ | Port 25/465 blocked by default (via search) |
| https://www.hetzner.com/cloud/cost-optimized/ | CX23 spec, FSN/NBG/HEL (prices redacted in fetch) |
| https://caddyserver.com/docs/caddyfile/directives/reverse_proxy | `flush_interval -1`, X-Forwarded-* defaults, no read timeouts |
| https://caddyserver.com/docs/caddyfile/directives/encode | Default match list (no x-ndjson), 512-byte threshold |
| https://caddyserver.com/docs/caddyfile/directives/basic_auth | Directive name since 2.8, bcrypt, hash-password |
| https://caddyserver.com/docs/caddyfile/directives/log | Access logs off by default |
| https://caddyserver.com/docs/automatic-https | Prerequisites, redirects, rate-limit warning |
| https://letsencrypt.org/docs/caa/ | CAA optional, example |
| https://www.prisma.io/docs/orm/reference/prisma-config-reference | Config-relative paths, explicit env loading, `--config` |
| https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 | `prisma-client-js` to be removed, adapters, Node 20.19 |
| https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate | `migrate deploy` in CI/CD |
| https://www.postgresql.org/docs/18/app-pgdump.html | Consistent dumps, `-Fc`, no globals |
| https://playwright.dev/docs/docker | `--ipc=host`, `--init`, non-root + seccomp for crawling |
| https://playwright.dev/docs/browsers | headless shell default, `--only-shell` |
| https://docs.nestjs.com/security/rate-limiting | `trust proxy` behind a proxy |
| https://docs.nestjs.com/fundamentals/lifecycle-events | Shutdown hooks off by default |
| https://expressjs.com/en/guide/behind-proxies.html | `trust proxy` values, `uniquelocal` ranges |
| https://docs.bullmq.io/guide/going-to-production | AOF, `noeviction`, graceful close |
| https://vite.dev/guide/env-and-mode | Env file priority, `--mode`, VITE_ vars bundled |
| https://capacitorjs.com/docs/config | `server.url`/`cleartext` not for production; scheme/hostname defaults |
| https://capacitorjs.com/docs/android/deploying-to-google-play | Capacitor apps deploy like native apps |
| https://developer.android.com/studio/publish/app-signing | Play App Signing, upload key, `keystore.properties` |
| https://developer.android.com/training/app-links/verify-android-applinks | assetlinks hosting rules, `pm verify-app-links` |
| https://developer.android.com/google/play/requirements/target-sdk | API 36 from 31 Aug 2026 |
| https://support.google.com/googleplay/android-developer/answer/11926878 | Target API dates |
| https://support.google.com/googleplay/android-developer/answer/14151465 | 12 testers × 14 days for new personal accounts |
| https://support.google.com/googleplay/android-developer/answer/9845334 | Internal testing ≤100, before setup completes |
| https://support.google.com/googleplay/android-developer/answer/6112435 | $25 fee, ID |
| https://support.google.com/googleplay/android-developer/answer/13327111 | In-app + web deletion link |
| https://support.google.com/googleplay/android-developer/answer/10787469 | Data safety mandatory incl. testing tracks |
| https://firebase.google.com/docs/admin/setup | Service-account key generation |
| https://developers.cloudflare.com/r2/buckets/public-buckets/ | r2.dev rate-limited/dev-only; custom domain needs a CF zone |
| https://developers.cloudflare.com/r2/api/tokens/ | Bucket-scoped tokens |
| https://developers.cloudflare.com/r2/buckets/object-lifecycles/ | Delete-after-N-days rules |
| https://resend.com/docs/dashboard/domains/manage-domains.md | SPF/DKIM records, CNAME style after Aug 2026 |
| https://resend.com/docs/dashboard/domains/introduction.md | Subdomain recommendation |
| https://resend.com/docs/dashboard/domains/dmarc | `p=none` start, `_dmarc` placement |
| https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions | GHCR login via GITHUB_TOKEN, `packages: write` |
| https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry | Private by default, `read:packages` PAT |
| https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions | Secrets handling |
| https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions | Actions free for public repos |
| https://ubuntu.com/server/docs/how-to/software/automatic-updates/ | unattended-upgrades default on |
| https://ubuntu.com/server/docs/how-to/security/openssh-server/ | `sshd_config.d` drop-ins, `sshd -t`, restart |
| https://developers.strava.com/docs/getting-started/ | Callback domain, single-player mode |
| https://developers.strava.com/docs/rate-limits/ | Capacity 1 → 10 → review; rate limits |
| https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/ | Grafana Cloud Loki basic auth (via search) |
| https://uptimerobot.com/pricing/ | Free: 50 monitors, 5 min, hobby/non-profit |
| https://healthchecks.io/pricing/ | Free: 20 checks |
| https://github.com/CartoDB/basemap-styles | CARTO key limits, attribution |
| https://www.legislation.gov.uk/eudr/2002/58/article/5 | ePrivacy Art. 5(3) as amended (strictly-necessary exemption) |
| https://uoou.gov.cz/media/seminare-uoou/prezentace/2024-06-12-p04-praxe-uoou-v-oblasti-cookies.pdf | ÚOOÚ cookie practice (search hit, not fetched) |

**Live DNS/HTTP checks (2026-10-04):** `nslookup` @1.1.1.1 and Cloudflare DoH for bikecheck.cloud A/AAAA/NS/MX/TXT/CAA/DS, `_dmarc`, `resend._domainkey.email`, `send.email`; `curl https://bikecheck.cloud` (443 refused, 80 → 200 Forpsi).

**Repo files read:**
- Prod config: `_backend/{Dockerfile.prod,.dockerignore,.npmrc,package.json,nest-cli.json,tsconfig*.json}`, `docker-compose.prod.yml`, `docker/Caddyfile`, `.env.production.example`.
- Backend apps: `apps/monolith/{prisma.config.ts,tsconfig*.json,prisma/schema.prisma,prisma/migrations/*}`, both apps' `main.ts`/`app.module.ts`, and in monolith `src/`: `_guards/user-throttler.guard.ts`, `auth/*`, `mail/*`, `notification/push.service.ts`, `service-tracking/*`, `preview/*`, `storage/storage.service.ts`, `report/report-pdf.service.ts`, `ai-chat/*`, `user/user.controller.ts`.
- strava-service: `src/{tokens,strava-webhook}/*`, `migrations/*`.
- Seed: `scripts/seedData/main_dev.ts`, `main_tests.ts`, `upload-mail-logo.ts`.
- Frontend: `{vite.config.ts,capacitor.config.ts,package.json,public/*,src/api/client.ts,src/App.tsx,src/legal/*,src/components/RideMapLeaflet.tsx}`.
- Android: `android/{variables.gradle,app/build.gradle,app/src/main/AndroidManifest.xml,app/google-services.json}`.
- Docs: `docs/adr/0019,0025,0028`, `docs/research/hosting.md`.
