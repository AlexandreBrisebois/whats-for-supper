# ADR 034: Regression Guard - Enforcing Contract and Time Integrity

## Status
Proposed (Accepted)

## Context
During the stabilization of the Planner E2E suite, several critical regressions were identified that caused high-entropy failures and flakiness:
1.  **Nested Envelope Drift**: Unlike top-level responses, nested domain entities (e.g., `day.recipe`) were being returned as raw objects. This caused the Kiota TypeScript generator to fail union matching, dumping all data into `additionalData` and breaking UI visibility.
2.  **Timezone Rollback**: Use of local date methods (`getDate()`) on UTC-midnight ISO strings caused dates to "roll back" by one day in negative timezones, breaking test locators.
3.  **Clock/Mock Split**: Tests using dynamic date helpers (like `currentMonday()`) in the Node process while the browser used a different system time caused a "Mock Reality Split" that broke data alignment.

## Decision
We will enforce the following "Regression Guards" across the repository:

### 1. Strict Nested Enveloping
- **Policy**: All domain entities nested within other DTOs MUST be wrapped in a `data` envelope (e.g., `recipe: { data: { ... } }`).
- **Rationale**: Ensures deterministic deserialization for Kiota union types and maintains consistency with the top-level API identity (ADR 008/022).

### 2. UTC-Only UI Discipline
- **Policy**: The use of `new Date().getDate()`, `getMonth()`, or `getFullYear()` is **forbidden** on ISO date strings.
- **Requirement**: Use `getUTCDate()`, `getUTCMonth()`, or `Intl.DateTimeFormat` with a fixed timezone.
- **Rationale**: Prevents day-shifting bugs in local development environments across different timezones.

### 3. Mandatory Clock Pinning
- **Policy**: Every Playwright test suite interacting with date-bound data (Planner, Home, Capture) MUST use `page.clock.setFixedTime()` in `beforeEach`.
- **Reference Date**: The canonical test date is **Monday, May 4th, 2026** (or **April 27th, 2026** to match ADR 029).
- **Rationale**: Eliminates drift between the test runner's Node process and the browser's execution context.

## Consequences
- **Pros**: Zero-flakiness date rendering; guaranteed data visibility through Kiota; future-proofed tests.
- **Cons**: Requires explicit `data` wrappers in C# DTOs and OpenAPI specs, increasing verbosity.
- **Enforcement**: Automated via `task agent:drift:mocks` and manual review of new tests.
