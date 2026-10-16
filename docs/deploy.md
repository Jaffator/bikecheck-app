# Deploy

Production is one Hetzner box running `docker-compose.prod.yml` from a git clone in `/opt/bikecheck`.
CI builds the images; the server only pulls them. Nothing ships without a `vX.Y.Z` tag on `main`.

## Shipping a release

- **`npm run ship`** does the whole way below in one go, with [scripts/ship.mjs](../scripts/ship.mjs). Commit your work first; it never commits it for you.
  1. Stops on uncommitted changes, and when nothing is ahead of `origin/main`.
  2. Picks the version (the same menu), or keeps the one your package files already carry ahead of the last tag, so a rerun skips the bump. Shows branch, version and commits, asks to confirm.
  3. On `main` it moves your commits to a new `release/vX.Y.Z` and resets `main` to `origin`; on a branch it stays there.
  4. Commits the bump, pushes, opens the PR (or reuses the open one), and lets GitHub merge `main` into the branch when it is behind.
  5. Watches the required checks. A failure prints the failed check, its link and the last 40 lines of its log, and stops with the PR open: fix, commit, rerun.
  6. Merges (merge commit), deletes the branch, switches to an up-to-date `main`, then asks whether to deploy, which is step 4 onward of `deploy:production`.
- **Every push / PR to `main`** runs [ci.yml](../.github/workflows/ci.yml): typecheck of monolith, strava-service and frontend, plus the backend `UNIT` and `E2E` tests. It deploys nothing.
- **`npm run version:bump`** on your branch, with [scripts/bump-version.mjs](../scripts/bump-version.mjs): the same bug fix / new feature / major menu, then writes that version into the App's and the Marketing Website's `package.json` (+ locks) and commits `chore(release): vX.Y.Z`. It does not push; the bump reaches `main` with your PR.
- **`npm run deploy:production`** from the repo root, once that PR is merged, cuts a release with [scripts/release.mjs](../scripts/release.mjs):
  1. Stops unless you are on a clean `main` that fast-forwards to `origin` and has nothing unpushed.
  2. Offers bug fix / new feature / major from the highest `vX.Y.Z` tag (↑/↓ + Enter, or a number; Esc or Ctrl+C cancels), then asks to confirm (default No). Cancel changes nothing.
  3. Stops unless the App's and the Marketing Website's `package.json` (+ locks) already carry that version (`npm run version:bump`); this script never commits. The App shows it in Settings → About, the Website in its footer and its `?v=` cache-busting.
  4. Tags and pushes `vX.Y.Z`, creates a GitHub Release with generated notes.
  5. Follows the Deploy run with a progress bar until ✅ or ❌ (failed step + run URL). Ctrl+C stops watching only.

  Needs `gh` logged in. Semver: a fix bumps the patch, a feature the minor.
- **A tag** runs [deploy.yml](../.github/workflows/deploy.yml). By hand, without the script:

  ```sh
  git switch main && git pull
  git tag v1.4.0 && git push origin v1.4.0     # or GitHub → Releases → Draft a new release
  ```

  1. Refuses a tag that is not on `main`.
  2. Runs the CI checks.
  3. Builds `bikecheck-monolith`, `bikecheck-strava-service` and `bikecheck-caddy` (SPA + Marketing Website) into `ghcr.io/jaffator/…:v1.4.0`.
  4. SSHes to the server, whose key may only run [scripts/deploy.sh](../scripts/deploy.sh):
     - dumps all three DBs (monolith, strava-service, Umami) to `backups/<utc-time>-<tag>/`, keeps the last 5, and stops if a dump fails;
     - `git checkout <tag>` for the compose file, Caddyfile and Alloy config;
     - `compose pull` + `up -d`; migrations run as each container starts;
     - copies the SPA `index.html` out of the caddy image for the monolith's `/u/` and `/r/` shells.
  5. Smoke-checks `app.bikecheck.cloud/api/auth/test`, `app.bikecheck.cloud/` and `bikecheck.cloud/` for up to 2 minutes. A failure turns the run red; there is no automatic rollback.

  Expect 10–30 s of 502s while containers swap.

