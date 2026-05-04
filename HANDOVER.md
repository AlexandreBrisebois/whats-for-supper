# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **SSE Workflow — URL Capture & Social Coordination (Ready to Start)**
   - Three E2E tests are skipped with `// TODO: revisit when SSE ...` comments that mark the integration points:
     - `capture-flow.spec.ts` → "failed URL capture shows error message" — needs the SSE error path wired in `useCapture.ts` + `MinimalCapture.tsx`.
     - `home-goto.spec.ts` → "Page reload after Make This Tonight" — depends on push-model replacing the polling `sync()` call.
     - `planner-social.spec.ts` → "Verify Nudge Family button triggers Web Share" — Web Share mock not captured; needs SSE social coordination flow.
   - ADR 035 defines the canonical E2E route-handler pattern to follow when writing SSE mock handlers (`page.route` with `new URL(route.request().url())` inside the handler).

2. **Phase 3: Member Gate & Onboarding (Complete - Pending Final E2E Check)**
   - The Two-Stage Gate is implemented in `pwa/src/proxy.ts` (Next.js 16 pattern).
   - **Stage 1 (Access)**: Validates `h_access` cookie. Skips for `/welcome`, `/invite`, `/join`.
   - **Stage 2 (Context)**: Validates `family_member_id` cookie. Skips for `/onboarding` and Stage 1 paths.
   - Profile selection in `OnboardingPage` now correctly sets the `family_member_id` cookie via the `setFamilyMemberCookie` Server Action.
   - **Action Item**: Perform a final end-to-end manual check:
     - Clear cookies.
     - Go to `/home` -> Expect `/welcome`.
     - Enter passphrase -> Expect `/onboarding`.
     - Select profile -> Expect `/home`.
     - Go to `/onboarding` manually -> Expect it to stay on `/onboarding` (if h_access is present).

3. **Phase 4: Recipe Synthesis & Library Filtering (Ready to Start)**
   - Goal: Finalize "Fire-and-Forget" UX and hide incomplete recipes in `DiscoveryService.cs`.
   - Vertical slice: Ensure `MinimalCapture.tsx` redirects immediately and backend returns 401/403 if `X-Family-Member-Id` is missing for writes.

4. **Phase 5: Production Polish (Upcoming)**
   - Finalize environment variables and Traefik TLS settings for the unified domain.

## Standing Notes

- **E2E Route Handler Pattern (ADR 035).** All `page.route()` handlers must use `new URL(route.request().url())` inside the handler body for query string inspection. The predicate `(url) => ...` is for pathname/host matching only. Use `.includes('/api/path')` not `.endsWith(...)`. Never close over the predicate's `url` param inside the handler.

- **Next.js 16 "Proxy" Pattern (ADR 033).** Note that `pwa/src/proxy.ts` is the new middleware convention in this repo. It MUST export a function named `proxy`.
- **Two-Stage Gate (ADR 034).** Stage 1 (Access) -> Stage 2 (Context).
- **Cookie Name.** The family member cookie is `x-family-member-id` across all layers (proxy, server action, client utility, server-client).
- **Cookie Security.** `family_member_id` is NOT httpOnly because it's used for client-side header injection in `api-client.ts`.

- **Dev Loop Architecture (no ADR — tooling only).** `task gate` is the fast inner loop (contracts first, then parallel lint/typecheck/unit/impact-E2E). `task review` is the full pre-commit gate (contracts + format + parallel lint/typecheck/unit/API tests). E2E never runs in either loop — CI and `task test:smoke` only. See `LOCAL_DEV_LOOP.md` for the comparison table.

- **Kiota is the source of truth for TypeScript types.** `pwa/src/lib/api/types.ts` (openapi-typescript) is not imported by the app or E2E tests. `task types:sync` is deprecated. Use `task gen:client` to regenerate the Kiota client after spec changes.
