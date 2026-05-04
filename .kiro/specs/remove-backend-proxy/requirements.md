# Requirements Document

## Introduction

Remove the Next.js `/backend` rewrite proxy and replace it with a single, consistent routing model where the browser always calls `/api` directly. Production already routes `PathPrefix(/api)` to the API container via Traefik; this change aligns local dev and Docker dev to the same model. The `/backend` proxy was a workaround that is no longer needed and creates an inconsistency between environments. All source references to `/backend` — in code, configuration, environment files, Docker Compose labels, and documentation — must be eliminated.

## Glossary

- **Browser_Client**: The Kiota-generated API client (`api-client.ts`) and any `fetch()` calls made from browser-side code (React components, hooks, client utilities).
- **Server_Client**: The `serverFetch()` function in `server-client.ts`, used exclusively in Next.js Server Components to call the API container via `API_INTERNAL_URL`.
- **API_Container**: The .NET 10 RecipeApi service, reachable at `http://api:9001` inside Docker networks and at `http://127.0.0.1:5001` in local dev.
- **Traefik**: The reverse proxy that routes incoming HTTP requests to the correct container. In production it routes `Host(wfs.srvrlss.dev) && PathPrefix(/api)` to the API container. After this change, Docker dev must use the same `PathPrefix(/api)` rule on the PWA host.
- **NEXT_PUBLIC_API_BASE_URL**: The public environment variable that controls the base URL used by browser-side `fetch()` calls. Must default to `/api` in all environments after this change.
- **API_INTERNAL_URL**: The server-side environment variable pointing to the API container's internal address. Not changed by this feature.
- **Backend_Proxy**: The Next.js rewrite rule `source: '/backend/:path*' → destination: '${API_INTERNAL_URL}/:path*'` in `next.config.js`. This is the artefact being removed.
- **ADR**: Architecture Decision Record, stored under `specs/decisions/`.
- **Kiota_Client**: The generated TypeScript client in `pwa/src/lib/api/generated/`, produced by Kiota from the OpenAPI spec. Its generated logic must not be changed; only JSDoc comments may be updated.

## Requirements

### Requirement 1: Browser API calls use `/api` directly

**User Story:** As a developer, I want the browser to call `/api` directly so that all environments (local dev, Docker dev, production) use the same routing model and there is no environment-specific proxy workaround in the codebase.

#### Acceptance Criteria

1. THE `Browser_Client` SHALL use `process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api'` as its base URL, with no `NODE_ENV` or `isProd` branch.
2. WHEN `NEXT_PUBLIC_API_BASE_URL` is not set, THE `Browser_Client` SHALL default to `/api`.
3. THE `Browser_Client` SHALL NOT construct any URL containing the path segment `/backend`.
4. WHEN a browser-side `fetch()` call is made in `recipes.ts`, THE `Browser_Client` SHALL use `process.env.NEXT_PUBLIC_API_BASE_URL || '/api'` as the base URL fallback.
5. WHEN a browser-side `fetch()` call is made in `schedule.ts`, THE `Browser_Client` SHALL use `process.env.NEXT_PUBLIC_API_BASE_URL || '/api'` as the base URL fallback.

### Requirement 2: Next.js backend proxy rewrite is removed

**User Story:** As a developer, I want the `/backend` rewrite rule removed from `next.config.js` so that the Next.js server no longer acts as a proxy and the routing topology is simplified.

#### Acceptance Criteria

1. THE `next.config.js` SHALL NOT contain a rewrite rule with `source: '/backend/:path*'`.
2. THE `next.config.js` SHALL NOT contain any reference to the path segment `/backend`.
3. WHEN `next.config.js` has no remaining rewrites, THE `next.config.js` SHALL omit the `rewrites()` export entirely rather than returning an empty array.

### Requirement 3: `config.ts` default URL is updated

**User Story:** As a developer, I want `API_BASE_URL` in `config.ts` to default to `/api` so that any code importing this constant gets the correct value without needing an environment variable override.

#### Acceptance Criteria

1. THE `config.ts` SHALL export `API_BASE_URL` as `process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api'`.
2. THE `config.ts` SHALL NOT contain the string `/backend` in any default value or fallback.

### Requirement 4: Server-side client no longer strips `/backend` prefix

**User Story:** As a developer, I want `server-client.ts` to stop stripping the `/backend` prefix so that the server-side fetch path is constructed cleanly from the endpoint argument.

#### Acceptance Criteria

1. THE `Server_Client` SHALL construct the request URL as `${API_INTERNAL_URL}${endpoint}` without any string replacement on the endpoint.
2. THE `Server_Client` SHALL NOT call `.replace(/^\/backend/, '')` or any equivalent transformation on the endpoint argument.
3. WHEN `serverFetch('/api/schedule?weekOffset=0')` is called, THE `Server_Client` SHALL request `${API_INTERNAL_URL}/api/schedule?weekOffset=0`.

### Requirement 5: Image utility returns `/api` paths without prepending `/backend`

**User Story:** As a developer, I want `imageUtils.ts` to return `/api/...` paths as-is so that image URLs are correct in all environments without a proxy prefix.

#### Acceptance Criteria

