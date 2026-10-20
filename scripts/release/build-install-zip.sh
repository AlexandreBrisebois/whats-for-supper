#!/usr/bin/env bash
set -euo pipefail
[[ $# -eq 2 ]] || { echo "Usage: $0 VERSION OUTPUT_ZIP" >&2; exit 2; }
version="$1"
output="$2"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-beta\.[1-9][0-9]*)?$ ]] || { echo "Invalid release version" >&2; exit 2; }
root="$(cd "$(dirname "$0")/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/whats-for-supper"
for file in compose.yaml traefik.yml .env.example setup.sh; do
  cp "$root/release-template/synology/$file" "$tmp/whats-for-supper/$file"
done
sed -i -E "s/^WFS_VERSION=.*/WFS_VERSION=$version/" "$tmp/whats-for-supper/.env.example"
cp "$root/docs/install/quick-start.md" "$tmp/whats-for-supper/README.md"
chmod +x "$tmp/whats-for-supper/setup.sh"
mkdir -p "$(dirname "$output")"
output="$(cd "$(dirname "$output")" && pwd)/$(basename "$output")"
(cd "$tmp" && zip -q -r "$output" whats-for-supper)
unzip -p "$output" whats-for-supper/.env.example | grep -Fx "WFS_VERSION=$version" >/dev/null
echo "Created $output for $version"
