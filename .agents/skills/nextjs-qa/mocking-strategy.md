# Frontend Mocking Strategy

Playwright route handlers in `pwa/e2e/mock-api.ts` and the global interceptor in `fixtures.ts` define the frontend E2E network boundary. They are not a standalone mock server.

## Mock at System Boundaries Only
When testing Next.js components and workflows:
- **DO MOCK:** Browser-originated API requests at the network boundary, using Playwright `mock-api` responses matching `specs/openapi.yaml`.
- **DO NOT MOCK:** Internal React components, custom hooks, or React Context providers. E2E tests should render the actual DOM tree as the user sees it.

## The SDK & Mock Alignment
Because the frontend uses Kiota-generated SDK clients, the mock data must be structurally perfect. If the mock data is slightly off from the OpenAPI spec, the generated SDK client will fail to parse it, causing a test failure.

When diagnosing "Element Not Found" or "Timeout" errors in E2E tests, always verify that the mocked API response isn't causing a silent parsing failure in the frontend data layer.

Use `MOCK_IDS` and schema-compliant builders. Preserve method-sensitive route dispatch, stateful writes and route precedence; never allow unhandled API calls through `route.continue()`. Mocked E2E success is not live API/database evidence.

## Server fetches are a separate boundary

`page.route()` intercepts browser requests, not Next.js server-side `fetch` calls.
Trace Server Component reads through `pwa/src/lib/api/server-client.ts`, current
`pwa/playwright.config.ts` and environment configuration before designing a fixture.
SSR-seeded state can appear before client synchronization; browser mocks alone do
not establish the initial server data. Use the suite's isolated server fixture or
an observed UI transition as appropriate; never require a production backend.

For Home SSR/Playwright work only, load the [Home E2E reference](../../../.kiro/steering/home-e2e.md).
Verify its historical backend/URL assumptions against current config: managed-server
settings differ for CI, local and external `BASE_URL` runs. Reusing a server does
not apply a newly declared environment to it; public variables may be build-time
values. Treat mocked browser success and isolated server integration as separate evidence.
