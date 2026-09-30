# Background Workflow Engine — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PLAT-02` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

Long-running and scheduled WFS work executes from declarative workflows with persistent state, dependency ordering, bounded retries, diagnostics, and safe recovery.

## Scope

### In scope

- YAML definition seeding and parsing
- workflow instance/task persistence and orchestration
- worker claim/concurrency/retry/reaping behavior
- trigger, status, diagnostics, and reset API seams

### Non-goals

- a general public workflow-authoring product
- arbitrary code execution from YAML
- hiding failed work by infinite retry

## Verified current baseline

- Workflow definitions live in `api/src/RecipeApi/Workflows/` and are seeded by `WorkflowSeeder`.
- `WorkflowOrchestrator`, `WorkflowRepository`, and `WorkflowWorker` own expansion, persistence, claiming, execution, retries, and worker recovery.
- Processors implement `IWorkflowProcessor` and are registered explicitly in `Program.cs`.
- `WorkflowController` exposes trigger, active/detail, diagnostics, and controlled reset operations represented in OpenAPI.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PLAT-02-R1 — Definition validation

Only seeded, valid workflow IDs and known processor contracts shall be triggerable; malformed dependencies or payloads shall fail before partial execution where possible.

### PLAT-02-R2 — Persistent lifecycle

Instances and tasks shall persist explicit pending, processing, completed, paused, and failed state with timestamps and diagnostic context.

### PLAT-02-R3 — Dependency execution

A task shall become eligible only when its declared prerequisites satisfy the workflow definition; child workflows shall preserve parent context.

### PLAT-02-R4 — Concurrency

Workers shall claim tasks atomically so competing workers do not execute the same claim concurrently, while respecting processor throttles.

### PLAT-02-R5 — Retry and failure

Transient failures shall follow bounded retry/backoff policy; fatal or exhausted work shall remain diagnosable and shall not be reported as success.

### PLAT-02-R6 — Recovery and API

Abandoned work may be reaped or reset only through controlled rules; API status and diagnostics shall reflect persisted truth and protect sensitive payloads.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PLAT-02-R*` requirement with the
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
