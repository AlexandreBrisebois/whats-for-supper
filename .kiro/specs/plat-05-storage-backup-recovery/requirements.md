# Storage, Backup, and Recovery — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PLAT-05` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

Household relational data, recipe assets, workflows, and search state can be backed up and restored through controlled operations with verifiable integrity and no false success.

## Scope

### In scope

- PostgreSQL and persistent local asset ownership
- backup, restore, and disaster-recovery workflows
- management status and operational diagnostics
- search-state preservation/rebuild boundaries

### Non-goals

- claiming disaster recovery without a restore test
- exposing backup controls as ordinary family actions
- embedding secrets in backup artifacts or logs

## Verified current baseline

- `RecipeDbContext` uses PostgreSQL; `LocalStorageProvider` stores recipe assets beneath the configured data root.
- `ManagementController`, `ManagementService`, and `ManagementProcessor` trigger maintenance workflows.
- `db-backup.yaml`, `db-restore.yaml`, and `db-disaster-recovery.yaml` define persisted operations.
- Management status reports the latest relevant workflow rather than executing maintenance synchronously.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PLAT-05-R1 — Complete inventory

The backup contract shall identify relational tables, recipe assets, search documents, workflow metadata, configuration exclusions, and secrets that are intentionally outside the artifact.

### PLAT-05-R2 — Atomic artifact

A completed backup shall be internally consistent, versioned, integrity-checkable, and written without replacing the last known-good artifact with a partial result.

### PLAT-05-R3 — Controlled restore

Restore and disaster recovery shall require authenticated operator intent, validate compatibility/integrity before destructive replacement, and prevent conflicting maintenance runs.

### PLAT-05-R4 — Failure truth

Partial, incompatible, or failed operations shall remain failed with actionable diagnostics; management status shall never infer success from trigger acceptance.

### PLAT-05-R5 — Search recovery

Search state shall either restore consistently with recipes or be explicitly rebuilt and reconciled before search is declared healthy.

### PLAT-05-R6 — Qualification

Every supported deployment path shall document retention, storage capacity, restore steps, and a real restore verification cadence.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PLAT-05-R*` requirement with the
   selected household/member context.
2. Missing, stale, invalid, or unavailable dependencies produce the specified safe
   fallback or explicit failure rather than false success.
3. A second device, late response, retry, or identity change cannot silently replace
   newer authoritative state.
4. The affected behavior is operable with its required non-pointer alternative and
   exposes meaningful state to assistive technology where a UI exists.
5. Contract, persistence, and workflow changes are proven at their actual seams,
   not inferred from a static or mocked check alone.

## Decisions retained by this baseline

- Current public behavior is the starting compatibility boundary, not immutable
  architecture.
- Household data remains self-hosted and the least-privilege/least-data behavior is
  preferred.
- Background work must report accepted, completed, and failed states distinctly.

## Open questions before a future change

1. Which requirement is being changed, and what current behavior must remain
   backward compatible during rollout?
2. Does the change alter OpenAPI, persistence, deployment configuration, event
   delivery, or another feature spec? If so, approve those handshakes first.
3. What production or real-device evidence is required beyond repository automation
   for the selected change?