## Rollback and redeploy

**Actions → Deploy → Run workflow → tag `v1.3.0`.** It skips checks and build, reuses that tag's images, and still dumps first. The same button redeploys the current tag after an `.env.production` change.

Without GitHub: `sudo -iu deploy /opt/bikecheck/scripts/deploy.sh v1.3.0`.

A rollback returns code, not data. If a migration damaged data, restore the dump taken just before the bad release. A dump named `…-v1.4.0` predates v1.4.0, so it matches the release before it:

```sh
cd /opt/bikecheck
dc stop monolith strava-service
dc exec -T db-monolith sh -c 'pg_restore -U "$POSTGRES_USER" -d monolith --clean --if-exists' < backups/<dir>/monolith.dump
dc exec -T db-strava-service sh -c 'pg_restore -U "$POSTGRES_USER" -d strava_service --clean --if-exists' < backups/<dir>/strava_service.dump
```

Then redeploy the older tag.

## Android release

The App is a signed AAB built on your machine from the same version as the web release, against production, and uploaded to Play Console by hand. Play App Signing holds the app key; you keep only the upload key.

**Once:** create the upload keystore outside the repo and back up the `.jks` and both passwords in a password manager. A lost upload key can be reset from Play Console, but not instantly.

```sh
keytool -genkey -v -keystore D:/keys/bikecheck-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Copy `_frontend/bikecheck/android/keystore.properties.example` to `keystore.properties` (git-ignored) and fill it in. Without it a debug build still works and a release build stops at once, naming the file.

**Per release:**

1. `npm run deploy:production` from the repo root, as above. It leaves the new version in `_frontend/bikecheck/package.json`, which the build reads: `versionName` is that version, `versionCode` is `major*10000 + minor*100 + patch` (`1.4.6` → `10406`). Minor or patch at 100 stops the build.
2. `npm run android:release` in `_frontend/bikecheck`: `tsc -b`, `vite build --mode android` (the committed `.env.android`, so the API is `https://app.bikecheck.cloud/api`), `cap sync android`, `gradlew bundleRelease`. It prints the AAB path, `android/app/build/outputs/bundle/release/app-release.aab`.
3. Play Console → the testing track or Production → Create new release → upload the AAB.

To check a build: `keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab` shows the upload certificate.

**Live reload on a device:** `npm run dev` in your own terminal, then `npm run android:dev` (or `android:dev:target` for the usual phone). The Capacitor CLI points the WebView at the dev server and allows cleartext in the generated files only, and reverts both on Ctrl+C; `capacitor.config.ts` has no `server` block. It syncs first, so `dist/` must exist (any build).

## Working on the server

Run git and compose as `deploy` (`sudo -iu deploy`); git refuses a repo owned by another user. Compose needs the running release's tag, which `deploy.sh` writes to `.env.tag`. Add to `/home/deploy/.bashrc`:

```sh
alias dc='docker compose --env-file .env.production --env-file .env.tag -f docker-compose.prod.yml'
```

Then `cd /opt/bikecheck && dc logs -f monolith`.

## One-time setup

### Server (as root)

1. A `deploy` user that owns the clone. Membership in `docker` is root-equivalent, so the SSH key below is restricted instead.

   ```sh
   adduser --disabled-password --gecos "" deploy
   usermod -aG docker deploy
   chown -R deploy:deploy /opt/bikecheck
   ```

2. Read access to GitHub for `git fetch`: the existing read-only deploy key, the `Host github.com` entry that picks it, and GitHub's host key.

   ```sh
   install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
   install -m 600 -o deploy -g deploy /root/.ssh/github_deploy /home/deploy/.ssh/github_deploy
   install -m 644 -o deploy -g deploy /root/.ssh/config /home/deploy/.ssh/config
   install -m 644 -o deploy -g deploy /root/.ssh/known_hosts /home/deploy/.ssh/known_hosts
   ```

   Check it: `sudo -iu deploy ssh -T git@github.com`, then `sudo -iu deploy git -C /opt/bikecheck fetch --tags`.

