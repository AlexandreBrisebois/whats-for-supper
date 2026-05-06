# Data Flow: todayStore Seeding — SSR + SSE Race

**Related docs:** [`week-lifecycle.md`](./week-lifecycle.md), [`../user-flows/cooks-mode-redesign.md`](../user-flows/cooks-mode-redesign.md), [`../../pwa/src/store/todayStore.ts`](../../pwa/src/store/todayStore.ts), [`../../pwa/src/hooks/useScheduleStream.ts`](../../pwa/src/hooks/useScheduleStream.ts)

---

## Problem

The home page (`/home`) is a **Next.js Server Component** that fetches the real backend server-side. That SSR fetch cannot be intercepted by Playwright's `page.route()` (which only intercepts browser-side requests). When the backend returns no recipe for today (or is unreachable), the SSR-provided `currentRecipe` is `null`.

`TodayStoreInitializer` is a client component that calls `useTodayStore.init(ssrRecipe, status)` in a `useEffect` on mount. If SSR returned null, it calls `init(null, 0)`.

The SSE hook (`useScheduleStream`) connects to `/api/stream` — which IS interceptable by `page.route()` — and receives a `connected` event containing the full week snapshot. This is where the real recipe data arrives in tests.

**The race:** `init(null)` and the SSE `connected` handler both run asynchronously after first render. Their order is non-deterministic. If `init(null)` runs after `applyServerUpdate(spaghetti)`, it overwrites the recipe with null and the home page shows no card.

---

## Solution (two-part, both required)

### 1. `connected` event seeds todayStore (`useScheduleStream.ts`)

The `connected` handler already calls `weekStore.applySnapshot(schedule)`. It now also extracts today's slot and calls `todayStore.applyServerUpdate({ recipe, status })`.

This means the SSE `connected` event — not a separate `slot_updated` event — is sufficient to seed `todayStore`. The `slot_updated` path still works as before for subsequent mutations.

```
SSE connected → weekStore.applySnapshot(schedule)
             → todayStore.applyServerUpdate(todaySlot)  ← added
```

### 2. `init(null)` preserves existing recipe (`todayStore.ts`)

`init` is the SSR initialiser. When SSR returns null, it means "unknown" — not "definitely no recipe". The guard:

```ts
} else if (recipe === null && existingRecipe !== null) {
  // SSR null must not overwrite a recipe already set by SSE.
  set({ status, optimisticWriteAt: null });
}
```

This makes `init(null)` a no-op for `currentRecipe` when the store already has data.

---

## Ordering matrix

| SSE fires first | init fires first | Result |
|---|---|---|
| `applyServerUpdate(recipe)` → `init(null)` | `init(null)` → `applyServerUpdate(recipe)` | Both correct after fix |
| Before fix: `init(null)` silently cleared recipe | Before fix: SSE won, card showed | Flaky |

---

## Clock pinning in E2E tests

Tests pin `page.clock.setFixedTime('2026-05-04T12:00:00Z')`. All date comparisons in the browser use `new Date()`, which respects the pinned clock. `getTodayString()` returns `'2026-05-04'` in both the SSE handler and the store — matching the date in the mock SSE payload.

**Never use `new Date()` in test files.** Use `currentMonday()` / `toDateStr()` from `mock-api.ts`, which derive from the pinned date.

---

## Why the SSR fetch cannot be intercepted

Next.js Server Components execute on the Node.js server process — not in the browser. Playwright's `page.route()` intercepts browser-level `fetch`/`XMLHttpRequest` calls only. The SSR fetch happens before the HTML is sent to the browser, so it is invisible to Playwright.

**Implication:** any data that home page SSR provides must be treated as potentially null in tests. Always register an SSE mock (`/api/stream`) that delivers the expected schedule in the `connected` event payload. Never rely on SSR to seed `todayStore` in E2E tests.

---

## Test pattern (cook-mode tests through /home)

```ts
// In beforeEach — registered AFTER setupCommonRoutes so LIFO gives priority
await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
  const connected = `event: connected\ndata: ${JSON.stringify({
    type: 'connected',
    schedule: buildSpaghettiSchedule().data,
  })}\n\n`;
  await route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: connected,  // connected event alone is sufficient — seeds both weekStore and todayStore
  });
});

// Then in the test:
await page.goto('/home');
await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });
```

The `slot_updated` event in the SSE body is now redundant (but harmless). The `connected` snapshot is sufficient.

---

## Stores involved

| Store | Seeded by | Source |
|---|---|---|
| `weekStore` | `applySnapshot(schedule)` | SSE `connected` event |
| `todayStore` | `applyServerUpdate(todaySlot)` | SSE `connected` event (via `useScheduleStream`) |
| `todayStore` | `init(ssrRecipe, status)` | `TodayStoreInitializer` (SSR props, may be null) |

`todayStore.init(null)` yields to `applyServerUpdate` — it will not overwrite a non-null recipe already in the store.
