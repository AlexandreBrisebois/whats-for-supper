# Local Development Loop & Infrastructure

Comprehensive guide for local development, service orchestration, and discovery.

## Service Dependencies (Internal Network)

```mermaid
graph TD
    User["User (Browser)"] -- "HTTP :80 (Traefik)" --> Traefik["Traefik (Reverse Proxy)"]
    Traefik -- "Host: pwa..." --> PWA["PWA (Next.js)"]
    Traefik -- "Host: api..." --> API["API (.NET 10)"]
    PWA --> DB[("PostgreSQL (pgvector)")]
    API --> DB
```

## Discovery Rules
- **Tooling**: Always check [.agents/AGENT_TOOLBOX.md](.agents/AGENT_TOOLBOX.md) for custom scripts.
- **Environment**: Infrastructure variables live in `docker/.env`. PWA-specific overrides live in `pwa/.env.local`.
- **Migrations**: `api/Migrations/` is the authoritative source for schema changes.
- **Paths**: All infrastructure commands (Task, Docker) MUST be run from the project root.

---

## 1. Setup: Install Task

First, install [Task](https://taskfile.dev/installation/):

```bash
# macOS
brew install go-task

# Linux
curl -sL https://taskfile.dev/install.sh | sh

# Windows
choco install task
# or download from: https://github.com/go-task/task/releases
```

Verify installation:
```bash
task --version
```

---

## Local Development Commands

All commands run from project root using Task:

### Quick Reference

View all tasks:
```bash
task -l
# or just
task
```

**Most common tasks:**

| Task | Description |
|------|-------------|
| `task up` | Start all Phase 0 services (Traefik) 🚀 |
| `task down` | Stop all modular services ⛔ |
| `task dev` | Alias for `task up` |
| `task dev:api` | Start API with hot reload |
| `task dev:pwa` | Start PWA with hot reload |
| `task test` | Run all tests 🧪 |
| `task logs` | View logs from all services 📋 |
| `task agent:summary` | 🤖 Context-dense AI summary |
| `task health` | Check if services are running 🏥 |
| `task clean` | Clean everything up 🧹 |

**Detailed usage:**

```bash
# First time setup
task init              # Initialize project (installs deps, starts services)

# Development
task up               # Start all services
task dev:api           # API with hot reload
task dev:pwa           # PWA with hot reload
task dev:db            # Only database (for local API/PWA dev)

# Testing
task test              # Run all tests
task test:api          # API tests only
task test:api:watch    # API tests in watch mode
task test:pwa          # PWA tests only
task test:pwa:watch    # PWA tests in watch mode
task test:e2e          # Run E2E tests (Playwright)

# Building
task build             # Build all Docker images
task build:api         # Build API image only
task build:pwa         # Build PWA image only

# Container management
task ps                # Show running containers
task restart           # Restart all containers
task down              # Stop all containers

# Logging & debugging
task logs              # View all logs (streaming)
task logs:api          # View API logs
task logs:pwa          # View PWA logs
task logs:db           # View database logs
task logs:tail         # View last 50 lines from all services

# Database
task migrate           # Run migrations
task seed              # Populate test data
task db:backup         # Backup database
task db:restore        # Restore from backup

# Container shells
task shell:api         # Bash in API container
task shell:pwa         # Shell in PWA container
task shell:db          # psql in database

# Code quality
task format            # Format all code
task lint              # Lint all code
task typecheck         # Type check TypeScript

# Health & diagnostics
task health            # Check all services
task env               # Show environment vars

# Cleanup
task clean             # Delete containers, volumes, caches
task clean:soft        # Stop containers (keep data)

# Workflows
task work              # Start dev workflow (shows next steps)
task review            # Pre-commit review (format + lint + test)
task ship              # Final ship checklist
task prod:config       # Generate unified production compose file 🏷️
```

---

## Local Development Loop: Fast Feedback

### Workflow 1: Full Stack (Docker)

**Best for testing complete end-to-end flows:**

```bash
# Terminal 1: Start all services
task up

# Terminal 2: Watch API logs
task logs:api

# Terminal 3: Watch PWA logs
task logs:pwa

# Browser: http://pwa.wfs.localhost
# API: http://api.wfs.localhost
```

**Feedback loop:**
- Edit code → Docker auto-reloads (via `dotnet watch` and Next.js HMR)
- Refresh browser → See changes immediately
- Check logs → `task logs:api` or `task logs:pwa`

**When to use:** Testing complete flows, integration testing, or when you want everything in containers.

---

### Workflow 2: API + PWA (Local Dev Servers)

**FASTEST for rapid iteration:**

```bash
# Terminal 1: Start just the database
task dev:db

# Terminal 2: Start API with hot reload
task dev:api

# Terminal 3: Start PWA with hot reload
task dev:pwa

# Browser: http://localhost:3000
```

**Why this is faster:**
- ⚡ API changes: instant recompile (dotnet watch)
- ⚡ PWA changes: instant HMR (Next.js dev server)
- ⚡ No Docker rebuild needed
- 🐛 Better IDE integration (breakpoints, debugging)
- 🎯 Exact error messages (not buried in docker logs)

**# API Logic (docker/.env)
POSTGRES_CONNECTION_STRING=postgres://recipe_app:secure_dev_password@localhost:5432/recipe_app_db
RECIPES_ROOT=/tmp/recipes
API_BASE_URL=http://localhost:5000

# PWA Logic (pwa/.env.local)
NEXT_PUBLIC_API_BASE_URL=http://api.wfs.localhost**

**When to use:** Daily development, debugging, feature work.

---

### Workflow 3: Testing Mode

**For writing & running tests:**

```bash
# Run all tests once
task test

# Run API tests in watch mode
task test:api:watch

# Run PWA tests in watch mode
task test:pwa:watch

# Run both in watch mode (separate terminals)
task test:api:watch &
task test:pwa:watch &
```

**When to use:** TDD, debugging test failures, before committing.

---

### Workflow 4: Quick Commands

**Pre-commit checks:**
```bash
# Format + Lint + Test
task review
```

**Full ship checklist:**
```bash
# Review + Build + Dev + Health check
task ship
```

**Guided development workflow:**
```bash
# Shows instructions for next steps
task work
```

---

## Local Loop Best Practices

### 1. **Database Snapshots**
Before making breaking schema changes, save a snapshot:
```bash
# Backup
task db:backup
# Creates: backup_1712345678.sql

# Restore
task db:restore
```

### 2. **Test Data**
Always have test families and recipes:
```bash
task seed
```

### 3. **Hot Reload Setup**
Both API and PWA are configured for hot reload by default:

**API:** Uses `dotnet watch run`
```bash
task dev:api
```

**PWA:** Uses Next.js dev server (HMR enabled by default)
```bash
task dev:pwa
```

### 4. **Environment Variables**

This project uses a **Dual-Config Strategy** to separate your NAS settings from your local development overrides.

- **[docker/.env](file:///Users/alex/Code/whats-for-supper/docker/.env)** (Gitignored): Stays as your primary source for NAS/Production settings (ports 9001/9002, NAS IPs, Production Secrets).
- **[docker/.env.local](file:///Users/alex/Code/whats-for-supper/docker/.env.local)** (Gitignored): Used for your local machine overrides (standard ports 3000/5000, local internal URLs).

The `Taskfile.yml` automatically stacks these files when running locally.

**Initialize local overrides:**
```bash
# Create local override file
cat <<EOF > docker/.env.local
API_PORT=5000
PWA_PORT=3000
API_INTERNAL_URL=http://api:5000
CORS_ALLOWED_ORIGINS=http://pwa.wfs.localhost,http://localhost:3000
ASPNETCORE_ENVIRONMENT=Development
EOF
```

### 5. **Know Your Workflows**
Use Task's built-in workflows:
```bash
# Development workflow (with instructions)
task work

# Pre-commit review (format + lint + test)
task review

# Ship checklist (full validation)
task ship
```

---

## GitHub Actions: Cloud Loop

Full CI/CD pipeline that validates everything on every push/PR.

### Structure

```
.github/workflows/
├── test.yml           # Runs on every PR: unit tests, lint, type check
├── build.yml          # Runs on merge to main: build containers
├── deploy.yml         # Runs on release tag: deploy to production
└── nightly.yml        # Runs daily: E2E tests, performance tests
```

### Workflow 1: Test on PR (`test.yml`)

Runs on every PR to catch bugs early:

```yaml
name: Test & Lint

on:
  pull_request:
    branches: [main]

jobs:
  api-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: recipes
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '10.0.x'

      - name: Restore dependencies
        run: cd api && dotnet restore

      - name: Build
        run: cd api && dotnet build --no-restore

      - name: Run tests
        run: cd api && dotnet test --no-build --verbosity normal

      - name: Run analyzers
        run: cd api && dotnet format --verify-no-changes --verbosity diagnostic

  pwa-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: pwa/package-lock.json

      - name: Install dependencies
        run: cd pwa && npm ci

      - name: Run tests
        run: cd pwa && npm run test

      - name: Run lint
        run: cd pwa && npm run lint

      - name: Type check
        run: cd pwa && npm run typecheck

      - name: Build
        run: cd pwa && npm run build
```

---

### Workflow 2: Build on Merge (`build.yml`)

Builds Docker images on merge to main:

```yaml
name: Build

on:
  push:
    branches: [main]

jobs:
  build-containers:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2

      - name: Build API image
        run: docker build -t whats-for-supper/api:latest -t whats-for-supper/api:${{ github.sha }} ./api

      - name: Build PWA image
        run: docker build -t whats-for-supper/pwa:latest -t whats-for-supper/pwa:${{ github.sha }} ./pwa

      # Optional: Push to registry
      # - uses: docker/login-action@v2
      #   with:
      #     registry: ghcr.io
      #     username: ${{ github.actor }}
      #     password: ${{ secrets.GITHUB_TOKEN }}

      # - uses: docker/build-push-action@v4
      #   with:
      #     context: ./api
      #     push: true
      #     tags: ghcr.io/${{ github.repository }}/api:latest
```

---

### Workflow 3: Deploy on Release (`deploy.yml`)

Runs when you create a release tag:

```yaml
name: Deploy

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          echo "Deploying ${{ github.event.release.tag_name }}"
          # Add your deployment logic here
          # e.g., ssh to server, pull images, run docker-compose up
```

---

### Workflow 4: Self-Hosted NAS Runner

For production deployments on a Synology NAS, a self-hosted runner executes the `publish.yml` workflow to build and push images to a local registry.

#### Connectivity & Troubleshooting

If you encounter `i/o timeout` errors when pushing to the local registry (e.g., `192.168.1.226:5050`), it is likely a loopback networking issue where the builder container cannot reach the host IP.

If you encounter `server gave HTTP response to HTTPS client`, your registry is not using TLS and you must explicitly allow insecure connections.

**Current CI Fix:**
- The Runner container uses `network_mode: host` in `docker/actions-runner/compose.yml`.
- The Buildx instance uses `driver-opts: network=host` in `.github/workflows/publish.yml`.
- The Buildx instance also has `buildkitd-config-inline` to allow the HTTP registry.

**Developer Machine Fix:**
If you run `task publish` from your own machine, you must add the registry to your Docker Engine settings:
1. Open **Docker Desktop Settings**.
2. Go to **Docker Engine**.
3. Add the registry to `insecure-registries`:
   ```json
   {
     "insecure-registries": ["192.168.1.226:5050"]
   }
   ```
4. **Apply & Restart**.

**Future-Proofing & Overrides:**
If you change your runner environment or networking stack and `network: host` is no longer viable, you can override the registry target without changing code by setting the `WFS_REGISTRY` environment variable on the runner:

| Override Strategy | Value | Use Case |
|-------------------|-------|----------|
| **Localhost** | `WFS_REGISTRY=localhost:5050` | Registry and Runner share the same network stack. |
| **Docker Bridge** | `WFS_REGISTRY=172.17.0.1:5050` | Registry bound to the bridge gateway. |
| **Custom IP** | `WFS_REGISTRY=192.168.1.x:5050` | Moving the registry to a different machine. |

This variable is supported by the `publish` task in `Taskfile.yml`.

---

## Sync Between Local & Cloud

### Local → Cloud (Push to GitHub)
```bash
# Make changes locally
# Run local tests
make test

# If tests pass, push
git push origin feature-branch

# GitHub Actions automatically:
# 1. Runs all tests
# 2. Builds Docker images
# 3. Checks linting/types
# 4. Comments on PR with results
```

### Cloud → Local (Pull from GitHub)
```bash
# Get latest main with all validated changes
git pull origin main

# Local tests may pass/fail differently (different OS, versions)
# If tests fail locally, debug with:
make logs
make shell-api
make shell-db
```

---

## Example: Complete Development Session

### Setup (first time)
```bash
# Clone repo
git clone https://github.com/yourorg/whats-for-supper.git
cd whats-for-supper

# Install Task if you haven't already
brew install go-task  # or your OS equivalent

# One-command setup (installs deps, starts services, seeds data)
task init
```

### Development (iterative)
```bash
# Terminal 1: Watch API
task dev:api

# Terminal 2: Watch PWA
task dev:pwa

# Terminal 3: Watch logs
task logs

# Or use the guided workflow
task work

# Edit code → see changes in browser instantly
# Tests fail → fix issue → tests pass
```

### Testing before commit
```bash
# Run pre-commit review (format + lint + test)
task review

# If tests fail, check logs
task logs:api
task logs:pwa

# Debug in container
task shell:db

# If everything passes
git add .
git commit -m "feature: add hint system"
git push

# GitHub Actions takes over:
# - Runs full test suite in cloud
# - Builds Docker images
# - Checks formatting & types
# - Comments on PR with results
```

### Cleanup
```bash
# Stop everything (keep data)
task stop

# Or full reset (delete containers, volumes, caches)
task clean
```

---

## Performance Optimization

### Slow Local Loop? Try This:

1. **Use local dev servers (FASTEST):**
   ```bash
   task dev:db      # Just database
   task dev:api     # API with hot reload (much faster!)
   task dev:pwa     # PWA with hot reload
   ```
   This skips Docker rebuilds and gives instant feedback.

2. **Run only the service you're testing:**
   ```bash
   # Only testing PWA?
   cd pwa && npm run test
   
   # Only testing API?
   cd api && dotnet test
   ```

3. **Run specific test file for quick feedback:**
   ```bash
   cd pwa && npm run test -- capture.test.ts
   cd api && dotnet test -- --filter "CaptureTests"
   ```

4. **Clear caches if build seems stuck:**
   ```bash
   # npm cache
   cd pwa && npm cache clean --force
   
   # dotnet cache
   cd api && dotnet nuget locals all --clear
   ```

---

## Troubleshooting Local Loop

| Problem | Solution |
|---------|----------|
| Port 80 in use | Another web server is running. Stop it or change Traefik ports in `infrastructure.yml` |
| Traefik returns 404 | Docker Provider hasn't discovered services. Check `task health` and `task logs:traefik` |
| Docker Provider is `null` | Handshake failed. Check `infrastructure.yml` for correct `/var/run/docker.sock` mount |
| Database won't start | `task clean` then `task up` |
| API can't connect to DB | Check `POSTGRES_CONNECTION_STRING` in `.env`. Ensure DB is healthy. |
| PWA can't reach API | Check `NEXT_PUBLIC_API_BASE_URL` - should be `http://api.wfs.localhost` |
| Check service health | `task health` (the single source of truth) |
| Need to inspect database | `task shell:db` (opens psql) |
| Lost test data | `task seed` to repopulate |
| API throwing errors | `task logs:api` to see stack traces |

---

## Next Steps

1. ✅ **Taskfile.yml** created at project root
2. ✅ **LOCAL_DEV_LOOP.md** (this file) documents all workflows
3. ⏭️ **Create `.env.example`** with all needed vars
4. ⏭️ **Create `.github/workflows/test.yml`** for PR validation on every push
5. ⏭️ **Create `.github/workflows/build.yml`** to build containers on merge
6. ⏭️ **Document in README.md** which `task` commands to run first

## Working with AI Agents

This repository is optimized for **Universal Agent Protocol (UAP)**.
- **Master Rules**: See [AGENT.md](../../AGENT.md).
- **Session Log**: See [HANDOVER.md](../../HANDOVER.md) for transient execution state.
- **Discovery**: Use `task agent:summary` to rapidly map the workspace.

## 7. Troubleshooting

<details>
<summary>Port already in use (bind: address already in use)</summary>

Another process is using port 5432, 80, or 8080. Since we use Traefik as a reverse proxy, port 80 must be available.
If you need to change the host ports, edit `docker/compose/infrastructure.yml`.
</details>

<details>
<summary>API not responding</summary>

Check logs with `task logs:api`. Ensure Postgres is healthy first with `task health`.
</details>

<details>
<summary>PWA shows "Network Error" when making API calls</summary>

The browser makes requests to `NEXT_PUBLIC_API_BASE_URL`. In Docker mode this is `http://api.wfs.localhost`.
Check `docker/.env` has `NEXT_PUBLIC_API_BASE_URL=http://api.wfs.localhost`.
</details>

<details>
<summary>Camera not working in browser</summary>

- Requires a secure context (`https`) or `localhost`.
- On headless CI or non-camera machines, use the **Gallery** option.
</details>

---

## 8. Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `recipe_app` | PG superuser / app user |
| `POSTGRES_PASSWORD` | `secure_dev_password` | PG password |
| `POSTGRES_DB` | `recipe_app_db` | PG database name |
| `API_PORT` | `9001` | Host-side API port |
| `PWA_PORT` | `3000` | Host-side PWA port |
| `NEXT_PUBLIC_API_BASE_URL` | `http://api.wfs.localhost` | API base URL visible to the browser |

See `docker/.env.example` for the full list.

## 9. Quick Start Checklist
- [x] Install Task: `brew install go-task`
- [x] Verify Task: `task --version`
- [x] View all tasks: `task -l`
- [x] First run: `task init`
- [x] Check if services are healthy: `task health`
- [ ] Open http://pwa.wfs.localhost in browser
- [ ] Before pushing: `task review`

