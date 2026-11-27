#!/usr/bin/env bash
set -euo pipefail
caller_pwd="$(pwd)"
cd "$(dirname "$0")"
umask 077

non_interactive=false
secrets_source=""
secrets_file=""
start_flag=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --non-interactive)
      non_interactive=true
      shift
      ;;
    --secrets-file)
      [[ $# -ge 2 && -n "${2:-}" && "$2" != --* ]] || { echo "--secrets-file requires a file path." >&2; exit 1; }
      [[ -z "$secrets_source" ]] || { echo "Choose either --secrets-file or --secrets-stdin, not both." >&2; exit 1; }
      secrets_source="file"
      secrets_file="$2"
      shift 2
      ;;
    --secrets-file=*)
      [[ -z "$secrets_source" ]] || { echo "Choose either --secrets-file or --secrets-stdin, not both." >&2; exit 1; }
      secrets_source="file"
      secrets_file="${1#*=}"
      [[ -n "$secrets_file" ]] || { echo "--secrets-file requires a file path." >&2; exit 1; }
      shift
      ;;
    --secrets-stdin)
      [[ -z "$secrets_source" ]] || { echo "Choose either --secrets-file or --secrets-stdin, not both." >&2; exit 1; }
      secrets_source="stdin"
      shift
      ;;
    --no-start)
      [[ "$start_flag" != "yes" ]] || { echo "Choose either --start or --no-start, not both." >&2; exit 1; }
      start_flag="no"
      shift
      ;;
    --start)
      [[ "$start_flag" != "no" ]] || { echo "Choose either --start or --no-start, not both." >&2; exit 1; }
      start_flag="yes"
      shift
      ;;
    -h|--help)
      echo "Usage: ./setup.sh [--non-interactive (--secrets-file <0600-path> | --secrets-stdin) [--no-start | --start]]"
      exit 0
      ;;
    --*key*|--*token*|--*pin*|--*secret*|--*password*)
      echo "Secrets must not be passed as command-line arguments; use --secrets-file (mode 0600) or --secrets-stdin." >&2
      exit 1
      ;;
    *)
      echo "Unsupported argument: $1. Secrets and configuration must not be passed on the command line." >&2
      exit 1
      ;;
  esac
done

if [[ "$non_interactive" == true && -z "$secrets_source" ]]; then
  echo "--non-interactive requires --secrets-file <path> or --secrets-stdin." >&2
  exit 1
fi
if [[ "$non_interactive" == false && -n "$secrets_source" ]]; then
  echo "Pass --non-interactive when using --secrets-file or --secrets-stdin." >&2
  exit 1
fi
if [[ -n "${START_CONTAINERS:-}" && "${START_CONTAINERS}" != "true" && "${START_CONTAINERS}" != "false" ]]; then
  echo "START_CONTAINERS must be true or false." >&2
  exit 1
fi

if [[ -e .env ]]; then
  echo "An .env already exists. Leaving it unchanged."
  exit 0
fi
[[ -f .env.example ]] || { echo "Missing .env.example" >&2; exit 1; }
command -v openssl >/dev/null || { echo "OpenSSL is required to generate secrets." >&2; exit 1; }

scenario=""
gemini=""
tunnel=""
pin=""
proxy_network=""
proxy_alias=""
start_containers_cfg=""

parse_secrets_stream() {
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == *=* ]] || { echo "Invalid line in secrets input (expected KEY=VALUE)." >&2; exit 1; }
    key="${line%%=*}"
    val="${line#*=}"
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    case "$key" in
      SCENARIO) scenario="$val" ;;
      GEMINI_API_KEY) gemini="$val" ;;
      CLOUDFLARE_TUNNEL_TOKEN) tunnel="$val" ;;
      ELEVATED_ACTIONS_PIN) pin="$val" ;;
      WFS_PROXY_NETWORK) proxy_network="$val" ;;
      WFS_PROXY_ALIAS) proxy_alias="$val" ;;
      START_CONTAINERS) start_containers_cfg="$val" ;;
      *) echo "Unsupported key in secrets input: $key" >&2; exit 1 ;;
    esac
  done
}

