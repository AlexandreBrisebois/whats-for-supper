# What's For Supper

A mobile-first recipe capture and planning app for families. What's For Supper streamlines the "what's for dinner?" problem with AI-powered capture, collaborative family voting, intelligent weekly planning, and a premium step-by-step Cook's Mode.

---

## Quick Start

```bash
git clone https://github.com/AlexandreBrisebois/whats-for-supper.git
cd whats-for-supper
task init
```

All services start in order. The first run takes ~2 minutes while Docker pulls base images and builds the containers. Subsequent starts are ~10 seconds.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Browser / Mobile                    │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP  :3000
┌────────────────────────▼─────────────────────────────┐
│               PWA — Next.js 15 (TypeScript)          │
│  /onboarding  /home  /capture  /api/health           │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP  :3000
┌────────────────────────▼─────────────────────────────┐
│           API — ASP.NET Core 10 (.NET 10)            │
│  /api/family  /api/recipes  /api/management  /health │
│  Auto-migrates DB on startup                         │
└────────────────────────┬─────────────────────────────┘
                         │ TCP   :9001
┌────────────────────────▼─────────────────────────────┐
│                PostgreSQL 17 (Alpine)                 │
│  family_members  recipes  (EF Core migrations)       │
└──────────────────────────────────────────────────────┘
```

All three services run in Docker on a shared bridge network (`app-network`). Recipe images are persisted in the `whats-for-supper-recipes` named volume; database rows in `whats-for-supper-postgres`.

---

## Services

| Service | Port | Image / Build |
|---------|------|---------------|
| PostgreSQL | 5432 | `postgres:17-alpine` |
| API | 9001 | `./api` (Ubuntu Chiseled, .NET 10) |
| PWA | 3000 | `./pwa` (Node 22 Alpine, Next.js 15) |

Health endpoints:
- `GET http://localhost:9001/health` — API + database check
- `GET http://localhost:3000/api/health` — PWA liveness

---

## Development

**AI-Optimized Entry**: If you are an AI agent (Copilot, Gemini, Claude), start with **[AGENT.md](AGENT.md)**. Then read **[specs/02_BACKEND/backend-api.spec.md](specs/02_BACKEND/backend-api.spec.md)** before modifying any API endpoints.

**Human Developer Guide**: For detailed setup instructions, local dev without Docker, troubleshooting, and environment variable reference, see **[LOCAL_DEV_LOOP.md](LOCAL_DEV_LOOP.md)**.

### Common commands

```bash
# Start all services
task up

# Rebuild after source changes
task build
task up

# Generate production compose (for NAS)
task prod:config
# Output: docker/docker-compose.prod.yml

# Watch API logs
task logs:api

# Run API unit tests
task test:api

# Run Playwright E2E tests (from pwa/)
npm run test:e2e

# --- System Integrity ---

# Check for schema drift (C# DTOs vs OpenAPI)
task agent:drift

# View full API mapping
task agent:api
```

---

## Testing

### API (xUnit)

```bash
cd api
dotnet test src/RecipeApi.Tests/RecipeApi.Tests.csproj
```

Tests cover controllers, services, and integration with a real Postgres instance via `TestWebApplicationFactory`.

### PWA (Playwright)

```bash
cd pwa
npm install
npx playwright install chromium
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:debug    # headed with debugger
```

E2E suites:
- `e2e/onboarding.spec.ts` — fresh user redirect, member select, member create
- `e2e/capture-flow.spec.ts` — navigate to capture, upload image, submit recipe
- `e2e/integration.spec.ts` — full end-to-end journey

---

---

## Status

| Area | Status |
|------|--------|
| Database schema | Complete |
| REST API (family + recipes) | Complete |
| PWA onboarding flow | Complete |
| PWA capture flow | Complete |
| PWA discovery & voting | Complete |
| PWA weekly planner | Complete |
| PWA cook's mode | Complete |
| Docker Compose integration | Complete |
| E2E tests (Playwright) | Complete |
| CI/CD (GitHub Actions) | Complete |
| Phase 5 (Diet Agent, AI Inference) | Active |

---

## Self-Hosting & Deployment

WFS is designed to be self-hosted on a NAS (e.g., Synology) or a local server. For secure public access without opening ports, we recommend **Cloudflare Tunnel**.

### 1. Cloudflare Tunnel Setup

Cloudflare Tunnel creates a secure outbound bridge between your NAS and the Cloudflare edge.

1.  **Create a Tunnel**: Go to the [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) -> **Networks** -> **Tunnels**.
2.  **Name your Tunnel**: e.g., `wfs-nas`.
3.  **Install Connector**: Select "Docker" and copy the **Tunnel Token** (the string after `--token`).
4.  **Configure Public Hostnames**:
    -   `wfs.srvrlss.dev` -> `http://traefik:80`
    -   `api.wfs.srvrlss.dev` -> `http://traefik:80`
5.  **Environment Variables**: Add your token to the `.env` file:
    ```bash
    CLOUDFLARE_TUNNEL_TOKEN=your-token-here
    DOMAIN_NAME=srvrlss.dev
    ```

### 2. Security (Hearth Secret)

WFS uses a "Hearth Secret" for no-password authentication. This is a shared passphrase known only to your family.

-   **Setup**: Set the `HEARTH_SECRET` environment variable to a strong, private string.
-   **How it works**: New members join via a **Magic Link**. Once they enter the secret, a signed `h_access` cookie is set in their browser.
-   **Magic Links**: You can generate invite links via the PWA (Settings) or manually using the tool:
    ```bash
    node scripts/generate-auth-token.mjs --memberId <some-guid>
    ```

---

## Local Tools & Taskfile

We use [Task](https://taskfile.dev) to manage common development and deployment workflows.

| Command | Description |
|---------|-------------|
| `task init` | Initialize environment and start all services |
| `task up` | Start/Restart services in Docker |
| `task logs:api` | Stream API logs |
| `task prod:config` | Generate optimized production Docker Compose |
| `task test:e2e` | Run Playwright E2E tests |

---

## Configuration & Environment Variables

WFS uses several `.env` files depending on how you are running the application.

| File | Scope | Usage |
|------|-------|-------|
| `docker/.env` | **Ecosystem** | Primary configuration for Docker Compose (`task up`). |
| `pwa/.env.local` | **Frontend** | Used only when running the PWA locally via `npm run dev`. |
| `.env.test` | **Testing** | Used by Playwright E2E tests and API unit tests. |

### Setup Instructions
1.  **Docker Setup**: Copy `docker/.env.example` to `docker/.env` and fill in your `GEMINI_API_KEY` and `HEARTH_SECRET`.
2.  **Local PWA Dev**: If you want to run the PWA outside Docker, copy `pwa/.env.local.example` to `pwa/.env.local`. Set `API_INTERNAL_URL` to `http://localhost:9001` (if the API is running in Docker) or your local API port.

---

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**.

1. Fork and create a feature branch.
2. `docker-compose up --build` — all services must start clean.
3. `dotnet test` and `npm run test:e2e` must pass.
4. Open a pull request against `main`.

---

## License

MIT — see **[LICENSE](LICENSE)**.
