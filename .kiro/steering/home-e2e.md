---
inclusion: manual
---

# Conditional home E2E reference

Load only for home-page SSR/Playwright work. The section below is preserved
verbatim from `.kiro/steering.md` at baseline
`13fcddedffa9c2a07b2498afb530e7906394b006`; this loading move does not requalify
its implementation claims. Check current source before relying on them.

## 6. E2E testing constraints — Next.js SSR + Playwright

### The SSR bypass problem

The home page (`/home`) is a **Next.js Server Component**. It calls `serverFetch()` which hits the backend directly via `API_INTERNAL_URL` (a Docker-internal or localhost URL). This fetch happens on the Node.js server process — **not in the browser** — so `page.route()` cannot intercept it.

Concretely:
- `serverFetch('/api/schedule?weekOffset=0')` → goes to `http://127.0.0.1:5001/api/schedule?weekOffset=0` from the server process.
- `page.route(/...schedule.../)` → only intercepts browser-originated requests.
- Result: SSR always returns real backend data regardless of Playwright mocks.

`HomeCommandCenter` receives `todaysRecipe` as a prop from SSR. The component **always** fires a client-side `getSchedule()` fetch on mount to reconcile stale SSR data (Phase 14 fix). When SSR returned a recipe, the fetch runs silently in the background — no spinner, no flash. When SSR returned nothing, the fetch shows a loader. This means:

- The schedule endpoint **is** interceptable by `page.route()` for the client-side reconciliation fetch.
- However, the **initial render** still uses the SSR prop — so if SSR returns a recipe, `TonightMenuCard` renders immediately before the client fetch completes.
- You still cannot mock the "no recipe tonight" initial state via `page.route()` alone — SSR will return whatever the real backend has.

### What this means for E2E tests

**You cannot mock the "no recipe tonight" state by mocking the schedule endpoint alone.** The SSR will return whatever the real backend has.

### The proven workaround

Reach the desired UI state **through the UI**, not by mocking SSR data:

- To show `TonightPivotCard`: start with a planned recipe (SSR returns one), then skip it via the recovery dialog (`skip-tonight-btn` → `recovery-action-order-in` → `recovery-action-tomorrow`). This transitions `HomeCommandCenter` to `isSkipped=true` client-side, which shows the pivot card.
- To show `CookedSuccessCard`: open Cook's Mode (`cook-mode-btn` on the card back face), step through all steps with `cooks-mode-step-next`, and click "Done" on the last step. This calls `onCooked` which fires `POST /api/schedule/day/{date}/validate` with `status: 2`. **Note: `cooked-btn` no longer exists — it was removed in Phase 14. The only path to marking a meal cooked is completing Cook's Mode.**

This approach is more robust anyway — it tests real state transitions rather than mocked initial states.

### Settings mock

The settings endpoint (`/api/settings/{key}`) is called client-side by `loadSetting()` in `HomeCommandCenter`'s `useEffect`. This **is** interceptable by `page.route()`. Always add it to `beforeEach` when testing home page behavior:

```ts
await page.route(/\/(?:backend\/)?api\/settings\/(.+)/, async (route) => {
  await route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not found' }),
  });
});
```

The `setupCommonRoutes()` helper in `pwa/e2e/mock-api.ts` already includes this. Tests that set up their own routes inline (without calling `setupCommonRoutes`) must add it manually.

### NEXT_PUBLIC_API_BASE_URL in test mode

In the Playwright test environment, `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001` (set in `playwright.config.ts`). This means the Kiota client calls the backend directly — not through the `/backend` Next.js proxy. The `page.route` patterns use `\/(?:backend\/)?api\/...` to match both the proxy path and the direct path.

### Checklist before writing new E2E tests for home

1. Does the test need a specific home state (no recipe, cooked, skipped)? → Reach it through UI actions, not schedule mocks.
2. Does the test need the settings endpoint? → Add the settings mock to `beforeEach` if not using `setupCommonRoutes`.
3. Does the test assert on `tonight-pivot-card`? → Get there via the skip flow, not by mocking an empty schedule.
4. Does the test need to mark a meal as cooked? → Go through Cook's Mode (`cook-mode-btn` → step through → "Done"). Do not look for `cooked-btn` — it does not exist.
5. Does the test assert on `confirm-goto-btn`? → The button is **always rendered**. Use `toBeDisabled()` when no ready GOTO exists, `toBeEnabled()` when one does. Do not assert on its absence.
