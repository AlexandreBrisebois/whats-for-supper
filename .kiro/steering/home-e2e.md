---
inclusion: manual
---

# Conditional home E2E reference

Load only for home-page SSR/Playwright work. This reference describes Home’s
subscriptions to `todayStore` and `gotoStore`; check current source before
relying on implementation details.

## 6. E2E testing constraints — Next.js SSR + Playwright

### The SSR bypass problem

The home page (`/home`) is a **Next.js Server Component**. It calls `serverFetch()` which hits the backend directly via `API_INTERNAL_URL` (a Docker-internal or localhost URL). This fetch happens on the Node.js server process — **not in the browser** — so `page.route()` cannot intercept it.

Concretely:
- `serverFetch('/api/schedule?weekOffset=0')` → goes to `http://127.0.0.1:5001/api/schedule?weekOffset=0` from the server process.
- `page.route(/...schedule.../)` → only intercepts browser-originated requests.
- Result: SSR always returns real backend data regardless of Playwright mocks.

`HomeCommandCenter` subscribes to `todayStore` through `useTodayStore()` for the current recipe, status, loading state, and meal actions. `TodayStoreInitializer` owns initialization from SSR data; Home calls the store’s `sync()` on mount to reconcile stale data. The component does not own a separate local today state or schedule polling loop.

- Browser requests made by store synchronization are interceptable by `page.route()`.
- The initial state is seeded from SSR, so a recipe can render before client synchronization completes.
- Mocking browser schedule requests alone cannot control the SSR-seeded initial state.

`HomeCommandCenter` also subscribes to `gotoStore` through `useGotoStore()`. The schedule stream records `recipe_ready` SSE events in that store. Home checks readiness for the pending active GOTO and reloads it through `familyStore.loadActiveGoTo()`; this transition uses store readiness instead of a component polling interval.

### What this means for E2E tests

**You cannot mock the "no recipe tonight" state by mocking the schedule endpoint alone.** The SSR will return whatever the real backend has.

### The proven workaround

Reach the desired UI state **through the UI**, not by mocking SSR data:

- To show `TonightPivotCard`: start with a planned recipe (SSR returns one), then skip it via the recovery dialog (`skip-tonight-btn` → `recovery-action-order-in` → `recovery-action-tomorrow`). This updates `todayStore` to skipped status (`3`), from which `HomeCommandCenter` derives `isSkipped=true`, which shows the pivot card.
- To show `CookedSuccessCard`: open Cook's Mode (`cook-mode-btn` on the card back face), step through all steps with `cooks-mode-step-next`, and click "Done" on the last step. This calls `onCooked` which fires `POST /api/schedule/day/{date}/validate` with `status: 2`. **Note: `cooked-btn` no longer exists — it was removed in Phase 14. The only path to marking a meal cooked is completing Cook's Mode.**

This approach is more robust anyway — it tests real state transitions rather than mocked initial states.

### Settings mock

The active GOTO is loaded client-side through `familyStore.loadActiveGoTo()`. Mock the settings endpoint (`/api/settings/{key}`) used by that store rather than relying on a component-local `loadSetting()` call. This **is** interceptable by `page.route()`. Always add it to `beforeEach` when testing home page behavior:

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
