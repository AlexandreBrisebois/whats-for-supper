# Local Development Loop

Concise contributor guide for running, editing, and validating What's for Supper locally.
For agent contract/workflow rules, see [AGENT.md](AGENT.md) and [agent-toolbox.md](.agents/agent-toolbox.md).

---

## 1. First-Time Setup

1. Select the Node version pinned in [`.nvmrc`](.nvmrc) (for example `nvm use`).
2. Run the standard setup task:
   ```bash
   task hooks:setup
   ```
   This verifies Node, creates `.venv`, installs `@fission-ai/openspec` + `npm@11.21.1`, runs `npm ci` in `pwa/`, installs Playwright Chromium, restores API test packages, and installs the pre-commit hook.
3. Create local environment files:
   ```bash
   cp docker/.env.example docker/.env.local
   cp pwa/.env.local.example pwa/.env.local
   ```
   Add your `GEMINI_API_KEY` (required — no model-free mode exists) and keep `NEXT_PUBLIC_API_BASE_URL=` empty when running behind Traefik (`pwa.wfs.localhost`).

---

## 2. Two Local Workflows

### Fast Local Dev (hot reload for API & PWA)

Run Postgres in Docker and run API + PWA natively with hot reload:

```bash
task dev:db    # PostgreSQL on localhost:5432
task dev:api   # .NET API on http://localhost:9001 (dotnet watch)
task dev:pwa   # Next.js PWA on http://localhost:3000 (HMR)
```

In this mode, Next.js server-side calls reach the API via `API_INTERNAL_URL=http://localhost:9001` (from `pwa/.env.local`).
If processes linger on `9001` or `3000`, clear them with `task dev:kill`.

### Full Docker Stack (Traefik + DB + API + PWA)

```bash
task up        # Starts Traefik, Postgres, migration, API, PWA
```

- **App / PWA:** `http://pwa.wfs.localhost`
- **API (same origin):** `http://pwa.wfs.localhost/api`
- **Traefik dashboard:** `http://localhost:8080`

> **Note:** Docker containers run built production images (not `dotnet watch` / HMR). After editing API or PWA code, rebuild with `task restart:api`, `task restart:pwa`, or `task dev:db:sync` (for DB + migrations + API + seed).

---

## 3. Commit & Push Validation Loop

Pre-commit checks run automatically on `git commit` (`spec:check`, `test:agent`, `check:contracts`, `gen:client:check`, `format:check:pwa`). Push validation is **manual** — no automatic pre-push hook is installed.

```bash
# 1. Before committing: format & sync generated client for changed paths
task prepare -- <changed-paths>

# 2. Commit (triggers fast pre-commit checks)
git commit -m "..."

# 3. Before pushing: validate affected committed range in a clean worktree
task check:push

# 4. Final repository verification
task verify -- <complete-task-paths>
```

---

## 4. Common Commands

Run `task -l` for the complete list. Daily essentials:

| Task | Purpose |
| --- | --- |
| `task dev:db` / `task dev:api` / `task dev:pwa` | Local DB + hot-reload API (`:9001`) and PWA (`:3000`) |
| `task up` / `task down` / `task health` | Start, stop, or check the full Docker Compose stack |
| `task migrate` / `task seed` | Run `psqldef` + `compatibility.sql` migrations / seed recipes |
| `task test:api` / `task test:unit` / `task test:e2e` | API tests, Vitest unit tests, Playwright E2E |
| `task test:database` | Isolated real-PostgreSQL test suite |
| `task test:smoke -- --isolated` | Disposable Docker smoke check |
| `task gen:client` | Regenerate Kiota TypeScript client from `specs/openapi.yaml` |
| `task review` | Read-only contracts + lint + typecheck + unit + agent + API checks |
| `task dev:kill` / `task test:kill` | Clear lingering API/PWA or Playwright/Vitest processes |

---

## 5. Troubleshooting & Environment Basics

- **PWA/API routing behind Traefik:** Both PWA and API share `http://pwa.wfs.localhost` (`PathPrefix(/api)` goes to `api:9001`). Do not set `NEXT_PUBLIC_API_BASE_URL=http://api.wfs.localhost`; keep it empty for Traefik, or `http://localhost:9001` only when hitting the native API directly.
- **Port conflicts or stale test servers:** Run `task dev:kill` and `task test:kill` before re-running `test:e2e` or `dev:pwa`.
- **Database schema drift:** Run `task migrate` after pulling changes to `api/database/schema.sql` or `compatibility.sql`.
- **Stuck OpenAPI / Kiota client mismatch:** Run `task gen:client` after editing `specs/openapi.yaml`, or `task check:contracts` to inspect drift.
