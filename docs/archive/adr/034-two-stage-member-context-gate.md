# ADR 034: Two-Stage Member Context Gate

## Context
Every request must be both authorized (valid Hearth token) and scoped to a family member (profile selected). A two-stage gate in `pwa/src/proxy.ts` enforces this at the edge before any page or API route handler runs.

## Decision
Implement a two-stage check in `pwa/src/proxy.ts`:

1. **Stage 1: Access Gate (Hearth Auth)**
   - Validates the `h_access` cookie using HMAC-SHA256 against `HEARTH_SECRET`.
   - Redirects to `/welcome` if missing or invalid; deletes the stale cookie on redirect.
   - Skipped for: `/welcome`, `/invite`, `/join`, `/api/*`, `/onboarding`.

2. **Stage 2: Context Gate (Profile Selection)**
   - Validates the `x-family-member-id` cookie.
   - Redirects to `/onboarding` if missing.
   - Skipped for all Stage 1 public paths plus `/onboarding`.

## Status
Implemented.

## Consequences
- Every protected route is guaranteed to have a valid `h_access` token and an `x-family-member-id` cookie.
- `/api/*` is excluded from the gate — the browser calls the API container directly via Traefik (`wfs.srvrlss.dev/api`). The API enforces its own Hearth auth via `HearthAuthenticationHandler`.
- The `x-family-member-id` cookie must be `httpOnly: false` so the Kiota API client can read it client-side and inject it as the `X-Family-Member-Id` request header.
- Onboarding sets `x-family-member-id` via a Server Action so the proxy sees it on the next request.
