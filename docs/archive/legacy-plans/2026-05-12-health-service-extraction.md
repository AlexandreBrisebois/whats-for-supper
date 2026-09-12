# Health Service Extraction

## Summary

Extract health ownership out of the current WFS core flow while preserving existing WFS endpoints.

This slice moves both recipe-level and week-level health data into health-owned tables, replaces the current synchronous `GroceryRecomputeService` coupling with durable asynchronous recompute, and keeps planner/search contracts stable by introducing server-side health adapters behind the existing WFS endpoints.

This plan assumes:

- the database is brand new
- schema migrations and backfill do not matter for this slice
- recipes will be reimported from `recipe.info` and `recipe.json`
- planner and search should silently fall back when health data is not yet ready

## Product Direction

The extracted health subsystem should behave more like an advisory virtual actor than a core transactional dependency.

That means:

- schedule writes must not block on health recompute
- recipe import/synthesis must not directly persist health data into WFS-owned recipe fields
- planner and search should consume health guidance through dedicated adapters
- WFS remains the UX surface, but health becomes an internal provider

## Key Changes

### 1. Introduce health-owned persistence

Add dedicated health tables instead of storing health data inside:

- `recipes.dietary_profile`
- `weekly_plans.balance_summary`

The first slice should introduce at least:

- a recipe health profile table keyed by `recipe_id`
- a week health summary table keyed by week identity
- a durable health event queue / outbox table for neutral domain events

The health-owned tables should persist:

- recipe dietary classification output
- recipe FOP flags
- week balance summary
- week FOP aggregation
- health recompute status metadata needed for silent fallback behavior

### 2. Replace direct health writes with neutral events

Recipe and schedule flows should stop owning health recompute directly.

Instead:

- recipe creation/import/synthesis/update flows publish a neutral `recipe_changed` event
- schedule assignment/move/remove flows publish a neutral `week_changed` event

The events must be durable so health recompute survives process restarts and can be retried independently.

This is explicitly not a health-specific callback from `GroceryRecomputeService`.
The event contract should describe only the changed entity and the recompute scope.

### 3. Add asynchronous health recompute workers

Introduce background health workers/processors that consume the durable queue:

- recipe health recompute worker
- week health recompute worker

Recipe worker responsibilities:

- load the recipe
- derive or refresh recipe-level health profile from WFS-owned recipe content
- write health results to health-owned recipe tables

Week worker responsibilities:

- load the week context from calendar/schedule data
- load recipe-level health records from health-owned tables
- compute week summary and FOP aggregates
- write week health summary to health-owned week tables

The workers should be idempotent and safe to retry.

### 4. Carve weekly health recompute out of `GroceryRecomputeService`

`GroceryRecomputeService` should return to grocery ownership only.

Remove from it:

- `WeeklyBalanceScorer` orchestration
- `balance_summary` persistence
- health-driven discovery nudge ownership

If discovery nudges remain in scope, they should be emitted by the health subsystem after recompute rather than by grocery recompute.

### 5. Add server-side health adapters behind existing WFS endpoints

Do not introduce new frontend endpoints in this slice.

Keep existing WFS endpoint shapes where practical, but change the source of truth behind them.

Adapter seams should include at least:

- planner health summary adapter for schedule responses
- recipe search health guidance adapter for planner-aware reranking
- recipe detail/list mapping adapter if recipe-level health remains exposed in DTOs

The adapter layer should:

- read the latest completed health summary if one exists
- fall back silently when health data is missing or pending
- never block planner or search on recompute freshness

### 6. Preserve existing planner/search UX contracts

Planner:

- existing schedule endpoint continues to supply health guidance through its current WFS shape
- if no completed week health summary exists, planner behaves as though no summary is available

Search:

- existing recipe search endpoint continues to return planner-fit guidance when health data is ready
- if health data is missing or pending, search falls back to non-health reranking

No explicit pending health UI is required in this first slice.

### 7. Remove WFS-owned health persistence from the long-term path

This slice should stop treating these as the source of truth:

- `recipes.dietary_profile`
- `weekly_plans.balance_summary`

If transitional compatibility writes are temporarily needed during the slice, they must be called out explicitly as temporary and removed before the extraction is considered complete.

The intended end state of this plan is that health ownership is externalized even if WFS still presents the data.

## Architecture Slices

### Slice 1. Health storage and event contracts

