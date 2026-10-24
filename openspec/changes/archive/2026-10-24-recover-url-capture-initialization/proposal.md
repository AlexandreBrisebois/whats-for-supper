# Proposal

## Why

URL intake currently saves a recipe before a caught workflow trigger exception, leaving no durable work or recovery row (#253).

## Outcome and Scope

Accepted URL intake has durable recovery even when workflow initialization fails. Photo/PDF, historical orphan backfill, synchronous acquisition and universal file/database atomicity are excluded. The coordinator approved a durable initialization marker using existing workflow recovery.

## What Changes

- Save pending URL recipe and recoverable workflow together before initialization.
- Explain saved-but-not-started failures in Settings using its current controls.
- Retry initialization against the same workflow and recipe identities; reconcile concurrent or uncertain outcomes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `capture-recovery`: durable URL initialization failure and bounded retry.

## Impact

RecipeService, WorkflowOrchestrator, CaptureFailureService, existing capture API descriptions and focused database/storage/orchestration tests. Existing DTOs/routes remain; generation and mock acceptance are coordinated centrally.