if [[ "$non_interactive" == true ]]; then
  if [[ "$secrets_source" == "file" ]]; then
    if [[ "$secrets_file" != /* ]]; then
      secrets_file="$caller_pwd/$secrets_file"
    fi
    [[ -e "$secrets_file" ]] || { echo "Secrets file not found: $secrets_file" >&2; exit 1; }
    [[ -f "$secrets_file" ]] || { echo "Secrets file must be a regular file: $secrets_file" >&2; exit 1; }
    file_mode="$(stat -L -c '%a' "$secrets_file" 2>/dev/null || stat -L -f '%Lp' "$secrets_file" 2>/dev/null || true)"
    [[ "$file_mode" =~ ^[0-7]+$ ]] || { echo "Unable to verify permissions on secrets file." >&2; exit 1; }
    if (( (8#$file_mode & 077) != 0 )); then
      echo "Secrets file must not be group- or world-accessible (expected mode 0600, got $file_mode)." >&2
      exit 1
    fi
    parse_secrets_stream < "$secrets_file"
  else
    parse_secrets_stream
  fi
  if [[ -n "$start_containers_cfg" && "$start_containers_cfg" != "true" && "$start_containers_cfg" != "false" ]]; then
    echo "START_CONTAINERS must be true or false." >&2
    exit 1
  fi
  scenario="${scenario:-1}"
  case "$scenario" in
    1)
      overlay=compose.tunnel.yaml
      proxy_network=cloudflare-proxy
      proxy_alias=""
      [[ -n "$tunnel" ]] || { echo "Tunnel token is required for bundled mode." >&2; exit 1; }
      ;;
    2)
      overlay=compose.shared-tunnel.yaml
      tunnel=""
      proxy_network="${proxy_network:-cloudflare-proxy}"
      [[ "$proxy_network" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || { echo "Invalid network name." >&2; exit 1; }
      [[ "$proxy_alias" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ && ${#proxy_alias} -le 63 ]] || { echo "Use a DNS label for the alias (lowercase letters, digits, hyphens; max 63 characters)." >&2; exit 1; }
      ;;
    *)
      echo "Choose 1 or 2." >&2
      exit 1
      ;;
  esac
  [[ -n "$gemini" ]] || { echo "Gemini API key is required." >&2; exit 1; }
  [[ "$pin" =~ ^[0-9]{6,}$ ]] || { echo "PIN must have at least 6 digits." >&2; exit 1; }
else
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
fi

for v in "$gemini" "$tunnel" "$pin"; do
  [[ "$v" != *$'\n'* && "$v" != *$'\r'* && "$v" != *'#'* && "$v" != *'$'* && "$v" != *' '* ]] || { echo "A value contains unsupported .env characters." >&2; exit 1; }
done

password="$(openssl rand -hex 32)"
secret="$(openssl rand -hex 32)"
tmp="$(mktemp ./.env.tmp.XXXXXXXX)"
trap 'rm -f "$tmp"' EXIT
WFS_DB_PW="$password" WFS_HEARTH="$secret" WFS_GEMINI="$gemini" WFS_TUNNEL="$tunnel" WFS_PIN="$pin" WFS_OVERLAY="$overlay" WFS_NETWORK="$proxy_network" WFS_ALIAS="$proxy_alias" awk '
  /^COMPOSE_FILE=/ {print "COMPOSE_FILE=compose.yaml:" ENVIRON["WFS_OVERLAY"]; next}
  /^WFS_PROXY_NETWORK=/ {print "WFS_PROXY_NETWORK=" ENVIRON["WFS_NETWORK"]; next}
  /^WFS_PROXY_ALIAS=/ {print "WFS_PROXY_ALIAS=" ENVIRON["WFS_ALIAS"]; next}
  /^POSTGRES_PASSWORD=/ {print "POSTGRES_PASSWORD=" ENVIRON["WFS_DB_PW"]; next}
  /^HEARTH_SECRET=/ {print "HEARTH_SECRET=" ENVIRON["WFS_HEARTH"]; next}
  /^GEMINI_API_KEY=/ {print "GEMINI_API_KEY=" ENVIRON["WFS_GEMINI"]; next}
  /^CLOUDFLARE_TUNNEL_TOKEN=/ {print "CLOUDFLARE_TUNNEL_TOKEN=" ENVIRON["WFS_TUNNEL"]; next}
  /^ELEVATED_ACTIONS_PIN=/ {print "ELEVATED_ACTIONS_PIN=" ENVIRON["WFS_PIN"]; next}
  {print}
' .env.example > "$tmp"
if [[ -e .env ]]; then echo ".env appeared during setup; refusing to overwrite." >&2; exit 1; fi
mv -n "$tmp" .env
chmod 600 .env
mkdir -p data/app data/postgres
chmod 755 data
chmod 755 data/app
chmod 700 data/postgres
if [[ "$(id -u)" -eq 0 ]]; then
  chown 1654:1654 data/app
elif [[ "$(uname -s)" == "Linux" ]]; then
  echo "On Linux, ensure the API container user (UID 1654) can write to ./data/app before starting:"
  echo "  sudo chown -R 1654:1654 data/app"
  echo "(On Synology NAS File Station, grant Everyone Read/Write on data/app only.)"
fi
echo "Configuration saved securely. Future docker compose commands use the selected overlay from .env."
if [[ "$scenario" == 2 ]]; then
  echo "Verify the independent connector and external network exist before starting the app."
  echo "Cloudflare origin: http://$proxy_alias:80"
fi

should_start="prompt"
if [[ "$start_flag" == "no" ]]; then
  should_start="no"
elif [[ "$start_flag" == "yes" ]]; then
  should_start="yes"
elif [[ -n "$start_containers_cfg" ]]; then
  [[ "$start_containers_cfg" == "true" ]] && should_start="yes" || should_start="no"
elif [[ -n "${START_CONTAINERS:-}" ]]; then
  [[ "${START_CONTAINERS}" == "true" ]] && should_start="yes" || should_start="no"
elif [[ "$non_interactive" == true ]]; then
  should_start="no"
fi

if [[ "$should_start" == "no" ]]; then
  echo "When ready, run: docker compose up -d"
  exit 0
fi

prereq_exit=0
[[ "$should_start" == "yes" ]] && prereq_exit=1

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. See the installation troubleshooting guide."
  exit "$prereq_exit"
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is missing. See the installation troubleshooting guide."
  exit "$prereq_exit"
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't accessible to your account. See the installation troubleshooting guide."
  exit "$prereq_exit"
fi
if [[ "$scenario" == 2 ]] && ! docker network inspect "$proxy_network" >/dev/null 2>&1; then
  echo "External network is missing. Follow docs/install/cloudflare.md to prepare the connector."
  exit "$prereq_exit"
fi
if ! docker compose config --quiet; then
  echo "Configuration needs attention. Check .env and the troubleshooting guide."
  exit "$prereq_exit"
fi
if [[ "$should_start" == "prompt" ]]; then
  read -r -p "Start What's for Supper now? [Y/n] " start
  if [[ "$start" =~ ^[Nn]([Oo])?$ ]]; then
    echo "When ready, run: docker compose up -d"
    exit 0
  fi
fi
if docker compose up -d; then
  echo "Containers started. Complete your Cloudflare hostname setup, then open its HTTPS address."
else
  echo "Startup needs attention. Check docs/install/troubleshooting.md."
  exit 1
fi
