# ADR 030: Remove Prism from E2E Layer — Playwright Intercepts Only

## Status
Accepted

## Context
The E2E test suite historically used Prism (OpenAPI mock server on port 5001) as a shared backend for all Playwright tests. Prism held state across test runs and could not be reset between specs, causing flaky failures when one test's side effects polluted the next. The planner suite (planner.spec.ts, planner-full-cycle.spec.ts, planner-social.spec.ts) was migrated to `page.route()` intercepts and passed cleanly in isolation, proving the pattern was viable for all suites.

## Decision
Prism is removed from the E2E layer entirely. All API calls in Playwright tests are intercepted using `page.route()` with regex matchers, returning deterministic fixture data inline. The contract integrity gate (CI job `contract-integrity-gate`) continues to validate OpenAPI spec ↔ API parity independently.

### Specific changes
- `@stoplight/prism-cli` removed from `pwa/package.json` dependencies.
- `mock-api` npm script removed.
- Prism `webServer` entry removed from `playwright.config.ts`; local mode now starts only the Next.js dev server.
- "Start Prism Mock API" and "Wait for Mock API" steps removed from `.github/workflows/ci.yml`.
- `MOCK_API_PORT` env var removed from CI job env block.
- `integration.spec.ts` deleted — it was entirely built around Prism's `/health` endpoint and direct HTTP data-setup calls with no intercept equivalent.
- `capture-flow.spec.ts`, `discovery.spec.ts`, `onboarding.spec.ts`, `recipes.spec.ts` rewritten with full `page.route()` coverage.
- `home-recovery.spec.ts` patched to add missing `/api/schedule/move` intercept (tests were using `waitForResponse` against an unhandled route).
- `goto('/')` in `beforeEach` blocks replaced with `page.addInitScript()` for localStorage injection, eliminating SSR crashes when no backend is running.
- Four new `test:e2e:*` npm scripts and corresponding CI steps added for the ported suites.

## Consequences
- **Pros**: Zero shared state between tests; specs are fully self-contained; no external process to start or health-check; CI is simpler and faster (removes a 30-second Prism startup wait).
- **Cons**: Fixture data in test files must be manually kept in sync with the OpenAPI spec examples. The `contract-integrity-gate` CI job remains the authoritative check for that parity.
- **Out of scope**: `integration.spec.ts` covered a full user journey including real backend writes; this scenario is not re-implemented as an E2E test. System-level smoke tests against a live staging environment are the correct venue for that coverage.
