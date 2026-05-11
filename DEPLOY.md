# Deployment Guide

This guide covers deploying **What's For Supper** on a home NAS or any Docker-capable host. The production stack runs on a Synology NAS with a Cloudflare Tunnel for remote access — that is the reference configuration described here.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Docker with Compose V2 | `docker compose` (not `docker-compose`) |
| 2 GB RAM minimum | API + PWA + PostgreSQL |
| Persistent local storage | Mapped via `DATA_ROOT` — recipe images live here |
| Google Gemini API key | Free tier covers a typical household. Get one at [aistudio.google.com](https://aistudio.google.com) |
| (Optional) Cloudflare account | For remote access via Cloudflare Tunnel |

---

## 1. Clone and configure

```bash
git clone https://github.com/AlexandreBrisebois/whats-for-supper.git
cd whats-for-supper/docker
cp .env.example .env.local
```

Edit `.env.local` — the fields you **must** set are:

| Variable | What it is |
|----------|------------|
| `POSTGRES_PASSWORD` | Any strong password |
| `POSTGRES_CONNECTION_STRING` | Must match the password above |
| `HEARTH_SECRET` | Shared family passphrase — changing it invalidates all sessions |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `DATA_ROOT` | Absolute path to your NAS recipe storage directory |
| `DOMAIN_NAME` | Your domain (e.g. `yourdomain.dev`) |

---

## 2. Start the stack

```bash
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.local up -d
```

Services that start:

| Container | Port | Role |
|-----------|------|------|
| `traefik` | 80, 443, 8080 (admin) | Reverse proxy + TLS |
| `api` | 9001 (internal) | .NET API |
| `pwa` | 3000 (internal) | Next.js PWA |
| `postgres` | 5432 (internal) | PostgreSQL 17 |

The database schema is applied automatically on first API startup via `psqldef`.

---

## 3. Traefik routing

Traefik is the single entry point. It routes by path prefix:

| Path | Destination | Notes |
|------|-------------|-------|
| `/api/*` | API container | Direct — **not** proxied through Next.js |
| `/api/stream` | API container | SSE requires `X-Accel-Buffering: no` (set by Traefik label) |
| `/*` | PWA container | All other paths |

**Why direct-to-API via Traefik, not through Next.js:** Next.js cannot stream long-lived SSE responses without buffering. Traefik routes `/api/` directly to the .NET API container, so `EventSource` connects to the same origin with no intermediary.

### `NEXT_PUBLIC_API_BASE_URL`

In a deployed environment behind Traefik, this variable must be **empty** (or unset). The PWA connects to `/api/stream` as a same-origin relative path — Traefik handles the routing. Setting it to a full URL in production causes the browser to bypass Traefik and hit the API container directly, which breaks SSE in most configurations.

```env
# Production (Traefik handles routing)
NEXT_PUBLIC_API_BASE_URL=

# Local dev (direct API access, bypass Traefik)
NEXT_PUBLIC_API_BASE_URL=http://localhost:9001
```

---

## 4. Cloudflare Tunnel (optional, recommended for remote access)

Cloudflare Tunnel gives your home-hosted stack a public HTTPS endpoint without port-forwarding or a static IP.

1. Create a tunnel in the [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com)
2. Copy the tunnel token into `.env.local`:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here
   DOMAIN_NAME=yourdomain.dev
   ```
3. Configure the tunnel to route `yourdomain.dev` → `http://traefik:80`

All traffic flows: Browser → Cloudflare Edge → Tunnel → Traefik → API or PWA.

SSE works correctly through Cloudflare Tunnel as long as HTTP/2 is enabled (default for Cloudflare proxied records).

---

## 5. Authentication setup (Hearth)

WFS uses the **Hearth security model** — no user accounts, no OAuth, no email verification. Families share a single passphrase.

1. Set `HEARTH_SECRET` to any passphrase in `.env.local`. This must be **identical** in both the PWA and API environment configs — in the Docker Compose setup, a single `.env.local` supplies both.
2. Distribute the app URL and passphrase to family members.
3. On first visit, users select their name from the family member list. Validating the passphrase issues a signed `h_access` cookie (HMAC-SHA256). Subsequent requests carry the cookie automatically — no re-authentication needed.

> **Note:** Changing `HEARTH_SECRET` invalidates all existing sessions. Everyone will need to re-enter the passphrase on next visit.

---

## 6. Family member setup

Family members are managed in the app's Settings screen. Before the family can use the app, at least one family member profile must exist. On a fresh install:

1. Open the app URL
2. Navigate to **Settings → Family**
3. Add each family member by name
4. Share the app URL and `HEARTH_SECRET` passphrase

---

## 7. Backup and restore

Recipe data (images, `recipe.info` files) lives in the directory mapped to `DATA_ROOT`. This is the only directory that needs to be backed up. The database can be fully reconstructed from these files using the built-in restore endpoint.

**Backup:**
```
POST /api/management/backup
```
Writes the current DB state back to disk (updates `recipe.info` files, including dietary profiles).

**Restore (after a DB wipe or migration):**
```
POST /api/management/seed
```
Reads all `recipe.info` files from `DATA_ROOT` and reconstructs the database. Dietary profiles are restored from disk — **no AI re-classification is needed**.

> **NAS tip:** Point `DATA_ROOT` at a shared folder on your NAS that is already covered by your regular backup routine (e.g. Synology Hyper Backup). Recipe images are large; factor them into your backup storage estimates.

### Dreaming maintenance cycle

The API seeds a recurring `dreaming` workflow on startup. Each run prunes completed/failed workflow history older than 7 days, starts the existing `db-backup` workflow, writes a Markdown report under `DATA_ROOT/reports/`, and schedules the next `dreaming` run.

| Variable | Default | What it does |
|----------|---------|--------------|
| `DREAMING_CRON_UTC` | `0 3 * * *` | UTC cron expression for the next Dreaming run |

Example:

```env
# Run Dreaming every day at 03:00 UTC
DREAMING_CRON_UTC=0 3 * * *
```

### Demo Mode (Showcase)

Demo Mode provides a "frozen" environment for showcasing the app without incurring AI costs or accumulating permanent user data.

| Variable | Default | What it does |
|----------|---------|--------------|
| `DEMO_MODE` | `false` | Enables demo restrictions and reset workflows. |
| `DEMO_RESTORE_CRON_UTC` | `0 3 * * *` | Frequency of the automated reset to the master snapshot. |

**Master Snapshot:**
To set the state that users will see on every reset, configure the app the way you want it (add recipes, set a plan), then trigger a capture:
```bash
POST /api/management/demo-capture
```
This clones the active database and `recipes/` folder into `DATA_ROOT/demo/`. Every restore run will truncate all active tables and replace them with this snapshot.

**AI Restrictions:**
In Demo Mode, expensive AI processors (recipe extraction, search re-ranking) are bypassed. Lexical search and pre-computed embeddings remain fully functional.

---

---

## 9. Automated recipe translation

WFS can automatically translate recipes into a target language (e.g., French or English) during the import and reimport process. This is controlled by a mandatory environment variable.

| Variable | Valid Values | What it does |
|----------|--------------|--------------|
| `IMPORT_TARGET_LANGUAGE` | `English`, `French`, `NONE` | If set to a language, all new imports and reimports will be automatically translated. Set to `NONE` to disable. |

> **Note:** If `IMPORT_TARGET_LANGUAGE` is set to a language, triggering a **Reimport** on an existing recipe will overwrite its current text with the translated version.

---

## 10. Default application language

WFS supports English and French. You can set the initial language for new users via an environment variable. Individual users can still override this in their profile settings.

| Variable | Valid Values | What it does |
|----------|--------------|--------------|
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en`, `fr` | Sets the default language for the PWA if no user preference or system default is detected. |

---

## 11. Semantic search configuration

Semantic search runs out of the box using trigram-based lexical retrieval (no external service required). Vector-based hybrid search requires a configured embedding provider.

### Embedding provider

| Variable | Default | What it does |
|----------|---------|--------------|
| `EMBEDDING_MODEL_ID` | `text-embedding-3-small` | The embedding model used to generate recipe vectors. Must match the model used when the index was built. Changing this value requires a full reindex. |

When `EMBEDDING_MODEL_ID` is set and an embedding provider is registered, the search pipeline uses hybrid retrieval: lexical trigram candidates merged with pgvector cosine-similarity candidates. If the embedding provider is unavailable or times out (300 ms budget per request), search falls back to lexical-only and reports `resultPath: "fallback-lexical"` — the user sees identical results with no error.

### Search index backup and restore

The management backup endpoint (`POST /api/management/backup`) writes a `search.index.json` sidecar alongside each recipe directory. On restore (`POST /api/management/seed`), the sidecar is read and the `recipe_search_documents` row is upserted — no re-embedding call is needed for compatible artifacts.

Compatibility check: `schemaVersion` must be `1` AND `embeddingModel` must match the current `EMBEDDING_MODEL_ID`. A mismatch marks the recipe as `index_status = pending` and schedules a background reindex. Lexical search remains available immediately.

### Elevated PIN (permanent delete)

Permanently deleting a recipe from the Recycle Bin requires an **elevated PIN**. This prevents accidental irreversible data loss.

| Variable | Notes |
|----------|-------|
| `ELEVATED_ACTIONS_PIN` | Any short PIN string. Not set by default. If unset, the purge endpoint returns HTTP 503 and permanent delete is unavailable. |

The PIN travels in the `X-Elevated-Pin` request header and is never written to the URL, query string, or response body.

> **Recommendation:** Set a simple 4–6 digit PIN in `.env.local`. Keep it separate from the `HEARTH_SECRET` passphrase — they serve different purposes.

```env
ELEVATED_ACTIONS_PIN=1234
```

---

## 12. Updating

```bash
git pull
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.local pull
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.local up -d
```

Schema changes are applied automatically on API startup via `psqldef` declarative diffing — no manual migration scripts.

---

## Environment variable reference

See [`docker/.env.example`](docker/.env.example) for the full annotated reference. Key groupings:

| Group | Variables |
|-------|-----------|
| Infrastructure | `TRAEFIK_HTTP_PORT`, `TRAEFIK_ADMIN_PORT`, `CLOUDFLARE_TUNNEL_TOKEN`, `DOMAIN_NAME` |
| Database | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_CONNECTION_STRING` |
| API | `API_HOST`, `API_PORT`, `ASPNETCORE_ENVIRONMENT`, `DREAMING_CRON_UTC` |
| PWA | `PWA_HOST`, `NEXT_PUBLIC_API_BASE_URL`, `HEARTH_SECRET`, `NEXT_PUBLIC_COOKIE_DOMAIN`, `NEXT_PUBLIC_DEFAULT_LOCALE` |
| AI | `GEMINI_API_KEY`, `GEMINI_MODEL_ID`, `GEMINI_ENDPOINT`, `IMPORT_TARGET_LANGUAGE` |
| Search | `EMBEDDING_MODEL_ID` |
| Storage | `DATA_ROOT` |
| Security | `CORS_ALLOWED_ORIGINS`, `ELEVATED_ACTIONS_PIN` |
