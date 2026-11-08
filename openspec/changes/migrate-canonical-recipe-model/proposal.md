# Migrate and recover canonical recipe content

## Why

The complete model must survive upgrade and recovery without losing household links or human edits. The earlier draft promised permanent legacy backup decoding despite the user choosing current-format-only recovery.

## Outcome and Scope

In-place-first conversion, conditional recipe-only disk fallback, current-format-only recovery, staged client fencing and fresh-list upgrade without historical deletion. No default reseed, production operation, old backup compatibility, automatic extraction or silent disk-over-live precedence. Conditional fallback compares stable IDs and stops/reports unexpected mismatches.

## What Changes

- **BREAKING:** adopt the applicable shared [contract](../canonical-ingredient-correction/contracts.md) with explicit compatibility/failure behavior.
- Preserve user decisions and existing safety boundaries in the shared [review](../canonical-ingredient-correction/review.md).
- Add adversarial acceptance from the shared [corpus](../canonical-ingredient-correction/acceptance-corpus.md); no product implementation in this session.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-backup-and-recovery`: forward migration and complete current-format recovery.
- `grocery-shopping`: apply this change’s bounded grocery requirements.

## Impact

Depends on the canonical foundation and companion ownership map as specified in design.md. Future apply must synchronize OpenAPI, generated clients, consumers and stateful mocks where affected, and qualify actual persistence/workflow seams. Planning existence does not establish implementation readiness.
