# ADR 023: Resilient Docker Development Workflow

## Status
Accepted

## Context
The project uses "chiseled" (distroless) Docker images for production parity. These images do not contain a shell (`sh`, `bash`), making `docker exec` commands impossible for management tasks like database seeding. Additionally, Docker's aggressive layer caching often led to "stale" code running in containers despite local file changes.

## Decision
We have overhauled the development tasks in `Taskfile.yml` to be more resilient and compatible with distroless environments.

- **HTTP-Based Seeding**: Switched `task seed` from `docker exec dotnet user-secrets` to a `curl` POST request against the API's `/api/management/seed` endpoint.
- **Polling & Health Checks**: The `seed` task now includes a retry loop that waits for the API to be healthy and polls the status of the background restore workflow until completion.
- **Forced Rebuilds**: Added `--build` to `task dev:db:sync` to ensure that local code changes are always compiled into the container image during a sync.
- **Nuclear Reset**: Introduced `task dev:clean:sync` which uses `down -v --rmi local` to completely wipe volumes and images before a fresh rebuild.

## Consequences
- **Positive**: No more "chasing ghosts" (running stale code). Seeding works reliably in both local and Docker environments. Improved visibility into background workflow status.
- **Negative**: Rebuilds during sync take slightly longer, though incremental builds mitigate this.
