# Tasks: Dietary separation migration — Phase 3 (CONTRACT)

> **Archived — historical reference only.** Task status and checkboxes below
> record the completed migration; they are not an active work queue.

## Specification baseline

Captured before specification edits on 2026-09-25: the worktree already contained a large, uncommitted Phase 3 implementation attempt (86 files in `api/`, `pwa/`, and `specs/openapi.yaml`, including deletions). This specification owns only this new spec directory. Any later implementation task must capture its own content baseline before edits and must not overwrite or claim the pre-existing work.

## Task 0 — preflight and removal manifest (T0)

**Requirements:** R1; A1.

**Outcome:** a dated GO/NO-GO evidence packet establishing Phase 1 readiness, the no-backward-compatibility supported-client decision, and a classification for every removal-vocabulary hit. It records the user-authorized T0 exception for Phase 2 deployment, accepted backfill coverage, and deployed/live or database preflight evidence as waived rather than passed.

**Allowed effects:** add a task-local evidence/manifest document and focused audit or regression tests only. No schema, OpenAPI, runtime, generated-client, or destructive-data changes.

**Required context:** `docs/dietary-separation-phase1.md`; current OpenAPI; search, planner, grocery, backup/restore owners; the recorded no-backward-compatibility policy and T0 evidence exception; active schema and task targets.

**Checks:** trace all listed vocabulary including DB views and sidecars; record the non-waived conditions and distinguish passed, failed, blocked, not-run, and waived. Do not represent the user-authorized absence of deployed/live or database preflight evidence as a passing regression; later task-specific checks remain required.

**Stop conditions:** any non-waived prerequisite is not evidenced as passed; a supported older client is asserted; an unexplained reference or a zombie without an assigned removal owner remains. Stop with NO-GO—do not begin Task 1 or 3.

## Task 1 — atomic public-contract and consumer cutover (T1)

**Requirements:** R2, R3; A2, partial A3.

**Outcome:** no active public/consumer health contract from OpenAPI through API DTO/service/runtime reader-writer/DI and generated PWA/client/state/view seams, with retained recipe facts unchanged.

**Allowed effects:** `specs/openapi.yaml`; affected API DTO/mapper/service and runtime reader/writer/DI files, including removal of `api/src/RecipeApi/Services/FopThresholds.cs`; PWA generated output via the approved generator; affected PWA adapters/state/components; focused fixtures/mocks/tests; active docs only where they describe the current contract. Do not change physical schema or persistence models/table mappings yet.

**Required context:** Task 0 GO packet; `specs/openapi.yaml`; generated-client command; search services, schedule/grocery services, `ManagementService`, and their focused tests. `Recipe`, `WeeklyPlan`, `DiscoveryRecipe`, `RecipeDbContext`, health entities, and table mappings are exclusively Task 3 persistence ownership.

**Checks:** contract-focused API tests; regenerate then run `task gen:client:check`; `npm run typecheck` from `pwa`; focused search, planner and grocery tests; assert no DI/hosted service/runtime write remains and `FopThresholds.cs` is absent with no replacement retired-FOP helper.

**Stop conditions:** generated/API/PWA drift, lost vegetarian/cuisine/meal-type/ingredient behavior, any active reader/writer, or a retained/replaced retired-FOP helper. Do not drop schema objects; hand off those findings to Task 3.

## Task 2 — backup and final-data recovery proof (T2)

**Requirements:** R3, R4; A3, A4.

**Outcome:** proven new-backup omission, legacy-backup tolerance without health resurrection, current round trip, and reindex/search rebuild solely from WFS-owned facts. The legacy fixture set covers recipe health fields, legacy weekly-plan `balanceSummary`, and every current backup artifact that serializes a retired concept.

**Allowed effects:** backup/restore service and its focused tests/fixtures; search document builder/reindex tests; limited test infrastructure needed to exercise current and legacy artifacts. No DDL or external-agent work.

**Required context:** Task 1's final contract; `ManagementService` and `RecipeInfo`; backup artifact layout; search rebuild/index sidecar behavior; planner/grocery mutation tests.

