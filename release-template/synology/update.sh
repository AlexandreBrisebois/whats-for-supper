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
# The updater supports image-tag-only changes. Never silently replace Compose or proxy config.
cmp -s compose.yaml "$root/compose.yaml" || fail "Compose changed between versions. Read release notes and follow the manual migration guide."
cmp -s traefik.yml "$root/traefik.yml" || fail "Traefik config changed. Manual review required."
# Read only the generated, literal selection; never source a private dotenv file.
selection="$(sed -n 's/^COMPOSE_FILE=//p' .env)"
case "$selection" in
  compose.yaml:compose.tunnel.yaml) overlay=compose.tunnel.yaml ;;
  compose.yaml:compose.shared-tunnel.yaml) overlay=compose.shared-tunnel.yaml ;;
  *) fail "Missing or custom COMPOSE_FILE selection. Follow the manual template transition guide." ;;
esac
[[ -z "${COMPOSE_FILE:-}" || "$COMPOSE_FILE" == "$selection" ]] || fail "Shell COMPOSE_FILE conflicts with .env."
[[ -f "$overlay" && -f "$root/$overlay" ]] || fail "Selected overlay is missing. Manual review required."
cmp -s "$overlay" "$root/$overlay" || fail "Selected Compose overlay changed. Manual review required."
compose=(docker compose -f compose.yaml -f "$overlay")
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
"${compose[@]}" --env-file .env.update-check config --quiet || fail "Compose validation failed."
rm -f .env.update-check
# Preserve a private copy of the original environment for manual recovery.
backup=".env.before-$version"
[[ ! -e "$backup" ]] || fail "Previous environment backup already exists: $backup"
cp -p .env "$backup"
cp "$tmp/env.updated" .env
if ! "${compose[@]}" pull; then
  cp "$backup" .env
  fail "Image pull failed; restored original .env. Running containers were not deliberately recreated."
fi
if ! "${compose[@]}" up -d; then
  echo "Deployment failed. Do not assume restoring an image tag will reverse database changes." >&2
  echo "Consult your tested backup and recovery procedure. Previous .env: $backup" >&2
  exit 1
fi
echo "Compose finished. Open your HTTPS URL and verify login, recipes, and meal plans."
echo "Keep your backup until you've verified the update. Previous environment: $backup"
