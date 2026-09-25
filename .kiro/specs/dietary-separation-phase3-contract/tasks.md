# Tasks: Dietary separation migration — Phase 3 (CONTRACT)

## Specification baseline

Captured before specification edits on 2026-09-25: the worktree already contained a large, uncommitted Phase 3 implementation attempt (86 files in `api/`, `pwa/`, and `specs/openapi.yaml`, including deletions). This specification owns only this new spec directory. Any later implementation task must capture its own content baseline before edits and must not overwrite or claim the pre-existing work.

## Task 0 — preflight and removal manifest (T0)

**Requirements:** R1; A1.

**Outcome:** a dated GO/NO-GO evidence packet proving Phase 1/2 readiness, accepted backfill coverage, supported-client policy, required regression status, and a classification for every removal-vocabulary hit.

**Allowed effects:** add a task-local evidence/manifest document and focused audit or regression tests only. No schema, OpenAPI, runtime, generated-client, or destructive-data changes.

**Required context:** `docs/dietary-separation-phase1.md`; current OpenAPI; search, planner, grocery, backup/restore owners; actual deployment/client support policy; active schema and task targets.

**Checks:** run and record semantic search, Find Similar, planner, grocery, and backup/restore regressions; trace all listed vocabulary including DB views and sidecars; distinguish passed, failed, blocked and not-run.

**Stop conditions:** any prerequisite is not evidenced as passed; a live reader/writer or unknown supported client remains; a reference cannot be classified. Stop with NO-GO—do not begin Task 1 or 3.

## Task 1 — atomic public-contract and consumer cutover (T1)

**Requirements:** R2, R3; A2, partial A3.

**Outcome:** no active public/consumer health contract from OpenAPI through API DTO/service/search/discovery/DI and generated PWA/client/state/view seams, with retained recipe facts unchanged.

**Allowed effects:** `specs/openapi.yaml`; affected API DTO/model/mapper/service and DI files; PWA generated output via the approved generator; affected PWA adapters/state/components; focused fixtures/mocks/tests; active docs only where they describe the current contract. Do not change physical schema yet.

**Required context:** Task 0 GO packet; `specs/openapi.yaml`; generated-client command; `RecipeDbContext`, `DiscoveryRecipe`, search services, schedule/grocery services, `ManagementService`, and their focused tests.

**Checks:** contract-focused API tests; regenerate then run `task gen:client:check`; `npm run typecheck` from `pwa`; focused search, planner and grocery tests; assert no DI/hosted service/runtime write remains.

**Stop conditions:** generated/API/PWA drift, lost vegetarian/cuisine/meal-type/ingredient behavior, or any active reader/writer. Do not drop schema objects; hand off those findings to Task 3.

## Task 2 — backup and final-data recovery proof (T2)

**Requirements:** R3, R4; A3, A4.

**Outcome:** proven new-backup omission, legacy-backup tolerance without health resurrection, current round trip, and reindex/search rebuild solely from WFS-owned facts.

**Allowed effects:** backup/restore service and its focused tests/fixtures; search document builder/reindex tests; limited test infrastructure needed to exercise current and legacy artifacts. No DDL or external-agent work.

**Required context:** Task 1's final contract; `ManagementService` and `RecipeInfo`; backup artifact layout; search rebuild/index sidecar behavior; planner/grocery mutation tests.

**Checks:** current DB -> backup -> empty/current schema -> restore; representative legacy artifact -> current schema -> restore; semantic/ingredient/vegetarian (including `végétarien`)/cuisine/meal-type/Find Similar checks after reindex; planner read/assign/remove/move/cross-week and relevant grocery recomputation.

**Stop conditions:** a legacy artifact needs retired domain types, current data is lost, a search document retains health-derived terms, or a regression fails. Record NO-GO for Task 3.

## Task 3 — physical schema and persistence removal (T3)

**Requirements:** R5, R6; A5.

**Outcome:** authoritative install/upgrade schema, views, runtime persistence model, and integrity checks contain no retired health storage or projection; retained WFS facts survive populated upgrade and clean creation.

**Allowed effects:** `api/database/schema.sql`, `api/database/compatibility.sql` and the verified upgrade mechanism; `RecipeDbContext`, retired models/configurations, discovery view mapping, schema tests, and migration fixtures. Do not alter unrelated application behavior or delete archived history.

**Required context:** T0 GO plus T1/T2 pass evidence; actual supported pre-Phase-3 schema snapshot; database deployment/upgrade procedure; dependent view/index/constraint/function/trigger inventory.

**Checks:** prove no dropped storage is sole source of a core fact; exercise a representative populated upgrade and a clean full chain; verify physical absence of tables/columns/dependencies and discovery-view health projections; verify vegetarian/classifier metadata, recipes, schedules, groceries, preferences, and search rebuild after upgrade; document downgrade limit.

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
| 1 | 0 GO | contract/API/PWA owner | no, shared contract |
| 2 | 1 | recovery/search test owner | no, validates final T1 seam |
| 3 | 0–2 pass | schema/upgrade owner | no, destructive dependency |
| 4 | 0–3 pass | release evidence/docs owner | no, completion audit |

## Completion report template

1. T0 preflight decision and evidence states.
2. Supported-client policy and compatibility sunset, if any.
3. Contract/code/schema objects removed; compatibility/migration metadata kept.
4. Exact populated-upgrade and clean-chain commands/results; downgrade limit.
5. Reindex/search and current/legacy backup-restore evidence.
6. Final ghost-search classifications and active WFS/external-dietary boundary.
