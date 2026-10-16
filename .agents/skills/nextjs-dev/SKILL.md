---
name: nextjs-dev
description: Implement WFS Next.js features, components and frontend behavior within an approved scope. Use nextjs-qa for existing test failures, hydration bugs or E2E flakiness.
---

# WFS frontend development

Follow [contract/testing](../../core/contract-testing.md) for test-first vertical
slices and affected-seam acceptance, and the
[execution harness](../../core/execution-harness.md) for final verification.
Start with the affected component, store, API wrapper and existing tests.

## Select the affected seam

For API-connected behavior, inspect the approved operation in `specs/openapi.yaml`
and its wrapper under `pwa/src/lib/api/`. The generated SDK lives under
`pwa/src/lib/api/generated/`. Load the [OpenAPI procedure](../openapi-expert/SKILL.md)
when changing the contract, client or mocks. UI-only work needs no invented API work.

Use Vitest for isolated logic and component behavior; retain Playwright coverage for
navigation, browser/network integration and user-visible flows. Select the smallest
meaningful failing test for the slice rather than requiring both suites for every
edit. Focused commands are `task test:unit -- <test-file>` and
`task test:e2e -- <spec-file>`; paths are relative to `pwa/`.
Use test IDs for interactions and semantic assertions for accessibility.

## Component and state decisions

Follow the existing App Router organization under `pwa/src/app/`. Keep client
boundaries narrow, using client components where state, effects, context or browser
APIs require them. Derive computable values during rendering and perform event-owned
updates in their event handlers; use effects for external synchronization.

For SSE or asynchronous state, load the
[SSE and async state reference](../nextjs-qa/sse-and-async-state.md). Cover relevant
arrival orders, readiness and stale-response behavior. Use real stores when testing
subscription/state-transition integration.

For visual or interaction changes, load the [designer](../designer/SKILL.md) guidance
and its relevant references. Include affected loading, empty, error, recovery and
success states as part of the slice.

## Asynchronous component tests

Await observable completion with `findBy` for an appearing element or `waitFor` for
an eventual assertion. Keep actions outside retrying assertion callbacks. React
Testing Library helpers already wrap operations in `act`; use explicit awaited
`act` when driving updates outside those helpers, such as controlled promises or
timers, as the test requires. Diagnose unfinished updates instead of adding blanket
wrappers to every render and interaction.

References for async-test changes: [React act](https://react.dev/reference/react/act)
and [Testing Library async methods](https://testing-library.com/docs/dom-testing-library/api-async/).
