# Frontend Mocking Strategy

The Playwright `mock-api` script is the definitive system boundary for frontend End-to-End tests.

## Mock at System Boundaries Only
When testing Next.js components and workflows:
- **DO MOCK:** The network boundary (API requests to the backend). This is achieved entirely by ensuring the Playwright `mock-api` serves data that strictly matches `specs/openapi.yaml`.
- **DO NOT MOCK:** Internal React components, custom hooks, or React Context providers. E2E tests should render the actual DOM tree as the user sees it.

## The SDK & Mock Alignment
Because the frontend uses Kiota-generated SDK clients, the mock data must be structurally perfect. If the mock data is slightly off from the OpenAPI spec, the generated SDK client will fail to parse it, causing a test failure.

When diagnosing "Element Not Found" or "Timeout" errors in E2E tests, always verify that the mocked API response isn't causing a silent parsing failure in the frontend data layer.
