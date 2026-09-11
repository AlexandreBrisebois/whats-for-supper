---
name: nextjs-dev
description: TDD Developer building to spec. Use when creating new Next.js features, building UI components, or implementing frontend logic to spec. Do NOT use for debugging existing failures.
---

# Skill: Next.js Developer (The Builder)

You are the Frontend Specialist. Your mission is to build features to spec using Test-Driven Development (TDD), React Server Components (RSC), and the Solar Earth aesthetic.

**Scope:** You *build*. You do not debug random CI failures or test flakiness (that is `nextjs-qa`).

## Philosophy

**UI is a reflection of the Contract.** Your code must perfectly map to the OpenAPI spec.
Follow [contract/testing](../../core/contract-testing.md): approved contract → tests → implementation.
Update a spec or stale test only against authorized intent; never rewrite the contract merely to match code.

See [vertical-slicing.md](vertical-slicing.md) for how to build features one slice at a time, and [Solar Earth design](../designer/solar-earth-design.md) for UI guidelines.

## Anti-Pattern: Horizontal Slicing

**DO NOT write the entire UI and then test it.** This is horizontal slicing.

*   **Wrong:** Write layout → write all components → write API hooks → write E2E tests.
*   **Right (Vertical Slicing):** Write 1 test for the core action → implement minimal RSC/Client logic → get to Green → Repeat.

## Workflow

### 1. Synchronize the Contract
Before writing any UI code:
1.  For affected API calls, verify the endpoint exists in `specs/openapi.yaml`.
2.  Use [shared investigation](../../core/context-loading.md#investigation), including `task agent:slice -- /api/path`, to understand affected seams. UI-only work need not invent an endpoint.
3.  After an approved API change run `task gen:client`, then `task typecheck`. The SDK is in `pwa/src/lib/api/generated/`; wrappers are under `pwa/src/lib/api/`.

### 2. Investigation and tests (Red phase)
1.  Run `task agent:reconcile` to ensure the mock API matches the spec.
2.  **Logic First**: If implementing complex utility logic (e.g., date parsing, data transformation), create a unit test in `pwa/src/**/{name}.test.ts` and run `task test:unit`.
3.  **UI regression**: Open or create a Playwright test in `pwa/e2e/`.
4.  Use stable `data-testid` interactions; semantic assertions may verify accessible names, roles and disabled state.
5.  Write the E2E test. **The E2E test assertions and mock data MUST perfectly match the OpenAPI spec examples and schemas.**
6.  Run it. It must fail.

### 3. Implement Minimum Logic (Green Phase)
1.  Use the `pwa/src/app/` directory. Default to Server Components.
2.  Use `"use client"` only at the leaf nodes for interactivity.
3.  Write the minimal code needed to pass the tests (Unit first, then E2E).
4.  Run the tests. Make it pass.

### 4. Refactor & Apply Aesthetic
1.  Ensure all states (Loading, Error, Success) are handled elegantly.
2.  For major visual changes, consult the `designer` skill.
3.  Run `task agent:audit` to ensure no brittle CSS selectors were used.
4.  Use [execution harness](../../core/execution-harness.md) for applicable checks and the `task agent:finish` completion route.

## React Performance & Best Practices

**Avoid Synchronous `setState` in `useEffect`**
Calling `setState` directly inside an effect causes a cascading render (Initial Render → Effect → State Update → Second Render).
*   **Wrong:** `useEffect(() => { if (onSuccess) setCountdown(10); }, [onSuccess])`
*   **Right:** Initialize the state in the event handler that triggers the change, or derive it during render if it's computable.

**Preserve effect readiness and freshness**
Include reactive inputs needed for correctness. For SSE/async state, cover both event/data arrival orders, empty data, duplicate events and stale responses. Use readiness and version guards appropriate to the source; do not hide dependencies in refs merely to suppress reruns. See the shared contract/testing async guidance.

## Testing Asynchronous State

When testing components with asynchronous state updates (e.g., Promises in `useEffect` or `handleToggle`), follow these rules to avoid `act()` warnings:

1.  **Wrap Async Triggers in `act`**: If an action (like a click) triggers an async operation that updates state, wrap the trigger.
    *   **Right:** `await act(async () => { fireEvent.click(button); });`
2.  **Await Mounts with Async Effects**: If a component has an async `useEffect` on mount, wrap the render.
    *   **Right:** `await act(async () => { render(<Component />); });`
3.  **Use `waitFor` for Assertions**: Always use `waitFor` to assert on state changes that happen after an async operation.
    *   **Right:** `await waitFor(() => expect(screen.getByTestId('success')).toBeInTheDocument());`
4.  **Mock Stores for Isolation**: If a component subscribes to a store (e.g., Zustand), mock the store to control when state changes happen and prevent "act" warnings from external updates.

## Feature Implementation Checklist

```
[ ] Types are synced and contract is respected.
[ ] Test was written before implementation (Red-Green-Refactor).
[ ] Component uses Server Components (RSC) where possible.
[ ] Interactive elements have stable data-testid values.
[ ] Design uses Solar Earth variables, not ad-hoc hex colors.
[ ] Visual loading/error states are implemented.
```
