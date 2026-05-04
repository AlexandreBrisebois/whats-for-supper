# Design Document: Remove Backend Proxy

## Overview

Remove the Next.js `/backend` rewrite rule and replace every `/backend` reference in the codebase with `/api`. After this change the browser calls `/api` directly in all environments — local dev, Docker dev, and production — using the same Traefik `PathPrefix(/api)` routing model that production already uses.

The change is purely mechanical: no new abstractions, no refactors beyond the 17 files listed in the requirements. The invariant after the change is:

> `NEXT_PUBLIC_API_BASE_URL` defaults to `/api` everywhere. Traefik routes `PathPrefix(/api)` to the API container in both Docker dev and production. The Next.js server no longer proxies anything.

### What is not changing

- `API_INTERNAL_URL` and `serverFetch()` routing logic (beyond removing the `.replace()` strip)
- Kiota-generated logic in `pwa/src/lib/api/generated/` — only JSDoc comments change
- CI environment (`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001`) — already a direct URL
- Root `.env.test` (`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001`) — already a direct URL
- `docker/compose/production-overrides.yml` — production CORS is same-origin (`https://wfs.srvrlss.dev`)
- E2E intercept patterns in `pwa/e2e/mock-api.ts` — already use `**/api/**` globs with no `/backend` alternation

---

## Architecture

### Current routing topology

```
Browser → localhost:3000/backend/* → Next.js rewrites → API container (port 9001)

Docker dev:
Browser → pwa.wfs.localhost/backend/* → Next.js rewrites → API container (http://api:9001)

Production:
Browser → wfs.srvrlss.dev/api/* → Traefik → API container (port 9001)
Browser → wfs.srvrlss.dev/backend/* → Next.js rewrites → API container (port 9001)  ← inconsistency
```

### Target routing topology

```
Local dev (npm run dev):
Browser → localhost:3000 (PWA)
Browser → localhost:9001/api/* (API direct, NEXT_PUBLIC_API_BASE_URL=http://localhost:9001)

Docker dev (docker compose up):
Browser → pwa.wfs.localhost/* → Traefik → PWA container (port 3000)
Browser → pwa.wfs.localhost/api/* → Traefik → API container (port 9001)

Production:
Browser → wfs.srvrlss.dev/* → Traefik → PWA container (port 3000)
Browser → wfs.srvrlss.dev/api/* → Traefik → API container (port 9001)

Playwright tests (CI):
Browser → 127.0.0.1:3000 (PWA)
Browser → 127.0.0.1:5001/api/* (API direct, NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001)
```

The key difference in Docker dev: the `api` service Traefik label changes from `Host(api.wfs.localhost)` to `Host(pwa.wfs.localhost) && PathPrefix(/api)`, so `/api` requests arriving at the PWA host are forwarded to the API container — matching production exactly.

---

## Components and Interfaces

The changes are grouped into four concerns.

### Group A: Routing configuration

**`pwa/next.config.js`**

Remove the `rewrites()` export entirely (including its comment block). No other changes to this file.

Before:
```js
// Proxy /backend/* → API container so the browser only ever calls the PWA's
// own origin. Works on any device on the LAN without CORS or IP config.
// Kiota SDK paths already include /api/, so don't add it again.
async rewrites() {
  const apiUrl = process.env.API_INTERNAL_URL ?? 'http://api:9001';
  return [
    {
      source: '/backend/:path*',
      destination: `${apiUrl}/:path*`,
    },
  ];
},
```

After: the `rewrites()` method is gone. `nextConfig` retains all other properties unchanged.

**`docker/compose/apps.yml`** — two changes:

1. `pwa` service environment default: `NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-/backend}` → `${NEXT_PUBLIC_API_BASE_URL:-/api}`
2. `api` service Traefik router rule label:
   - Before: `` "traefik.http.routers.api.rule=Host(`${API_HOST:-api.wfs.localhost}`)" ``
   - After: `` "traefik.http.routers.api.rule=Host(`${PWA_HOST:-pwa.wfs.localhost}`) && PathPrefix(`/api`)" ``

The `API_HOST` variable and the separate `api.wfs.localhost` hostname are no longer needed once the API is reachable at `pwa.wfs.localhost/api`.

**`docker/docker-compose.prod.yml`**

`pwa` service environment: `NEXT_PUBLIC_API_BASE_URL: /backend` → `NEXT_PUBLIC_API_BASE_URL: /api`

### Group B: Source code

**`pwa/src/lib/api/api-client.ts`**

Remove the `isProd` branch. Replace with a single unconditional assignment using `NEXT_PUBLIC_API_BASE_URL`.

Before:
```ts
const isProd = process.env.NODE_ENV === 'production';
requestAdapter.baseUrl = isProd ? '/api' : 'http://localhost:9001/api';
```

After:
```ts
requestAdapter.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
```

The comment block above this line is also removed.

**`pwa/src/lib/constants/config.ts`**

Before:
```ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/backend';
```

