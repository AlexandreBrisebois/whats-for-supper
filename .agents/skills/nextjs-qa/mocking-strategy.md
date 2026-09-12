# Frontend Mocking Strategy

Playwright route handlers in `pwa/e2e/mock-api.ts` and the global interceptor in `fixtures.ts` define the frontend E2E network boundary. They are not a standalone mock server.

## Mock at System Boundaries Only
When testing Next.js components and workflows:
- **DO MOCK:** The network boundary (API requests to the backend). This is achieved entirely by ensuring the Playwright `mock-api` serves data that strictly matches `specs/openapi.yaml`.
- **DO NOT MOCK:** Internal React components, custom hooks, or React Context providers. E2E tests should render the actual DOM tree as the user sees it.

## The SDK & Mock Alignment
Because the frontend uses Kiota-generated SDK clients, the mock data must be structurally perfect. If the mock data is slightly off from the OpenAPI spec, the generated SDK client will fail to parse it, causing a test failure.

When diagnosing "Element Not Found" or "Timeout" errors in E2E tests, always verify that the mocked API response isn't causing a silent parsing failure in the frontend data layer.

Use `MOCK_IDS` and schema-compliant builders. Preserve method-sensitive route dispatch, stateful writes and route precedence; never allow unhandled API calls through `route.continue()`. Mocked E2E success is not live API/database evidence.