Create the health-owned tables and durable event queue shape.

Definition of done:

- new tables exist in schema
- recipe and week health state have explicit ownership
- neutral event records can represent `recipe_changed` and `week_changed`

### Slice 2. Recipe health extraction

Move recipe-level health generation out of WFS-owned `recipes.dietary_profile`.

Definition of done:

- recipe workflows publish `recipe_changed`
- recipe worker computes and persists recipe health profile in health-owned tables
- recipe health reads are available through an adapter

### Slice 3. Week health extraction

Move week-level health generation out of `GroceryRecomputeService` and `weekly_plans.balance_summary`.

Definition of done:

- schedule writes publish `week_changed`
- week worker computes and persists week health summary in health-owned tables
- planner health reads come through the adapter instead of `weekly_plans.balance_summary`

### Slice 4. Search decoupling

Make recipe search consume health through the new health adapter rather than direct schedule-owned summary assumptions.

Definition of done:

- planner-aware search reranking uses the adapter seam
- missing/pending health data silently falls back
- search behavior remains functional without ready health data

### Slice 5. WFS cleanup

Remove obsolete direct health ownership from WFS core services.

Definition of done:

- `GroceryRecomputeService` no longer owns weekly health recompute
- direct reads/writes of WFS-owned health persistence are removed or explicitly transitional
- health responsibilities are clearly separated from grocery and schedule responsibilities

## Pre-Mortem

### Failure mode 1: event durability is weak

Risk:

- schedule writes succeed
- health recompute event is lost
- planner/search silently serve stale or empty advice forever

Mitigation:

- use a durable persisted queue/outbox table
- track event processing status and retries
- make workers idempotent

### Failure mode 2: week recompute outruns recipe recompute

Risk:

- `week_changed` is processed before updated recipe health is ready
- week summary is built from missing or stale recipe health inputs

Mitigation:

- define recompute ordering and retry behavior explicitly
- allow week worker to requeue or retry when required recipe health inputs are not ready
- make silent fallback a read concern, not a data corruption allowance

### Failure mode 3: adapters leak pending state into UX unexpectedly

Risk:

- planner/search start depending on health freshness semantics they did not previously own

Mitigation:

- adapter contract must return "best completed summary or nothing"
- planner and search remain non-blocking

### Failure mode 4: extraction leaves half-owned data

Risk:

- recipe health is in health tables
- week health still depends on `recipes.dietary_profile`
- ownership remains muddy

Mitigation:

- treat recipe-level and week-level extraction as part of the same plan
- define explicit source-of-truth transitions for both layers

### Failure mode 5: grocery and health stay entangled through side effects

Risk:

- `GroceryRecomputeService` continues to trigger or shape health recompute logic

Mitigation:

- enforce neutral event publication at schedule-write boundaries
- move all health recompute orchestration to health workers/services

## Test Plan

### API and integration tests

- recipe workflows enqueue durable `recipe_changed` events
- schedule writes enqueue durable `week_changed` events
- health workers persist recipe-level health rows correctly
- health workers persist week-level health summary rows correctly
- repeated event delivery is idempotent
- week recompute handles missing recipe-health inputs via retry or deferred processing
- existing schedule endpoint still returns health summary when a completed record exists
- existing schedule endpoint returns no summary rather than erroring when health is pending/missing
- existing recipe search endpoint still functions when no health summary is ready
- search reranking applies health guidance only when adapter data is ready

### Unit tests

- recipe health adapter fallback rules
- week health adapter fallback rules
- event status transitions
- worker retry/idempotency behavior
- `WeeklyBalanceScorer` remains pure and covered in isolation
- FOP parsing and aggregation remain pure and covered in isolation

### Contract and drift checks

- `task agent:drift`
- `task agent:test:impact`
- `task gate`

Run `task review` before calling the extraction complete if shared seams or contracts move broadly.

## Verification

- `task agent:drift`
- `task agent:test:impact`
- `task gate`
- `task review`

## Assumptions

- WFS remains the presentation layer for planner and search in this slice.
- Health storage is owned by new health tables, not by `recipes` or `weekly_plans`.
- Existing WFS endpoints remain the client contract for the first extraction slice.
- Health recompute is advisory and eventually consistent.
- Silent fallback is preferred over pending-state UI.
- Fresh database import makes schema redesign safe for this slice.