After:
```ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
```

**`pwa/src/lib/api/recipes.ts`** — `createRecipe` function only

Before:
```ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/backend';
```

After:
```ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
```

**`pwa/src/lib/api/schedule.ts`** — `updateGroceryState` function only

Before:
```ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/backend';
```

After:
```ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
```

**`pwa/src/lib/imageUtils.ts`** — `getImageUrl` function only

Before:
```ts
return path.startsWith('/api/') ? `/backend${path}` : path;
```

After:
```ts
return path.startsWith('/api/') ? path : path;
```

Which simplifies to:
```ts
return path;
```

(The function already returns `''` for falsy input; the only remaining branch is the identity return.)

**`pwa/src/lib/api/server-client.ts`** — URL construction only

Before:
```ts
const url = `${API_INTERNAL_URL}${endpoint.replace(/^\/backend/, '')}`;
```

After:
```ts
const url = `${API_INTERNAL_URL}${endpoint}`;
```

No other changes to this file.

### Group C: Environment and configuration files

**`pwa/.env.local`**

Before: `NEXT_PUBLIC_API_BASE_URL=/backend`
After: `NEXT_PUBLIC_API_BASE_URL=/api`

**`pwa/.env.test`**

Before: `NEXT_PUBLIC_API_BASE_URL=/backend`
After: `NEXT_PUBLIC_API_BASE_URL=/api`

**`pwa/playwright.config.ts`** — `webServer.env` block only

Before: `NEXT_PUBLIC_API_BASE_URL: '/backend'`
After: `NEXT_PUBLIC_API_BASE_URL: '/api'`

**`api/appsettings.Development.json`** — `Cors.AllowedOrigins` array only

Add `http://127.0.0.1:3000` alongside the existing `http://localhost:3000`. This is required because Playwright's `baseURL` is `http://127.0.0.1:3000` and browsers treat `127.0.0.1` and `localhost` as distinct origins for CORS purposes.

Before:
```json
"AllowedOrigins": [
  "http://localhost:3000",
  "http://localhost:3001"
]
```

After:
```json
"AllowedOrigins": [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000"
]
```

### Group D: Documentation and comments

**`pwa/src/lib/api/types.ts`** — 3 JSDoc `@description` lines

Each occurrence of `Relative path proxied through /backend` becomes `Relative path served directly from /api`. The surrounding TypeScript interface definitions are not touched.

**`pwa/src/lib/api/generated/models/index.ts`** — 3 JSDoc comment lines (Kiota-generated)

Same substitution as `types.ts`: `proxied through /backend` → `served directly from /api`. Only the JSDoc comment text changes; no generated logic is modified.

**`pwa/src/lib/identity/cookie.ts`** — 1 inline comment

Before:
```ts
// Set cookie with Path=/ so it's sent to all routes including /backend
```

After:
```ts
// Set cookie with Path=/ so it's sent to all routes
```

**`specs/decisions/036-direct-api-calls.md`** — new ADR (see ADR section below)

---

## Data Models

No data model changes. This feature modifies routing configuration and URL construction only.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Most acceptance criteria in this feature are configuration or structural checks (SMOKE/EXAMPLE). Two criteria involve pure functions with meaningful input variation and are suitable for property-based testing.

### Property 1: `serverFetch` constructs URLs without transformation

*For any* endpoint string passed to `serverFetch`, the HTTP request URL SHALL equal `API_INTERNAL_URL` concatenated with the endpoint, with no string replacement or transformation applied to the endpoint.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 2: `getImageUrl` returns `/api/` paths unchanged

*For any* non-empty string that starts with `/api/`, `getImageUrl` SHALL return that string unchanged (no `/backend` prefix or any other transformation).

**Validates: Requirements 5.1, 5.2, 5.3**

---

## Error Handling

No new error conditions are introduced. The changes remove a proxy hop; if `NEXT_PUBLIC_API_BASE_URL` is misconfigured, browser fetch calls will fail with network errors in the same way they would today if `API_INTERNAL_URL` were misconfigured. No additional error handling is required.

The CORS addition in `appsettings.Development.json` is additive — it cannot break existing allowed origins.

---

## Testing Strategy

### Unit tests (example-based)

These cover the source code changes in Group B:

| File | What to assert |
|---|---|
| `api-client.ts` | `requestAdapter.baseUrl` equals `NEXT_PUBLIC_API_BASE_URL` when set; equals `'/api'` when unset |
| `config.ts` | `API_BASE_URL` equals `NEXT_PUBLIC_API_BASE_URL` when set; equals `'/api'` when unset |
| `recipes.ts` | `createRecipe` calls `fetch` with a URL starting with `NEXT_PUBLIC_API_BASE_URL` value |
| `schedule.ts` | `updateGroceryState` calls `fetch` with a URL starting with `NEXT_PUBLIC_API_BASE_URL` value |
| `imageUtils.ts` | `getImageUrl('/api/recipes/123/original/0')` returns `'/api/recipes/123/original/0'` |
| `server-client.ts` | `serverFetch('/api/schedule?weekOffset=0')` requests `${API_INTERNAL_URL}/api/schedule?weekOffset=0` |

