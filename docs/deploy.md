# Deploy

Production is one Hetzner box running `docker-compose.prod.yml` from a git clone in `/opt/bikecheck`.
CI builds the images; the server only pulls them. Nothing ships without a `vX.Y.Z` tag on `main`.

## Shipping a release

- **Every push / PR to `main`** runs [ci.yml](../.github/workflows/ci.yml): typecheck of monolith, strava-service and frontend, plus the backend `UNIT` tests. It deploys nothing.
- **A tag** runs [deploy.yml](../.github/workflows/deploy.yml):

  ```sh
  git switch main && git pull
  git tag v1.4.0 && git push origin v1.4.0     # or GitHub → Releases → Draft a new release
  ```

  1. Refuses a tag that is not on `main`.
  2. Runs the CI checks.
  3. Builds `bikecheck-monolith`, `bikecheck-strava-service` and `bikecheck-caddy` (SPA + Marketing Website) into `ghcr.io/jaffator/…:v1.4.0`.
  4. SSHes to the server, whose key may only run [scripts/deploy.sh](../scripts/deploy.sh):
     - dumps both DBs to `backups/<utc-time>-<tag>/`, keeps the last 5, and stops if a dump fails;
     - `git checkout <tag>` for the compose file, Caddyfile and Alloy config;
     - `compose pull` + `up -d`; migrations run as each container starts;
     - copies the SPA `index.html` out of the caddy image for the monolith's `/u/` and `/r/` shells.
  5. Smoke-checks `app.bikecheck.cloud/api/auth/test`, `app.bikecheck.cloud/` and `bikecheck.cloud/` for up to 2 minutes. A failure turns the run red; there is no automatic rollback.

  Expect 10–30 s of 502s while containers swap. Semver: a fix bumps the patch, a feature the minor.

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

### First tag deploy (leaving the `production` branch)

1. Merge the CI/CD change into `main`.
2. Put `deploy.sh` on the server: `sudo -iu deploy git -C /opt/bikecheck fetch origin && sudo -iu deploy git -C /opt/bikecheck checkout --detach origin/main`.
3. Tag and push, e.g. `v1.0.0`, and watch the run in Actions.
4. Once it is green: `git push origin --delete production`, and `git branch -D production` locally and on the server.
