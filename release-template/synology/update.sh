#!/usr/bin/env bash
# Conservative, interactive updater. Does not perform backups or claim rollback safety.
set -euo pipefail
cd "$(dirname "$0")"
umask 077
fail() { echo "Update stopped: $*" >&2; exit 1; }
[[ -t 0 ]] || fail "Run interactively."
for cmd in docker sha256sum unzip mktemp cmp; do command -v "$cmd" >/dev/null || fail "Missing $cmd"; done
docker compose version >/dev/null || fail "Docker Compose plugin required."
[[ -f .env && -f compose.yaml && -f traefik.yml ]] || fail "Run from an existing installation."
[[ $# -eq 2 ]] || fail "Usage: bash update.sh RELEASE_ZIP BACKUP_EVIDENCE_PATH"
zip="$1"; evidence="$2"
[[ -f "$zip" && -s "$zip" ]] || fail "Release ZIP not found."
[[ -e "$evidence" && -s "$evidence" ]] || fail "A nonempty backup evidence file is required. Back up BOTH PostgreSQL and data/app and test restoration before updating."
[[ "$evidence" != ".env" ]] || fail "An .env file is not backup evidence."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
unzip -q "$zip" -d "$tmp" || fail "Invalid ZIP"
root="$tmp/whats-for-supper"
[[ -f "$root/.env.example" && -f "$root/compose.yaml" && -f "$root/traefik.yml" ]] || fail "Not a What's for Supper installation bundle."
version="$(sed -n 's/^WFS_VERSION=//p' "$root/.env.example")"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-beta\.[1-9][0-9]*)?$ ]] || fail "Invalid release version."
current="$(sed -n 's/^WFS_VERSION=//p' .env)"
[[ -n "$current" && "$current" != "$version" ]] || fail "No version change requested."
# This first updater supports image-tag-only changes. Never silently replace Compose or proxy config.
cmp -s compose.yaml "$root/compose.yaml" || fail "Compose changed between versions. Read release notes and follow the manual migration guide."
cmp -s traefik.yml "$root/traefik.yml" || fail "Traefik config changed. Manual review required."
echo "Current: $current   Target: $version"
echo "Backup evidence: $evidence"
echo "IMPORTANT: this helper cannot verify backup consistency, schema compatibility, or rollback."
echo "Database migrations may be irreversible. Read the release notes and confirm your tested restore procedure."
read -r -p "Type UPDATE to proceed: " answer
[[ "$answer" == UPDATE ]] || fail "Cancelled."
cp -p .env "$tmp/env.original"
sed "s/^WFS_VERSION=.*/WFS_VERSION=$version/" .env > "$tmp/env.updated"
chmod 600 "$tmp/env.updated"
# Verify the proposed environment without changing the installed one.
cp "$tmp/env.updated" .env.update-check
trap 'rm -rf "$tmp"; rm -f .env.update-check' EXIT
docker compose --env-file .env.update-check config --quiet || fail "Compose validation failed."
rm -f .env.update-check
# Preserve a private copy of the original environment for manual recovery.
backup=".env.before-$version"
[[ ! -e "$backup" ]] || fail "Previous environment backup already exists: $backup"
cp -p .env "$backup"
cp "$tmp/env.updated" .env
if ! docker compose pull; then
  cp "$backup" .env
  fail "Image pull failed; restored original .env. Running containers were not deliberately recreated."
fi
if ! docker compose up -d; then
  echo "Deployment failed. Do not assume restoring an image tag will reverse database changes." >&2
  echo "Consult your tested backup and recovery procedure. Previous .env: $backup" >&2
  exit 1
fi
echo "Compose finished. Open your HTTPS URL and verify login, recipes, and meal plans."
echo "Keep your backup until you've verified the update. Previous environment: $backup"