### Property-based tests

Two properties are implemented as property-based tests (minimum 100 iterations each):

**Property 1 — `serverFetch` URL construction**
- Generator: arbitrary non-empty strings (including strings starting with `/backend`, `/api`, query strings, empty path segments)
- Assertion: the URL passed to `fetch` equals `API_INTERNAL_URL + endpoint` exactly
- Tag: `Feature: remove-backend-proxy, Property 1: serverFetch constructs URLs without transformation`

**Property 2 — `getImageUrl` identity on `/api/` paths**
- Generator: arbitrary strings with `/api/` prefix (varying path segments, UUIDs, indices)
- Assertion: return value equals input
- Tag: `Feature: remove-backend-proxy, Property 2: getImageUrl returns /api/ paths unchanged`

Use a TypeScript property-based testing library (e.g., `fast-check`) already present in the project or added as a dev dependency.

### Smoke / configuration checks

Verify by inspection or a simple grep-based test that:
- `next.config.js` contains no `rewrites` export and no `/backend` string
- `pwa/.env.local`, `pwa/.env.test`, `pwa/playwright.config.ts` all set `NEXT_PUBLIC_API_BASE_URL` to `/api`
- `docker/compose/apps.yml` default is `/api` and the Traefik label uses `PathPrefix(/api)`
- `docker/docker-compose.prod.yml` sets `NEXT_PUBLIC_API_BASE_URL: /api`
- `api/appsettings.Development.json` includes `http://127.0.0.1:3000` in `AllowedOrigins`
- No file in `pwa/src/` contains the string `/backend` (excluding test fixtures)

### End-to-end tests

Run `task test:pwa` after all changes. All 65 existing Playwright tests must pass. No new E2E tests are required — the existing suite already exercises every API path via `mock-api.ts`, which uses `**/api/**` glob patterns that match the new direct routing.

---

## ADR 036: Direct API Calls — Remove the `/backend` Proxy

**File:** `specs/decisions/036-direct-api-calls.md`

### Status

Proposed

### Context

The project has used a Next.js rewrite rule since early development to proxy `/backend/:path*` to the API container. This was introduced as a LAN development convenience: by routing through the PWA's own origin, any device on the local network could reach the API without knowing the API container's IP address or port, and without CORS configuration.

ADR 033 (`033-nextjs-16-proxy-pattern.md`) documents the migration from `middleware.ts` to `proxy.ts` in Next.js 16, but the `/backend` rewrite in `next.config.js` is a separate mechanism — a Next.js server-side HTTP proxy, not the edge proxy function.

Production has always used a different model: Traefik routes `Host(wfs.srvrlss.dev) && PathPrefix(/api)` directly to the API container. The browser calls `/api` directly; the Next.js server is not involved. ADR 034 (`034-two-stage-member-context-gate.md`) explicitly documents that `/api/*` is excluded from the two-stage auth gate because the browser calls the API container directly via Traefik.

This created an inconsistency:

- **Production**: browser → Traefik → API (direct, `/api`)
- **Docker dev**: browser → Next.js rewrite → API (proxied, `/backend`)
- **Local dev**: browser → Next.js rewrite → API (proxied, `/backend`)

The inconsistency means that a bug in CORS configuration, Traefik routing, or the API's auth middleware would not be caught in development. It also means `NEXT_PUBLIC_API_BASE_URL` had different semantics in different environments.

### Decision

Remove the `/backend` rewrite from `next.config.js` entirely. Update all source references to use `/api` directly. Update the Docker dev Traefik label for the `api` service to use `Host(pwa.wfs.localhost) && PathPrefix(/api)` so that Docker dev matches production routing exactly.

The new invariant is:

> `NEXT_PUBLIC_API_BASE_URL` defaults to `/api` in all environments. Traefik routes `PathPrefix(/api)` to the API container in both Docker dev and production. The Next.js server never proxies API traffic.

### Consequences

- All environments now use the same routing model. A CORS or Traefik misconfiguration will be visible in development.
- `NEXT_PUBLIC_API_BASE_URL` has a single, consistent meaning: the base URL the browser uses to reach the API. It defaults to `/api` (relative, same-origin via Traefik) and can be overridden to an absolute URL (e.g., `http://127.0.0.1:5001`) for local dev without Docker.
- The `api.wfs.localhost` hostname is no longer needed for Docker dev. The API is reachable at `pwa.wfs.localhost/api`.
- `api/appsettings.Development.json` gains `http://127.0.0.1:3000` in `AllowedOrigins` to support Playwright's `baseURL` of `http://127.0.0.1:3000` making direct cross-origin requests to the API.
- The Next.js build is marginally simpler (one fewer async export in `next.config.js`).
- No user-facing behaviour changes.
