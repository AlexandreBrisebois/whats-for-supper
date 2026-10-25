#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077

if [[ -e .env ]]; then
  echo "An .env already exists. Leaving it unchanged."
  exit 0
fi
[[ -f .env.example ]] || { echo "Missing .env.example" >&2; exit 1; }
command -v openssl >/dev/null || { echo "OpenSSL is required to generate secrets." >&2; exit 1; }
[[ -t 0 ]] || { echo "Run this helper interactively in a terminal." >&2; exit 1; }

echo "What's for Supper — family setup"
echo "Choose 1 for a bundled tunnel, or 2 to attach to an independent/shared tunnel."
read -r -p "Tunnel setup [1/2, default 1]: " scenario
scenario="${scenario:-1}"
case "$scenario" in
  1) overlay=compose.tunnel.yaml ;;
  2) overlay=compose.shared-tunnel.yaml ;;
  *) echo "Choose 1 or 2." >&2; exit 1 ;;
esac
read -r -s -p "Gemini API key: " gemini; echo
tunnel=""
if [[ "$scenario" == 1 ]]; then
  read -r -s -p "Cloudflare Tunnel token: " tunnel; echo
  [[ -n "$tunnel" ]] || { echo "Tunnel token is required for bundled mode." >&2; exit 1; }
fi
read -r -s -p "Choose an administrator PIN (at least 6 digits): " pin; echo
[[ -n "$gemini" ]] || { echo "Gemini API key is required." >&2; exit 1; }
[[ "$pin" =~ ^[0-9]{6,}$ ]] || { echo "PIN must have at least 6 digits." >&2; exit 1; }
proxy_network=cloudflare-proxy
proxy_alias=""
if [[ "$scenario" == 2 ]]; then
  read -r -p "Existing Docker network [cloudflare-proxy]: " proxy_network
  proxy_network="${proxy_network:-cloudflare-proxy}"
  read -r -p "Unique proxy alias (for example wfs-prod-proxy): " proxy_alias
  [[ "$proxy_network" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || { echo "Invalid network name." >&2; exit 1; }
  [[ "$proxy_alias" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ && ${#proxy_alias} -le 63 ]] || { echo "Use a DNS label for the alias (lowercase letters, digits, hyphens; max 63 characters)." >&2; exit 1; }
fi
for v in "$gemini" "$tunnel" "$pin"; do
  [[ "$v" != *$'\n'* && "$v" != *$'\r'* && "$v" != *'#'* && "$v" != *'$'* && "$v" != *' '* ]] || { echo "A value contains unsupported .env characters." >&2; exit 1; }
done

password="$(openssl rand -hex 32)"
secret="$(openssl rand -hex 32)"
tmp="$(mktemp ./.env.tmp.XXXXXXXX)"
trap 'rm -f "$tmp"' EXIT
awk -v db="$password" -v hearth="$secret" -v gemini="$gemini" -v tunnel="$tunnel" -v pin="$pin" -v overlay="$overlay" -v network="$proxy_network" -v alias="$proxy_alias" '
  /^COMPOSE_FILE=/ {print "COMPOSE_FILE=compose.yaml:" overlay; next}
  /^WFS_PROXY_NETWORK=/ {print "WFS_PROXY_NETWORK=" network; next}
  /^WFS_PROXY_ALIAS=/ {print "WFS_PROXY_ALIAS=" alias; next}
  /^POSTGRES_PASSWORD=/ {print "POSTGRES_PASSWORD=" db; next}
  /^HEARTH_SECRET=/ {print "HEARTH_SECRET=" hearth; next}
  /^GEMINI_API_KEY=/ {print "GEMINI_API_KEY=" gemini; next}
  /^CLOUDFLARE_TUNNEL_TOKEN=/ {print "CLOUDFLARE_TUNNEL_TOKEN=" tunnel; next}
  /^ELEVATED_ACTIONS_PIN=/ {print "ELEVATED_ACTIONS_PIN=" pin; next}
  {print}
' .env.example > "$tmp"
if [[ -e .env ]]; then echo ".env appeared during setup; refusing to overwrite." >&2; exit 1; fi
mv -n "$tmp" .env
mkdir -p data/app data/postgres
echo "Configuration saved securely. Future docker compose commands use the selected overlay from .env."
if [[ "$scenario" == 2 ]]; then
  echo "Verify the independent connector and external network exist before starting the app."
  echo "Cloudflare origin: http://$proxy_alias:80"
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. See the installation troubleshooting guide."
  exit 0
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is missing. See the installation troubleshooting guide."
  exit 0
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't accessible to your account. See the installation troubleshooting guide."
  exit 0
fi
if [[ "$scenario" == 2 ]] && ! docker network inspect "$proxy_network" >/dev/null 2>&1; then
  echo "External network is missing. Follow docs/install/cloudflare.md to prepare the connector."
  exit 0
fi
if ! docker compose config --quiet; then
  echo "Configuration needs attention. Check .env and the troubleshooting guide."
  exit 0
fi
read -r -p "Start What's for Supper now? [Y/n] " start
if [[ "$start" =~ ^[Nn]([Oo])?$ ]]; then
  echo "When ready, run: docker compose up -d"
  exit 0
fi
if docker compose up -d; then
  echo "Containers started. Complete your Cloudflare hostname setup, then open its HTTPS address."
else
  echo "Startup needs attention. Check docs/install/troubleshooting.md."
  exit 1
fi
