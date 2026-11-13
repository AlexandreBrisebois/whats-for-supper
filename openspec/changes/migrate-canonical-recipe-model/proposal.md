# Migrate and recover canonical recipe content

> **Updated delivery authority — 2026-11-12:** Workstream C preserves every planned meal and calendar event and recalculates all grocery lists under the new model. Grocery checks and checked-demand baselines may reset only within the fenced migration rebuild; manual extras, corrections, history and all other facts remain protected. Bilingual shopping identity is included in this release: its model-authored, durable versioned UTF-8 JSON vocabulary and all saved references must survive full backup/restore without AI regeneration or external dataset/network dependencies. These amendments supersede prospective idle-list and bilingual-deferral gates, not historical evidence. See the [shared release scope](../canonical-ingredient-correction/proposal.md) and [rollout owner](../canonical-ingredient-correction/rollout.md).

## Why

The complete model must survive upgrade and recovery without losing household links or human edits. Dreaming and management already share disk backup, seed and sync owners; those owners must retain canonical facts rather than exporting and restoring legacy-only fields.

## Outcome and Scope

In-place-first conversion, conditional recipe-only disk fallback, current-format-only recovery, staged client fencing and complete grocery-list rebuild while preserving every plan/event and household history. No default reseed, production operation, old backup compatibility, automatic extraction or silent disk-over-live precedence. Conditional fallback compares stable IDs and stops/reports unexpected mismatches.

Frontend, backend and database deploy as one coordinated release. Old tabs refresh
before editing upgraded recipes, with recoverable draft reconciliation. Mixed-version
rolling operation and a permanent legacy editing adapter are not required; stale
worker guards, safe conversion and matched application/schema recovery remain required.

Planned downtime reuses the existing demo/online-recovery coordination and exact
snapshot owners, with household-preserving migration semantics. It does not invoke
demo reset, discard drafts or introduce a second recovery subsystem. Rehearsal must
prove the write/worker hold across process restarts before production activation.

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

Depends on the canonical foundation and final persisted portions, step, row/check
and bilingual identity contracts. Similar remains excluded. The final full recovery
format requires the durable vocabulary JSON and every referenced food/release/mapping
and household override. Historical pre-adoption inspection may describe absent
optional vocabulary without inventing mappings; it does not authorize the new app
to restore an incomplete old backup. Any public contract change must synchronize
OpenAPI, generated clients, consumers and
stateful mocks; no new public recovery operation is planned.

## Implementation baseline and remaining delivery

Guarded per-recipe conversion, current recipe encoding, bounded canonical
backup/seed/sync and exact-recovery owners already exist. The existing-operation
slice has local evidence at `.task/canonical-existing-flows-20261110/outcome.json`;
that evidence does not qualify an operational batch migration or coordinated
deployment. Reuse these foundations. Remaining work is the selected-ID no-write
manifest and resumable operator path, complete baseline recovery/preflight,
all-list rebuild with a migration-only reset epoch, durable vocabulary integration,
stale-client refresh and maintenance/rollback rehearsal.
The authoritative checklist is [tasks.md](tasks.md); all combined tasks remain
open until their own evidence is complete. Production execution is separate.
