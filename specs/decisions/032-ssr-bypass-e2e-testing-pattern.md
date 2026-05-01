# ADR 032 — SSR Bypass: E2E Testing Pattern for Server-Component Home Page

**Date**: 2026-04-30  
**Status**: Accepted  
**Deciders**: Alex (product), Kiro (implementation)

---

## Context

The `/home` page is a Next.js **Server Component** (`app/(app)/home/page.tsx`). It calls `serverFetch()` which hits the backend directly via `API_INTERNAL_URL` — a Node.js server-side fetch that bypasses the browser entirely.

`HomeCommandCenter` receives `todaysRecipe` as a prop from SSR. When it is non-null, the component's `useEffect` skips the client-side `getSchedule()` call (`!todaysRecipe` guard). This means:

1. `page.route()` cannot intercept the SSR fetch — it only intercepts browser-originated requests.
2. Even if the client-side schedule mock is registered, it never fires when SSR returns a recipe.
3. In the Playwright test environment, `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001` makes the Kiota client call the backend directly (not through the `/backend` Next.js proxy), but this is still a browser request and IS interceptable.

This pattern will recur for any page that uses `serverFetch()` to pre-populate client component props.

---

## Decision

**Do not attempt to mock the "no recipe tonight" state by mocking the schedule endpoint.** The SSR will always return real backend data regardless of Playwright mocks.

Instead, **reach the desired UI state through UI actions** — the same state transitions the real user would perform.

### Proven patterns

| Desired state | How to reach it |
|---|---|
| `TonightPivotCard` visible | Skip tonight's recipe: `tonight-menu-card` click → `skip-tonight-btn` → `recovery-action-order-in` → `recovery-action-tomorrow` |
| `CookedSuccessCard` visible | Click `cooked-btn`, wait for validate response |
| `TonightMenuCard` visible | Default — SSR returns a recipe from the real backend |

### Settings endpoint

`loadSetting('family_goto')` is called client-side in `HomeCommandCenter`'s `useEffect`. This IS interceptable. Always mock it in `beforeEach` for home page tests:

```ts
await page.route(/\/(?:backend\/)?api\/settings\/(.+)/, async (route) => {
  await route.fulfill({ status: 404, contentType: 'application/json',
    body: JSON.stringify({ error: 'Not found' }) });
});
```

`setupCommonRoutes()` in `pwa/e2e/mock-api.ts` already includes this. Tests that set up routes inline must add it manually.

### Route pattern prefix

All `page.route` patterns must use `\/(?:backend\/)?api\/` to match both:
- `/backend/api/...` — browser requests through the Next.js proxy (local dev)
- `http://127.0.0.1:5001/api/...` — direct Kiota calls in test mode (`NEXT_PUBLIC_API_BASE_URL`)

---

## Consequences

- E2E tests for home page state transitions are more realistic — they exercise actual UI flows rather than mocked initial states.
- Tests are slightly longer (require a skip flow to reach pivot card) but more robust.
- Any future page that uses `serverFetch()` for SSR pre-population has the same constraint. Document it in the test file's `beforeEach` comment.
- The `!todaysRecipe` guard in `HomeCommandCenter.useEffect` is intentional and should not be removed to "fix" E2E tests — it is a performance optimization for the production path.

---

## References

- `pwa/src/lib/api/server-client.ts` — `serverFetch` implementation
- `pwa/src/app/(app)/home/page.tsx` — SSR pre-population
- `pwa/src/components/home/HomeCommandCenter.tsx` — `!todaysRecipe` guard
- `pwa/playwright.config.ts` — `NEXT_PUBLIC_API_BASE_URL` test env var
- `pwa/e2e/home-recovery.spec.ts` — reference implementation of the skip-to-pivot pattern
- `.kiro/steering.md` §6 — standing instructions for all future agents
