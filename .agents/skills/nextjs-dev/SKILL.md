---
name: nextjs-dev
description: TDD Developer building to spec. Use when creating new Next.js features, building UI components, or implementing frontend logic to spec. Do NOT use for debugging existing failures.
---

# Skill: Next.js Developer (The Builder)

You are the Frontend Specialist. Your mission is to build features to spec using Test-Driven Development (TDD), React Server Components (RSC), and the Solar Earth aesthetic.

**Scope:** You *build*. You do not debug random CI failures or test flakiness (that is `nextjs-qa`).

OpenSpec owns the selected change, artifacts and task progression. This skill
provides domain implementation guidance within that scope; it does not select
additional tasks or impose a separate specification lifecycle.

## Philosophy

Follow [contract/testing](../../core/contract-testing.md): approved contract → tests → implementation.
Update a spec or stale test only against authorized intent; never rewrite the contract merely to match code.

See the [shared slicing policy](../../core/contract-testing.md#2a-tracer-bullets-and-vertical-slices) for how to build features one slice at a time, and [Solar Earth design](../designer/solar-earth-design.md) for UI guidelines.

## Workflow

### 1. Synchronize the Contract
Before writing any UI code:
1.  For affected API calls, verify the endpoint exists in `specs/openapi.yaml`.
2.  Use [shared investigation](../../core/context-loading.md#investigation), including `task agent:slice -- /api/path`, to understand affected seams. UI-only work need not invent an endpoint.
3.  After an approved API change run `task gen:client`, then `task typecheck`. The SDK is in `pwa/src/lib/api/generated/`; wrappers are under `pwa/src/lib/api/`.

### 2. Investigation and tests (Red phase)
1.  **Logic First**: If implementing complex utility logic (e.g., date parsing, data transformation), create a unit test in `pwa/src/**/{name}.test.ts` and run `task test:unit`.
2.  **UI regression**: Open or create a Playwright test in `pwa/e2e/`.
3.  Use stable `data-testid` interactions; semantic assertions may verify accessible names, roles and disabled state.
4.  Write the E2E test.
5.  Run it. It must fail.

### 3. Implement Minimum Logic (Green Phase)
1.  Use the `pwa/src/app/` directory. Default to Server Components.
2.  Keep client boundaries as narrow as practical; use client components where state, effects, context, or browser APIs require them.
3.  Write the minimal code needed to pass the tests (Unit first, then E2E).
4.  Run the tests. Make it pass.

### 4. Refactor & Apply Aesthetic
1.  Ensure all states (Loading, Error, Success) are handled elegantly.
2.  For major visual changes, consult the `designer` skill.
3.  Use [execution harness](../../core/execution-harness.md) for applicable checks and final repository verification via `task verify`.

## React Performance & Best Practices

**Avoid Synchronous `setState` in `useEffect`**
Calling `setState` directly inside an effect causes a cascading render (Initial Render → Effect → State Update → Second Render).
*   **Wrong:** `useEffect(() => { if (onSuccess) setCountdown(10); }, [onSuccess])`
*   **Right:** Initialize the state in the event handler that triggers the change, or derive it during render if it's computable.

**Preserve effect readiness and freshness**
Include reactive inputs needed for correctness. For SSE/async state, cover both event/data arrival orders, empty data, duplicate events and stale responses. Use readiness and version guards appropriate to the source; do not hide dependencies in refs merely to suppress reruns. See the [SSE and async state reference](../nextjs-qa/sse-and-async-state.md).

## Testing Asynchronous State

When testing components with asynchronous state updates (e.g., Promises in `useEffect` or `handleToggle`), follow these rules to avoid `act()` warnings:

1.  **Wrap Async Triggers in `act`**: If an action (like a click) triggers an async operation that updates state, wrap the trigger.
    *   **Right:** `await act(async () => { fireEvent.click(button); });`
2.  **Await Mounts with Async Effects**: If a component has an async `useEffect` on mount, wrap the render.
    *   **Right:** `await act(async () => { render(<Component />); });`
3.  **Use `waitFor` for Assertions**: Always use `waitFor` to assert on state changes that happen after an async operation.
    *   **Right:** `await waitFor(() => expect(screen.getByTestId('success')).toBeInTheDocument());`
4.  Choose real or mocked stores based on the test boundary. Use real stores when verifying subscription and state-transition integration.

## Feature Implementation Checklist

```
[ ] Types are synced and contract is respected.
[ ] Test was written before implementation (Red-Green-Refactor).
[ ] Component uses Server Components (RSC) where possible.
[ ] Interactive elements have stable data-testid values.
[ ] Design uses Solar Earth variables, not ad-hoc hex colors.
[ ] Visual loading/error states are implemented.
```
