# Requirements: Dietary separation migration — Phase 3 (CONTRACT)

## Outcome and boundary

Phase 3 permanently removes the retired WFS health/dietary data model after Phase 1's WFS-owned vegetarian fact and the deployed Phase 2 consumer cutover. This is a destructive, contract-breaking migration. It does not add, connect, or prescribe an external dietary agent.

WFS continues to own recipes, cooking and planning facts. Nutritional and dietetic interpretation is external to WFS. WFS retains vegetarian, cuisine, meal types, ingredients, source/raw nutrition metadata, recipe IDs, schedules, groceries, and preferences.

## Decisions

- **Backup compatibility:** new backups omit retired health fields; restore of an old backup ignores unknown retired fields and does not recreate retired tables or data. Core and vegetarian fields must restore.
- **Migration history:** historical SQL/migrations and archived documents may retain references when marked and justified; active code, contract, generated client, schema, and unexplained test helpers may not.
- **Supported-client policy:** Phase 3 supports no older API or PWA client. Public retired-health fields may be removed immediately; no compatibility layer or sunset is required.
- **T0 evidence exception:** Phase 2's deployment is accepted as a user decision. Separately collected deployed/live and database evidence previously required only as T0 preflight proof—including accepted vegetarian-backfill coverage, supported runtime/client identity, and the T0 live/database regression record—is waived. This exception does not assert that unavailable checks passed and does not waive T1–T4 verification, destructive-migration safety, or the populated-upgrade and clean-chain qualification in R6.
- **Rollback:** the forward migration is destructive. A rollback that cannot reconstruct discarded health data must say so explicitly; it must not pretend to restore removed concepts.

## Requirements

### R1 — hard preflight and live-reference accounting

Before any destructive schema change, a dated evidence record SHALL establish the applicable non-waived preflight conditions: Phase 1 readiness, the no-backward-compatibility supported-client decision, and a classification for the removal vocabulary. Phase 2 deployment, accepted vegetarian-backfill coverage, supported runtime/client identity, and deployed/live or database regression evidence are waived only as T0 preflight proof by the recorded user decision; their absence SHALL be reported as waived, not passed. T1–T4 retain their own specified checks.

The implementation SHALL classify every hit for the Phase 3 removal vocabulary as `REMOVE`, retained migration history, archived documentation, explicitly evaluated legacy-backup compatibility, or `zombie`. An unexplained hit or a `zombie` without an assigned removal owner fails the gate. `api/src/RecipeApi/Services/FopThresholds.cs` is a `REMOVE` target owned by T1. Static source inspection establishes only its inspected source properties and is not substituted for any non-waived runtime/regression evidence.

### R2 — no active health contract or consumers

The active API, runtime DTOs/mappers/readers/writers, OpenAPI, generated PWA client, API wrappers, PWA state/views, search/discovery representations, workflow/DI registrations, fixtures, and active documentation SHALL contain no live `RecipeDietaryProfile`, `IsHealthyChoice`, FOP, weekly balance, health-event, or health-profile contract. Existing WFS-owned recipe facts remain available.

### R3 — search and planner behavior survive contract removal

Semantic and lexical ingredient search, vegetarian (including `vegetarien` and `végétarien`), cuisine, meal type, Find Similar, planner read/assign/remove/move/cross-week flows, and grocery recomputation SHALL work from current WFS-owned data alone. A full reindex SHALL rebuild documents without dropped health data or legacy health-derived terms.

### R4 — durable backup/restore boundary

New backups SHALL not emit retired fields. The legacy fixture set SHALL include retired recipe health fields, `weekly_plans.balance_summary`, and every current backup artifact that serializes a retired concept. Restoring those representative pre-Phase-3 artifacts into the final schema SHALL tolerate those fields, retain recipes/ingredients/vegetarian/cuisine/meal types/schedules/core metadata, and not recreate health data. Current-schema round-trip restore SHALL preserve the same core data.

### R5 — destructive schema completion

Only after R1 and zero-reader/zero-writer evidence, the authoritative schema and runtime persistence model SHALL drop the retired tables, their dependent indexes/constraints/sequences, and obsolete columns including `recipes.dietary_profile`, `recipes.is_healthy_choice`, and `weekly_plans.balance_summary`, subject to actual-schema verification.

Views, materialized views, functions, triggers, JSONB indexes, discovery projections, test fixtures, and schema-integrity tests SHALL be updated before the drop is accepted. `recipes.is_vegetarian` and its operationally useful classifier metadata are expressly outside the drop.

### R6 — upgrade and clean-install safety

The destructive schema change SHALL be tested on a representative populated supported pre-Phase-3 database and on clean creation through the complete schema/migration path. Before any real deployment, the migration owner SHALL verify from the actual deployed image/tool help that the installed sqldef version has an explicit destructive-table-drop capability, exercise that capability with a dry run, and assert the resulting plan against the populated-schema fixture. Before applying it, the migration owner SHALL prove that no dropped storage is the sole source of a retained core fact. Discovery of one such fact stops the migration and is reported rather than copied implicitly.

### R7 — final audit and architectural record

The final report SHALL list dropped schema objects and code, retained compatibility/migration metadata, actual commands and results, reindex and backup evidence, API compatibility decision, rollback limitation, and final ghost-search classifications. Active architecture/data-flow documentation SHALL state the WFS/external-dietary-agent boundary without designing that integration.

## Non-goals

- Implementing an external dietary agent or new nutritional interpretation.
- Reclassifying vegetarian data or deleting its classifier metadata merely because this phase exists.
- Preserving deprecated public fields indefinitely without a supported-client dependency and sunset.
- Deleting historical migration evidence or archived specifications.

## Acceptance map

| Acceptance ID | Observable result |
| --- | --- |
| A1 | R1 evidence gate is complete: all non-waived conditions pass, and each waived deployed/live or database preflight condition is explicitly reported as waived rather than passed. |
| A2 | Contract/client/PWA/runtime audits have no unexplained active retired concept. |
| A3 | Search, Find Similar, planner, and grocery regression evidence proves retained behavior without health data. |
| A4 | Current round trip and legacy-backup restore meet R4; health data does not resurrect. |
| A5 | Populated upgrade and clean creation prove schema/view/model alignment and preservation of retained facts. |
| A6 | Final report, active documentation, and ghost audit meet R7. |

## Consequential blockers

1. R5 cannot start without actual R1 evidence for every non-waived condition, not merely a code audit; the recorded T0 exception applies only to the enumerated deployed/live and database preflight evidence.
2. The supported-client policy is recorded: no older API or PWA client is supported, so public retired-health fields have no compatibility sunset.
3. Any unique retained fact found in retired storage blocks the destructive migration until its ownership and safe preservation are separately decided.
