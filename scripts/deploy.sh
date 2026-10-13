#!/usr/bin/env bash
# Deploys one release tag on the server; the deploy user's forced SSH command, or by hand: deploy.sh v1.4.0.
# Everything lives in main() so the `git checkout` below cannot rewrite the script mid-run.
set -euo pipefail

KEEP_BACKUPS=5

compose() {
  docker compose --env-file .env.production -f docker-compose.prod.yml "$@"
}

# Forward-only migrations make this dump the only way back from a bad one.
backup() {
  local dir
  dir="backups/$(date -u +%Y%m%d-%H%M%S)-$1"
  compose up -d --wait db-monolith db-strava-service db-umami
  # `set -e` is off inside a `( ) ||` group, hence the explicit && chain.
  (
    umask 077
    mkdir -p "$dir" &&
      compose exec -T db-monolith sh -c 'pg_dump -U "$POSTGRES_USER" -Fc monolith' > "$dir/monolith.dump" &&
      compose exec -T db-strava-service sh -c 'pg_dump -U "$POSTGRES_USER" -Fc strava_service' > "$dir/strava_service.dump" &&
      compose exec -T db-umami sh -c 'pg_dump -U "$POSTGRES_USER" -Fc umami' > "$dir/umami.dump"
  ) || { rm -rf "$dir"; echo "backup failed, nothing deployed" >&2; exit 1; }
  ls -1d backups/*/ | head -n -"$KEEP_BACKUPS" | xargs -r rm -rf
  echo "backup: $dir"
}

# The monolith builds the /u/ and /r/ shells from this file; only the caddy image has the fresh build.
refresh_spa_shell() {
  mkdir -p _frontend/bikecheck/dist
  compose cp caddy:/srv/spa/index.html _frontend/bikecheck/dist/index.html
}

main() {
  local tag="${SSH_ORIGINAL_COMMAND:-${1:-}}"
  if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "usage: deploy.sh vX.Y.Z" >&2
    exit 2
  fi

  cd "$(dirname "$(readlink -f "$0")")/.."
  export TAG="$tag"

  backup "$tag"
  git fetch --tags --quiet origin
  git -c advice.detachedHead=false checkout --quiet "$tag"
  compose pull monolith strava-service caddy
  compose up -d --remove-orphans
  # Lets manual compose commands find the running images (docs/deploy.md).
  echo "TAG=$tag" > .env.tag
  refresh_spa_shell
  docker image prune -af
  echo "deployed $tag"
}

main "$@"; exit
