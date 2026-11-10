# Migrate and recover canonical recipe content

## Why

The complete model must survive upgrade and recovery without losing household links or human edits. Dreaming and management already share disk backup, seed and sync owners; those owners must retain canonical facts rather than exporting and restoring legacy-only fields.

## Outcome and Scope

In-place-first conversion, conditional recipe-only disk fallback, current-format-only recovery, staged client fencing and fresh-list upgrade without historical deletion. No default reseed, production operation, old backup compatibility, automatic extraction or silent disk-over-live precedence. Conditional fallback compares stable IDs and stops/reports unexpected mismatches.

## What Changes

- **BREAKING:** adopt the applicable shared [contract](../canonical-ingredient-correction/contracts.md) with explicit compatibility/failure behavior.
- Preserve user decisions and existing safety boundaries in the shared [review](../canonical-ingredient-correction/review.md).
- Evolve Dreaming → db-backup → BackupDatabase → `ManagementService.BackupAsync` (also management backup POST), management seed → `RestoreAsync`, and guarded recipe sync/publication. Reuse the current recipe codec; do not add a parallel recovery API or user-facing package workflow.
- Keep recipe-only forward reprocessing separate from household seed. Whole-installation database-and-asset backup remains separate disk-loss and rollback protection.
- Qualify edit → existing backup → seed into an independent disposable destination → compare → repeat, including exact canonical facts, retained media and protected household/history/extras.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-backup-and-recovery`: forward migration and complete current-format recovery.
- `grocery-shopping`: apply this change’s bounded grocery requirements.

## Impact

Depends on the canonical foundation and companion ownership map as specified in design.md. Any public contract change must synchronize OpenAPI, generated clients, consumers and stateful mocks; this bounded existing-operation slice changes no public operation or DTO. Qualify actual persistence/workflow seams. Planning existence does not establish implementation readiness.
