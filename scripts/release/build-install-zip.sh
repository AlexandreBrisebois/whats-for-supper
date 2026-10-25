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
for file in compose.yaml compose.tunnel.yaml compose.shared-tunnel.yaml compose.local-port.yaml compose.postgres-debug.yaml traefik.yml .env.example setup.sh update.sh; do
  cp "$root/release-template/synology/$file" "$tmp/whats-for-supper/$file"
done
mkdir -p "$tmp/whats-for-supper/cloudflared"
cp "$root/release-template/synology/cloudflared/compose.yaml" "$root/release-template/synology/cloudflared/.env.example" "$tmp/whats-for-supper/cloudflared/"
sed -E "s/^WFS_VERSION=.*/WFS_VERSION=$version/" "$tmp/whats-for-supper/.env.example" > "$tmp/env.stamped"
mv "$tmp/env.stamped" "$tmp/whats-for-supper/.env.example"
cp "$root/docs/install/quick-start.md" "$tmp/whats-for-supper/README.md"
# In the ZIP, README is at the root; linked guides are under docs/install.
for name in gemini-key.md cloudflare.md troubleshooting.md updates.md timezones.md agent-install.md; do
  sed "s|]($name)|](docs/install/$name)|g" "$tmp/whats-for-supper/README.md" > "$tmp/readme.linked"
  mv "$tmp/readme.linked" "$tmp/whats-for-supper/README.md"
done
mkdir -p "$tmp/whats-for-supper/docs/install"
for file in cloudflare.md gemini-key.md troubleshooting.md updates.md timezones.md agent-install.md; do
  cp "$root/docs/install/$file" "$tmp/whats-for-supper/docs/install/$file"
done
chmod +x "$tmp/whats-for-supper/setup.sh" "$tmp/whats-for-supper/update.sh"
mkdir -p "$(dirname "$output")"
output="$(cd "$(dirname "$output")" && pwd)/$(basename "$output")"
(cd "$tmp" && zip -q -r "$output" whats-for-supper)
unzip -p "$output" whats-for-supper/.env.example | grep -Fx "WFS_VERSION=$version" >/dev/null
echo "Created $output for $version"