**Checks:** current DB -> backup -> empty/current schema -> restore; representative legacy recipe-health and weekly-plan-`balanceSummary` artifacts, plus every current backup artifact that serializes a retired concept -> current schema -> restore; semantic/ingredient/vegetarian (including `végétarien`)/cuisine/meal-type/Find Similar checks after reindex; planner read/assign/remove/move/cross-week and relevant grocery recomputation.

**Stop conditions:** a legacy artifact needs retired domain types, current data is lost, a search document retains health-derived terms, or a regression fails. Record NO-GO for Task 3.

## Task 3 — physical schema and persistence removal (T3)

**Requirements:** R5, R6; A5.

**Outcome:** every deployed migration-service configuration required to drop tables, authoritative install/upgrade schema, views, runtime persistence model, and integrity checks contain no retired health storage or projection; retained WFS facts survive populated upgrade and clean creation.

**Allowed effects:** every deployed migration-service configuration required to drop tables; `api/database/schema.sql`, `api/database/compatibility.sql`, and the verified upgrade mechanism; `Recipe`, `WeeklyPlan`, `DiscoveryRecipe`, `RecipeDbContext`, retired health entities, and table/view mappings; schema tests and migration fixtures. Do not alter unrelated application behavior or delete archived history.

**Required context:** T0 GO on its non-waived gate plus T1/T2 pass evidence; actual supported pre-Phase-3 schema snapshot; database deployment/upgrade procedure; every deployed migration-service configuration required to drop tables; actual deployed image and installed sqldef version; dependent view/index/constraint/function/trigger inventory.

**Checks:** prove no dropped storage is sole source of a core fact; from actual deployed image/tool help verify that the installed sqldef version exposes an explicit destructive-table-drop capability; exercise that capability first with a dry run and assert the plan against the representative populated-schema fixture before any real deployment; then exercise a representative populated upgrade and a clean full chain; verify physical absence of tables/columns/dependencies and discovery-view health projections; verify vegetarian/classifier metadata, recipes, schedules, groceries, preferences, and search rebuild after upgrade; document downgrade limit.

**Stop conditions:** missing populated fixture/upgrade path, dependency failure, data loss, or ambiguity over an operational vegetarian metadata field. Do not replace this with clean-only evidence or force a destructive deploy.

## Task 4 — final audit, documentation, and report (T4)

**Requirements:** R1–R7; A1–A6.

**Outcome:** an evidence-backed final migration report and updated active architecture/data-flow boundary; every final ghost-search hit is justified.

**Allowed effects:** active architecture/data-flow docs, final report/evidence, and only test/doc cleanup directly caused by removed concepts. Preserve archive history according to `.kiro/specs/README.md`.

**Required context:** outputs/evidence from Tasks 0–3, removal vocabulary, archive policy, full relevant API/PWA/database test routing.

**Checks:** repository-wide final ghost search; backend build/API tests, OpenAPI generation/client typecheck, relevant PWA tests, search/Find Similar, planner, grocery, recipe lifecycle, backup/restore, populated upgrade, and clean chain. Report each result state separately.

**Stop conditions:** an unexplained active hit, missing test evidence, an unrecorded API compatibility decision, or scope expansion into an external dietary agent. Do not mark Phase 3 complete.

## Dependency and ownership map

| Task | Depends on | Primary ownership | May run in parallel? |
| --- | --- | --- | --- |
| 0 | none | evidence/audit owner | read-only audit only |
| 1 | 0 GO on non-waived conditions | contract/API/PWA owner | no, shared contract |
| 2 | 1 | recovery/search test owner | no, validates final T1 seam |
| 3 | 0–2 pass | schema/upgrade owner | no, destructive dependency |
| 4 | 0–3 pass | release evidence/docs owner | no, completion audit |

## Completion report template

1. T0 preflight decision and evidence states.
2. Supported-client policy: no older API or PWA client is supported; no compatibility sunset applies.
3. Contract/code/schema objects removed; compatibility/migration metadata kept.
4. Exact populated-upgrade and clean-chain commands/results; downgrade limit.
5. Reindex/search and current/legacy backup-restore evidence.
6. Final ghost-search classifications and active WFS/external-dietary boundary.
