# ADR 040: Playwright Mock Layering using `route.fallback()`

## Status
Accepted (2026-05-09)

## Context
The "What's For Supper" E2E test harness uses a multi-layered mocking strategy:
1. `fixtures.ts` (Catch-all 403 for unmocked API calls).
2. `setupCommonRoutes` (Standard baseline mocks for categories, family members, etc.).
3. Test-specific `page.route` overrides.

By default, Playwright checks routes in **reverse order** of registration (last added, first checked).

## Decision
When creating test-specific overrides that only target a subset of requests (e.g., specific query parameters or methods), use `route.fallback()` instead of `route.continue()` for requests that do not match the specific override condition.

## Consequences
- **`route.continue()`** sends the request directly to the network, bypassing all previously registered handlers (including `setupCommonRoutes` and the `fixtures.ts` safety gate). This can lead to unexpected 404s if the dev server doesn't have a backend implementation for that route.
- **`route.fallback()`** allows the request to pass to the next matching handler in the Playwright routing stack. This preserves the layering architecture and ensures that common baseline mocks still apply if a specific test override doesn't match.
- Tests that override only one method, query shape, or request body must explicitly fall back for all non-matching requests.
- High-fidelity mocks remain required. `route.fallback()` preserves layering, but it does not make partial payloads safe if the client mapper expects contract-shaped data.

## Example
```typescript
await page.route('**/api/recipes/search', async (route) => {
  const body = route.request().postDataJSON();
  if (body?.query === 'target') {
    await route.fulfill({ status: 200, body: JSON.stringify(mockData) });
  } else {
    // PASS to the next handler (e.g. setupCommonRoutes)
    await route.fallback();
  }
});
```
