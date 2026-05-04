# Implementation Plan: Remove Backend Proxy

## Overview

Remove the Next.js `/backend` rewrite and replace every `/backend` reference with `/api`. The proxy must remain functional until all callers have been migrated — `next.config.js` is the last file touched among source changes. The sequence is: CORS → source code → env/config → Docker Compose → remove rewrite → comments/docs → ADR → validation.

## Tasks

- [x] 1. Add `http://127.0.0.1:3000` to CORS AllowedOrigins in development config
  - In `api/appsettings.Development.json`, add `"http://127.0.0.1:3000"` to the `Cors.AllowedOrigins` array alongside the existing entries
  - This unblocks direct browser calls from Playwright's `baseURL` before any routing changes are made
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 2. Write property test for `serverFetch` URL construction
  - [x] 2.1 Write property test: `serverFetch` constructs URLs without transformation
    - Install or confirm `fast-check` is available as a dev dependency in `pwa/`
    - For any arbitrary non-empty endpoint string (including strings starting with `/backend`, `/api`, query strings, empty path segments), assert that the URL passed to `fetch` equals `API_INTERNAL_URL + endpoint` with no transformation
    - Use `fc.string()` or a constrained generator; run minimum 100 iterations
    - **Property 1: `serverFetch` constructs URLs without transformation**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - _Note: this test will fail until task 5 removes the `.replace()` call — write it now so the failure is visible_

- [x] 3. Write property test for `getImageUrl` identity on `/api/` paths
  - [x] 3.1 Write property test: `getImageUrl` returns `/api/` paths unchanged
    - For any string with an `/api/` prefix (varying path segments, UUIDs, indices), assert that `getImageUrl` returns the input unchanged
    - Use `fc.string()` mapped to `/api/` + arbitrary suffix; run minimum 100 iterations
    - **Property 2: `getImageUrl` returns `/api/` paths unchanged**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - _Note: this test will fail until task 6 simplifies `getImageUrl` — write it now so the failure is visible_

- [x] 4. Migrate browser-side source code away from `/backend`
  - [x] 4.1 Update `api-client.ts` — remove `isProd` branch
    - Remove the `isProd` constant and the conditional assignment
    - Replace with: `requestAdapter.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';`
    - Remove the comment block above the assignment that describes the prod/dev split
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 4.2 Update `config.ts` — change default fallback
    - Change `process.env.NEXT_PUBLIC_API_BASE_URL ?? '/backend'` to `process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api'`
    - _Requirements: 3.1, 3.2_
  - [x] 4.3 Update `recipes.ts` — change `createRecipe` fallback
    - Change `process.env.NEXT_PUBLIC_API_BASE_URL || '/backend'` to `process.env.NEXT_PUBLIC_API_BASE_URL || '/api'` in the `createRecipe` function
    - _Requirements: 1.4_
  - [x] 4.4 Update `schedule.ts` — change `updateGroceryState` fallback
    - Change `process.env.NEXT_PUBLIC_API_BASE_URL || '/backend'` to `process.env.NEXT_PUBLIC_API_BASE_URL || '/api'` in the `updateGroceryState` function
    - _Requirements: 1.5_

- [x] 5. Update `server-client.ts` — remove `.replace()` strip
  - Change `endpoint.replace(/^\/backend/, '')` to just `endpoint` in the URL construction line
  - Result: `const url = \`${API_INTERNAL_URL}${endpoint}\`;`
  - Property test from task 2.1 should now pass
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Simplify `getImageUrl` in `imageUtils.ts`
  - Replace `return path.startsWith('/api/') ? \`/backend${path}\` : path;` with `return path;`
  - The falsy-input guard (`if (!path) return '';`) is retained unchanged
  - Property test from task 3.1 should now pass
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Update environment and configuration files
  - [x] 7.1 Update `pwa/.env.local`
    - Change `NEXT_PUBLIC_API_BASE_URL=/backend` to `NEXT_PUBLIC_API_BASE_URL=/api`
    - _Requirements: 6.1, 6.4_
  - [x] 7.2 Update `pwa/.env.test`
    - Change `NEXT_PUBLIC_API_BASE_URL=/backend` to `NEXT_PUBLIC_API_BASE_URL=/api`
    - _Requirements: 6.2, 6.5_
  - [x] 7.3 Update `pwa/playwright.config.ts` webServer env block
    - Change `NEXT_PUBLIC_API_BASE_URL: '/backend'` to `NEXT_PUBLIC_API_BASE_URL: '/api'` in the `webServer.env` object
    - _Requirements: 6.3_