3. Registry login. The password is a **classic** PAT with only `read:packages`:

   ```sh
   sudo -iu deploy docker login ghcr.io -u Jaffator
   ```

4. The Actions key. Generate it on your own machine:

   ```sh
   ssh-keygen -t ed25519 -N "" -C github-actions-deploy -f bikecheck_deploy
   ```

   Then append one line to `/home/deploy/.ssh/authorized_keys` (owned by `deploy`, mode 600), with the contents of `bikecheck_deploy.pub` after `restrict`:

   ```
   command="/opt/bikecheck/scripts/deploy.sh",restrict ssh-ed25519 AAAA… github-actions-deploy
   ```

### GitHub secrets (from your machine)

```sh
gh secret set DEPLOY_HOST --body "<server IP>"
gh secret set DEPLOY_SSH_KEY < bikecheck_deploy
ssh-keyscan -t ed25519 <server IP> | gh secret set DEPLOY_KNOWN_HOSTS
```

Then delete `bikecheck_deploy` locally; GitHub holds the only copy it needs.

### Umami (cookieless stats for the Marketing Website and the App)

`umami` + `db-umami` run behind Caddy on `STATS_HOST`. The tracker is served as `TRACKER_SCRIPT_NAME` and posts to `COLLECT_API_ENDPOINT`, so ad blockers that match `script.js` and `/api/send` let it through.

1. DNS: nothing to add, the `*.bikecheck.cloud` wildcard already points `stats` at the server.
2. `.env.production`: `STATS_HOST`, `UMAMI_APP_SECRET=$(openssl rand -hex 32)`, `TRACKER_SCRIPT_NAME`, `COLLECT_API_ENDPOINT` (see `.env.production.example`).
3. Deploy. The first deploy after this change skips the Umami dump, as the script it runs predates it.
4. Log in at `https://stats.bikecheck.cloud` as `admin` / `umami` and change the password at once: Settings → Profile → Change password.
5. Settings → Websites → Add:
   - **Web**, domain `bikecheck.cloud`;
   - **App**, domain `app.bikecheck.cloud`. The Android shell reports to it too, with hostname `localhost`.
6. The CI caddy build bakes the tracker into both static builds from repo variables; an unset ID ships that build without it. `TRACKER_SCRIPT_NAME` must match `.env.production`:

   ```sh
   gh variable set STATS_HOST --body stats.bikecheck.cloud
   gh variable set TRACKER_SCRIPT_NAME --body bc.js
   gh variable set UMAMI_WEBSITE_ID_WEB --body <Web ID>
   gh variable set UMAMI_WEBSITE_ID_APP --body <App ID>
   ```

   Then tag a release; a redeploy of an old tag reuses its images and keeps the old IDs.

The Android App is built locally (`npm run android:release`, mode `android`), so its tracker comes from the committed `_frontend/bikecheck/.env.android`: `VITE_UMAMI_WEBSITE_ID=<App ID>` and `VITE_UMAMI_SCRIPT_URL=https://stats.bikecheck.cloud/<TRACKER_SCRIPT_NAME>`. Change it there when either repo variable changes. `npm run dev` never reads that file.

### First tag deploy (leaving the `production` branch)

1. Merge the CI/CD change into `main`.
2. Put `deploy.sh` on the server: `sudo -iu deploy git -C /opt/bikecheck fetch origin && sudo -iu deploy git -C /opt/bikecheck checkout --detach origin/main`.
3. Tag and push, e.g. `v1.0.0`, and watch the run in Actions.
4. Once it is green: `git push origin --delete production`, and `git branch -D production` locally and on the server.