1. WHEN `getImageUrl` receives a path starting with `/api/`, THE `imageUtils.ts` SHALL return that path unchanged.
2. THE `imageUtils.ts` SHALL NOT prepend `/backend` to any path.
3. WHEN `getImageUrl('/api/recipes/123/original/0')` is called, THE `imageUtils.ts` SHALL return `'/api/recipes/123/original/0'`.

### Requirement 6: Environment files default to `/api`

**User Story:** As a developer, I want all environment files to use `/api` as the default so that running the app locally or in tests requires no manual override.

#### Acceptance Criteria

1. THE `pwa/.env.local` SHALL set `NEXT_PUBLIC_API_BASE_URL=/api`.
2. THE `pwa/.env.test` SHALL set `NEXT_PUBLIC_API_BASE_URL=/api`.
3. THE `pwa/playwright.config.ts` webServer env block SHALL set `NEXT_PUBLIC_API_BASE_URL: '/api'`.
4. THE `pwa/.env.local` SHALL NOT contain the string `/backend`.
5. THE `pwa/.env.test` SHALL NOT contain the string `/backend`.

### Requirement 7: Docker Compose dev environment routes `/api` via Traefik

**User Story:** As a developer, I want the Docker dev environment to route `/api` requests to the API container via Traefik — matching the production routing model — so that local Docker dev and production behave identically.

#### Acceptance Criteria

1. THE `docker/compose/apps.yml` SHALL set `NEXT_PUBLIC_API_BASE_URL` to `/api` as the default value.
2. THE `docker/compose/apps.yml` Traefik label for the `api` service SHALL use the rule `` Host(`${PWA_HOST:-pwa.wfs.localhost}`) && PathPrefix(`/api`) `` so that `/api` requests arriving at the PWA host are forwarded to the API container.
3. THE `docker/compose/apps.yml` SHALL NOT contain the string `/backend` in any environment variable default or Traefik label.
4. THE `docker/docker-compose.prod.yml` SHALL set `NEXT_PUBLIC_API_BASE_URL: /api`.
5. THE `docker/docker-compose.prod.yml` SHALL NOT contain the string `/backend`.

### Requirement 8: CORS allows direct browser connections in development

**User Story:** As a developer, I want the API's CORS configuration to allow `http://127.0.0.1:3000` so that browsers connecting directly to `/api` from the Playwright test runner or local dev are not blocked by CORS.

#### Acceptance Criteria

1. THE `api/appsettings.Development.json` `Cors.AllowedOrigins` array SHALL include `http://127.0.0.1:3000`.
2. THE `api/appsettings.Development.json` `Cors.AllowedOrigins` array SHALL retain `http://localhost:3000`.
3. WHEN a browser at `http://127.0.0.1:3000` sends a cross-origin request to the API, THE `API_Container` SHALL respond with the appropriate `Access-Control-Allow-Origin` header.

### Requirement 9: All `/backend` references removed from source comments and documentation

**User Story:** As a developer, I want all JSDoc comments, inline comments, and documentation that reference `/backend` to be updated so that the codebase accurately reflects the new routing model.

#### Acceptance Criteria

1. THE `pwa/src/lib/api/types.ts` JSDoc comments SHALL NOT contain the string `/backend`; references to "proxied through /backend" SHALL be replaced with "served directly from /api".
2. THE `pwa/src/lib/api/generated/models/index.ts` JSDoc comments SHALL NOT contain the string `/backend`; only JSDoc comments may be changed in this Kiota-generated file.
3. THE `pwa/src/lib/identity/cookie.ts` inline comment SHALL NOT contain the string `/backend`.
4. THE `pwa/next.config.js` comment block describing the proxy SHALL be removed along with the rewrite rule.

### Requirement 10: Architecture Decision Record documents the change

**User Story:** As a developer, I want an ADR that records the decision to remove the `/backend` proxy so that future contributors understand why the proxy existed, why it was removed, and what the new routing model is.

#### Acceptance Criteria

1. THE `specs/decisions/036-direct-api-calls.md` ADR SHALL exist and describe the decision to remove the `/backend` proxy.
2. THE ADR SHALL reference ADR 033 (`033-nextjs-16-proxy-pattern.md`) as prior context for the proxy pattern history.
3. THE ADR SHALL reference ADR 034 (`034-two-stage-member-context-gate.md`) as confirmation that `/api/*` was already excluded from the proxy gate.
4. THE ADR SHALL document that `NEXT_PUBLIC_API_BASE_URL` defaults to `/api` in all environments after this change.
5. THE ADR SHALL document that Traefik routes `PathPrefix(/api)` to the API container in both Docker dev and production.

### Requirement 11: All existing E2E tests continue to pass

**User Story:** As a developer, I want all 65 existing Playwright E2E tests to pass after the routing change so that I have confidence the refactor has not broken any user-facing behaviour.

#### Acceptance Criteria

1. WHEN `task test:pwa` is executed after all changes are applied, THE test suite SHALL report all 65 tests passing with zero failures.
2. WHEN `task review` is executed after all changes are applied, THE build SHALL report zero TypeScript type errors and zero lint errors.
3. THE E2E test `page.route()` intercept patterns SHALL match `/api/` paths directly, without requiring the `\/(?:backend\/)?api\/` alternation pattern for any path that was previously only reachable via the proxy.