- [x] 8. Update Docker Compose files
  - [x] 8.1 Update `docker/compose/apps.yml` — PWA env default
    - Change `NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-/backend}` to `${NEXT_PUBLIC_API_BASE_URL:-/api}`
    - _Requirements: 7.1, 7.3_
  - [x] 8.2 Update `docker/compose/apps.yml` — Traefik label for `api` service
    - Change the `traefik.http.routers.api.rule` label from `` Host(`${API_HOST:-api.wfs.localhost}`) `` to `` Host(`${PWA_HOST:-pwa.wfs.localhost}`) && PathPrefix(`/api`) ``
    - _Requirements: 7.2, 7.3_
  - [x] 8.3 Update `docker/docker-compose.prod.yml` — PWA env
    - Change `NEXT_PUBLIC_API_BASE_URL: /backend` to `NEXT_PUBLIC_API_BASE_URL: /api`
    - _Requirements: 7.4, 7.5_

- [x] 9. Remove the `/backend` rewrite from `next.config.js`
  - Remove the entire `rewrites()` async method and its preceding comment block from `nextConfig`
  - All other properties in `nextConfig` are left unchanged
  - This is safe only after tasks 4–8 have migrated all callers away from `/backend`
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 10. Checkpoint — run typecheck and lint
  - Run `task review` and confirm zero TypeScript errors and zero lint errors
  - Fix any issues before proceeding
  - _Requirements: 11.2_

- [x] 11. Update JSDoc comments and inline comments
  - [x] 11.1 Update `pwa/src/lib/api/types.ts` — 3 JSDoc lines
    - Replace each occurrence of `"Relative path proxied through /backend"` with `"Relative path served directly from /api"`
    - No TypeScript interface definitions are changed
    - _Requirements: 9.1_
  - [x] 11.2 Update `pwa/src/lib/api/generated/models/index.ts` — 3 JSDoc lines
    - Apply the same substitution as 11.1: `proxied through /backend` → `served directly from /api`
    - Only JSDoc comment text changes; no generated logic is modified
    - _Requirements: 9.2_
  - [x] 11.3 Update `pwa/src/lib/identity/cookie.ts` — 1 inline comment
    - Change `// Set cookie with Path=/ so it's sent to all routes including /backend` to `// Set cookie with Path=/ so it's sent to all routes`
    - _Requirements: 9.3_

- [x] 12. Write ADR 036
  - Create `specs/decisions/036-direct-api-calls.md`
  - Document: context (why the proxy existed), decision (remove it, update Traefik label), consequences (all environments now use the same routing model; `NEXT_PUBLIC_API_BASE_URL` defaults to `/api`; `api.wfs.localhost` no longer needed; `http://127.0.0.1:3000` added to CORS)
  - Reference ADR 033 (`033-nextjs-16-proxy-pattern.md`) as prior context for the proxy pattern history
  - Reference ADR 034 (`034-two-stage-member-context-gate.md`) as confirmation that `/api/*` was already excluded from the proxy gate
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 13. Final validation — run full E2E test suite
  - Run `task test:pwa` and confirm all 65 Playwright tests pass with zero failures
  - Run `task review` and confirm zero TypeScript errors and zero lint errors
  - Ensure no file under `pwa/src/` contains the string `/backend` (excluding test fixtures)
  - _Requirements: 11.1, 11.2, 11.3_

## Notes

- The proxy rewrite in `next.config.js` (task 9) must not be removed before tasks 4–8 are complete — it is the safety net that keeps the app functional during migration
- Property tests (tasks 2.1 and 3.1) are written before the implementation tasks that change those functions; they will fail until tasks 5 and 6 respectively are applied
- `task review` is the canonical validation command per the repo's execution harness (`task` over raw shell)
- The CI environment (`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001`) and root `.env.test` are not changed — they already use a direct URL
