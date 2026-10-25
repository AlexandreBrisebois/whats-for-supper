# Mission

## 1. Purpose
Deliver the "What's For Supper" (WFS) project.

## 2. Product Intent
Build a premium, high-performance Meal Planning Progressive Web App (PWA) using a contract-first, test-driven approach.

## 3. Engineering posture
Build reliable, maintainable capabilities. Avoid zombie code and speculative
abstractions. Shared correctness policy lives in [contract/testing](contract-testing.md),
and change boundaries live in [context loading](context-loading.md).

Before adding behavior, inspect the affected code for an existing owner and reusable
implementation. Keep each business rule in one authoritative place; consumers
should call it rather than recreate it. Extract a cohesive module when callers
share the same responsibility and reason to change. Similar syntax alone does not
justify abstraction. Prefer explicit dependencies and behavior-focused interfaces;
avoid speculative frameworks and generic utility collections. Keep refactoring
within the selected scope and preserve regression coverage.

Make inputs, dependencies and side effects explicit. Use names and interfaces that
reveal the affected behavior and state changes. Keep calculations separate from
I/O and mutation where useful; expose dependencies such as time, external providers,
persistence and event publication through parameters or established dependency
injection. Keep ordering, transaction and failure behavior clear at the operation
that coordinates those effects. Add abstractions only when they clarify a real
boundary or make the selected behavior testable.

## 4. Core Design & UX Patterns
- **Trust First**: Prioritize understandable tasks, honest outcomes and accessibility.
  Support them with warm, premium Solar Earth design and established tokens; use the
  [North Star](../../docs/creative-direction-north-star.md) for emotional direction.
- **Background work**: Keep the primary experience responsive and preserve navigation
  while asynchronous work proceeds. Persisted workflow lifecycle and status behavior
  are defined in the [background-processing capability](../../openspec/specs/background-processing/spec.md).
