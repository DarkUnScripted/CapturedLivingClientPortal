#!/usr/bin/env bash
# Captured Living: deploy one image build on the VPS.
#
# Runs ON the server, fed over SSH by .github/workflows/deploy-vps.yml:
#
#   ssh deploy@host 'bash -s -- <image-tag> <project-dir>' < scripts/captured-living/deploy.sh
#
# The workflow first copies the repo's compose files into <project-dir>/.incoming/.
# Then this script:
#   1. dumps the database to <project-dir>/backups/pre-deploy/ (keeps the last 10)
#   2. installs the new compose files, keeping the old ones next to the dump
#   3. sets CL_IMAGE_TAG in .env, pulls and restarts
#   4. waits for the backend to report healthy, and puts the previous tag back
#      if it does not
#
# .env must contain COMPOSE_FILE so plain `docker compose` uses our override:
#   COMPOSE_FILE=docker-compose.production.yml:docker-compose.captured-living.yml

set -euo pipefail

# The script arrives on stdin (`bash -s`), and bash reads it line by line while
# running it. Wrapping everything in main() makes bash read the whole file
# before the first command runs, and detaching stdin keeps commands such as
# `docker compose exec` from swallowing the rest of the script (which once made
# a deploy stop silently after the backup and still report success).
main() {
exec </dev/null

TAG="${1:?usage: deploy.sh <image-tag> <project-dir>}"
DIR="${2:?usage: deploy.sh <image-tag> <project-dir>}"
HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-600}"

if [[ ! "$TAG" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "Refusing image tag '$TAG'" >&2
    exit 1
fi

cd "$DIR"

if [[ ! -f .env ]]; then
    echo "No .env in $DIR; is VPS_PROJECT_DIR right?" >&2
    exit 1
fi
if ! grep -q '^COMPOSE_FILE=.*docker-compose.captured-living.yml' .env; then
    echo "COMPOSE_FILE in $DIR/.env does not include docker-compose.captured-living.yml; see docs/CAPTURED_LIVING_SETUP.md" >&2
    exit 1
fi

set_tag() {
    if grep -q '^CL_IMAGE_TAG=' .env; then
        sed -i "s/^CL_IMAGE_TAG=.*/CL_IMAGE_TAG=$1/" .env
    else
        printf '\nCL_IMAGE_TAG=%s\n' "$1" >> .env
    fi
}

backend_health() {
    local id
    id=$(docker compose ps -q backend 2>/dev/null || true)
    [[ -z "$id" ]] && { echo missing; return; }
    docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || echo missing
}

wait_healthy() {
    local waited=0 status
    while (( waited < HEALTH_WAIT_SECONDS )); do
        status=$(backend_health)
        [[ "$status" == healthy ]] && return 0
        # A line every round keeps the SSH session from looking idle (a quiet
        # wait once got the connection dropped mid-deploy) and shows progress.
        echo "    backend: $status (${waited}s)"
        sleep 10
        waited=$(( waited + 10 ))
    done
    echo "Backend still '$status' after ${HEALTH_WAIT_SECONDS}s" >&2
    return 1
}

previous=$(sed -n 's/^CL_IMAGE_TAG=//p' .env | tail -n 1)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="backups/pre-deploy/$stamp"

echo "==> Deploying $TAG (currently ${previous:-not set}) in $DIR"

echo "==> Backing up the database to $backup_dir"
mkdir -p "$backup_dir"
chmod 700 backups backups/pre-deploy "$backup_dir"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_dir/database.dump"
if [[ ! -s "$backup_dir/database.dump" ]]; then
    echo "Database dump is empty; not deploying" >&2
    exit 1
fi
cp .env "$backup_dir/env"
chmod 600 "$backup_dir/env" "$backup_dir/database.dump"
# Keep the ten newest pre-deploy backups.
ls -1d backups/pre-deploy/*/ 2>/dev/null | sort | head -n -10 | xargs -r rm -rf --

if [[ -d .incoming ]]; then
    echo "==> Installing compose files from this build"
    for f in .incoming/*.yml; do
        name=$(basename "$f")
        [[ -f "$name" ]] && cp "$name" "$backup_dir/$name"
        mv "$f" "$name"
    done
    rmdir .incoming
fi

set_tag "$TAG"
echo "==> Pulling images"
docker compose pull backend frontend
echo "==> Starting"
# `up` itself fails when a dependency (postgres) never gets healthy, so it
# must not abort the script under `set -e` before the rollback below.
if docker compose up -d && wait_healthy; then
    docker image prune -f >/dev/null || true
    echo "==> Deployed $TAG"
    exit 0
fi

echo "==> Rolling back to the setup from before this deploy" >&2
docker compose ps -a >&2 || true
docker compose logs --tail 40 postgres backend >&2 || true
# Restore .env (in place, keeping its owner and mode) and the compose files
# exactly as they were, which also covers a first deploy whose previous setup
# was not ours at all.
cat "$backup_dir/env" > .env
for name in docker-compose.production.yml docker-compose.captured-living.yml; do
    [[ -f "$backup_dir/$name" ]] && cp "$backup_dir/$name" "$name"
done
if docker compose up -d && wait_healthy; then
    echo "The previous setup (${previous:-from before}) is running again." >&2
else
    echo "The previous setup did not come back healthy either; needs a person." >&2
fi
echo "If the new build changed the database, restore $DIR/$backup_dir/database.dump (docs/CAPTURED_LIVING_SETUP.md, Rolling back)." >&2
exit 1
}

main "$@"
