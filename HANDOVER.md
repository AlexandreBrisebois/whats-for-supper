# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **SSE Workflow — URL Capture & Social Coordination (Ready to Start)**
   - Three E2E tests are skipped with `// TODO: revisit when SSE ...` comments that mark the integration points:
     - `capture-flow.spec.ts` → "failed URL capture shows error message".
     - `home-goto.spec.ts` → "Page reload after Make This Tonight".
     - `planner-social.spec.ts` → "Verify Nudge Family button triggers Web Share".
   - ADR 035 defines the canonical E2E route-handler pattern to follow when writing SSE mock handlers.

2. **Phase 3: Member Gate & Onboarding (Complete - Pending Final E2E Check)**
   - The Two-Stage Gate is implemented in `pwa/src/proxy.ts`.
   - **Action Item**: Perform a final end-to-end manual check (Clear cookies -> Welcome -> Onboarding -> Home).

3. **Phase 4: Recipe Synthesis & Library Filtering (Ready to Start)**
   - Goal: Finalize "Fire-and-Forget" UX and hide incomplete recipes in `DiscoveryService.cs`.
   - Vertical slice: Ensure `MinimalCapture.tsx` redirects immediately.

## Recently Completed

- **RecipeStackCard Test Alignment (2026-05-09):** Synchronized unit test expectations with the icon-based swipe indicator implementation (removed legacy `→`/`←` text arrows). Verified that all 333 PWA unit tests pass.
- **Recipe Action Pivot (2026-05-09):** Implemented and stabilized. Planner-origin search now shows `Add it to {Day}` and assigns back to the selected planner slot; discovery-origin search shows `Cook this`, then pivots to `Cook it tonight` / `Plan for later`. `task gate` is green after hardening the E2E mocks and updating unit/E2E expectations.

## Standing Notes

- **Playwright Mock Layering (ADR 040).** Use `route.fallback()` instead of `route.continue()` for test-specific overrides.
- **E2E Route Handler Pattern (ADR 035).** Use `new URL(route.request().url())` inside handler bodies.
- **Kiota is the Source of Truth.** Use `task gen:client` after spec changes.
- **Zero Drift Doctrine.** `task gate` must pass before ending any session.
