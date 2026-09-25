# Requirements: Dietary separation migration — Phase 3 (CONTRACT)

## Outcome and boundary

Phase 3 permanently removes the retired WFS health/dietary data model after Phase 1's WFS-owned vegetarian fact and Phase 2's consumer cutover have been proven. This is a destructive, contract-breaking migration. It does not add, connect, or prescribe an external dietary agent.

WFS continues to own recipes, cooking and planning facts. Nutritional and dietetic interpretation is external to WFS. WFS retains vegetarian, cuisine, meal types, ingredients, source/raw nutrition metadata, recipe IDs, schedules, groceries, and preferences.

## Decisions

- **Backup compatibility:** new backups omit retired health fields; restore of an old backup ignores unknown retired fields and does not recreate retired tables or data. Core and vegetarian fields must restore.
- **Migration history:** historical SQL/migrations and archived documents may retain references when marked and justified; active code, contract, generated client, schema, and unexplained test helpers may not.
- **API compatibility:** removal is permitted only after the supported-client policy has been evidenced. If an older supported client is still in scope, the exact field, client, and dated sunset condition must be approved before the destructive slice. Otherwise all active public health fields are removed.
- **Rollback:** the forward migration is destructive. A rollback that cannot reconstruct discarded health data must say so explicitly; it must not pretend to restore removed concepts.

## Requirements

### R1 — hard preflight and live-reference accounting

Before any destructive schema change, a dated evidence record SHALL establish that Phase 1 and Phase 2 are complete, accepted vegetarian-backfill coverage is met, and no live search, planner, grocery, health worker/event producer/profile writer/FOP writer/balance writer remains. It SHALL record passing semantic search, Find Similar, planner, grocery, and backup/restore regression evidence.

The implementation SHALL classify every hit for the Phase 3 removal vocabulary as `REMOVE`, retained migration history, archived documentation, explicitly evaluated legacy-backup compatibility, or `zombie`; a zombie or unexplained live hit fails the gate. Static source inspection is not a substitute for the required runtime/regression evidence.

### R2 — no active health contract or consumers

The active API, runtime models/mappers, OpenAPI, generated PWA client, API wrappers, PWA state/views, search/discovery representations, workflow/DI registrations, fixtures, and active documentation SHALL contain no live `RecipeDietaryProfile`, `IsHealthyChoice`, FOP, weekly balance, health-event, or health-profile contract. Existing WFS-owned recipe facts remain available.

### R3 — search and planner behavior survive contract removal

Semantic and lexical ingredient search, vegetarian (including `vegetarien` and `végétarien`), cuisine, meal type, Find Similar, planner read/assign/remove/move/cross-week flows, and grocery recomputation SHALL work from current WFS-owned data alone. A full reindex SHALL rebuild documents without dropped health data or legacy health-derived terms.

### R4 — durable backup/restore boundary

New backups SHALL not emit retired fields. Restoring a representative pre-Phase-3 backup into the final schema SHALL tolerate those fields, retain recipes/ingredients/vegetarian/cuisine/meal types/schedules/core metadata, and not recreate health data. Current-schema round-trip restore SHALL preserve the same core data.

### R5 — destructive schema completion

Only after R1 and zero-reader/zero-writer evidence, the authoritative schema and runtime persistence model SHALL drop the retired tables, their dependent indexes/constraints/sequences, and obsolete columns including `recipes.dietary_profile`, `recipes.is_healthy_choice`, and `weekly_plans.balance_summary`, subject to actual-schema verification.

Views, materialized views, functions, triggers, JSONB indexes, discovery projections, test fixtures, and schema-integrity tests SHALL be updated before the drop is accepted. `recipes.is_vegetarian` and its operationally useful classifier metadata are expressly outside the drop.

### R6 — upgrade and clean-install safety

The destructive schema change SHALL be tested on a representative populated supported pre-Phase-3 database and on clean creation through the complete schema/migration path. Before applying it, the migration owner SHALL prove that no dropped storage is the sole source of a retained core fact. Discovery of one such fact stops the migration and is reported rather than copied implicitly.

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
| A1 | R1 evidence gate is complete and all required conditions pass before the destructive task starts. |
| A2 | Contract/client/PWA/runtime audits have no unexplained active retired concept. |
| A3 | Search, Find Similar, planner, and grocery regression evidence proves retained behavior without health data. |
| A4 | Current round trip and legacy-backup restore meet R4; health data does not resurrect. |
| A5 | Populated upgrade and clean creation prove schema/view/model alignment and preservation of retained facts. |
| A6 | Final report, active documentation, and ghost audit meet R7. |

## Consequential blockers

1. R5 cannot start without actual R1 evidence, not merely a code audit.
2. The supported-client policy must be recorded before removing active public fields; a supported older client requires an explicit compatibility sunset.
3. Any unique retained fact found in retired storage blocks the destructive migration until its ownership and safe preservation are separately decided.
