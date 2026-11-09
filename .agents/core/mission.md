# Mission

## 1. Purpose
Deliver the "What's For Supper" (WFS) project.

## 2. Product Intent
Build a premium, high-performance Meal Planning Progressive Web App (PWA) using a contract-first, test-driven approach.

## 3. Engineering posture
Build reliable, maintainable capabilities. Avoid zombie code and speculative
abstractions. Shared correctness policy lives in [contract/testing](contract-testing.md),
and change boundaries live in [context loading](context-loading.md).

For meaningful design choices, name the observable outcome, binding constraints
and key trade-off. Compare the smallest in-place change with an alternative derived
from those constraints and an option that removes needless state or steps without
adding a mechanism. Keep alternatives within authorized scope; trivial edits need
no alternatives exercise. Prefer subtraction over extra coordination when it meets the outcome.

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

Express real domain concepts and invariants with meaningful types where they prevent
invalid states or clarify behavior; avoid ceremonial wrappers. Distinguish domain
values, generated DTOs and storage entities, with explicit mappings at boundaries.
When domain terms are ambiguous, clarify them in a small glossary with their existing
specification/contract owner; reuse definitions rather than creating a separate artifact.

For state-changing or retriable operations, make operation identity, idempotency,
commit boundary and unknown outcomes explicit. Reconcile uncertain results before
replaying effects. Define transitions by preserved user outcomes and meaningful
acceptance, with a safe reversible step or an explicitly acknowledged irreversible
boundary. Preserve required behavior and safeguards without treating the old
implementation as an invariant.

## 4. Core Design & UX Patterns
- **Trust First**: Prioritize understandable tasks, honest outcomes and accessibility.
  Support them with warm, premium Solar Earth design and established tokens; use the
  [North Star](../../docs/creative-direction-north-star.md) for emotional direction.
- **Background work**: Keep the primary experience responsive and preserve navigation
  while asynchronous work proceeds. Persisted workflow lifecycle and status behavior
  are defined in the [background-processing capability](../../openspec/specs/background-processing/spec.md).
