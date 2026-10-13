# Deploy

## Umami (cookieless stats for the Marketing Website and the App)

Umami runs as `umami` + `db-umami` in `docker-compose.prod.yml`, behind Caddy on `STATS_HOST`.
The tracker is served as `TRACKER_SCRIPT_NAME` and posts to `COLLECT_API_ENDPOINT`, so ad blockers
that match `script.js` and `/api/send` let it through.

1. DNS: an A record `stats.bikecheck.cloud` → the server IP, like the other two hosts.
2. `.env.production`: `STATS_HOST`, `UMAMI_APP_SECRET=$(openssl rand -hex 32)`, `TRACKER_SCRIPT_NAME`,
   `COLLECT_API_ENDPOINT` (see `.env.production.example`). Leave both `UMAMI_WEBSITE_ID_*` empty for now.
3. Deploy. Caddy fetches the certificate for the new host on first request.
4. Log in at `https://stats.bikecheck.cloud` as `admin` / `umami` and change the password at once:
   Settings → Profile → Change password.
5. Settings → Websites → Add:
   - **Web**, domain `bikecheck.cloud` → its ID into `UMAMI_WEBSITE_ID_WEB`;
   - **App**, domain `app.bikecheck.cloud` → its ID into `UMAMI_WEBSITE_ID_APP`. The Android shell
     reports to the same website with hostname `localhost`.
6. Rebuild caddy: both IDs are baked into the static builds, an empty one ships that build without the tracker.

### Android APK

The APK is built locally (`npm run build`, mode production), so it tracks only when
`_frontend/bikecheck/.env.production.local` (git-ignored) holds:

```
VITE_UMAMI_WEBSITE_ID=<the App ID>
VITE_UMAMI_SCRIPT_URL=https://stats.bikecheck.cloud/<TRACKER_SCRIPT_NAME>
```

`npm run dev` never reads that file, so development never counts.
