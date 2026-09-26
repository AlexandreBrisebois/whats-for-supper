# Design: Dietary separation migration — Phase 3 (CONTRACT)

> **Archived — historical reference only.** This completed migration design is
> not active implementation guidance or an authorization to repeat its steps.

## Current seam map

The authoritative public contract is `specs/openapi.yaml`; the Kiota client is generated below `pwa/src/lib/api/generated/`. Active PWA adapters and state live in `pwa/src/lib/api/recipes.ts`, planner components/pages, and `pwa/src/store/weekStore.ts`. API models/services/DI are below `api/src/RecipeApi/`.

The database is currently maintained through `api/database/schema.sql` plus `api/database/compatibility.sql`, not an EF `Migrations/` directory. The destructive slice must therefore specify and validate the repository's actual upgrade mechanism rather than assume `dotnet ef` can create a migration. Current audit evidence identifies retired physical objects in the schema: `health_events`, `health_recipe_profiles`, `health_week_summaries`, `recipes.is_healthy_choice`, `recipes.dietary_profile`, `weekly_plans.balance_summary`, and their discovery-view projections. The runtime `RecipeDbContext` and `DiscoveryRecipe` are also still relevant removal owners. This is planning evidence, not proof that they are safe to drop.

`ManagementService` persists recipe sidecars through `RecipeInfo`. Its normal serializer naturally ignores unknown JSON fields, so legacy backup compatibility uses that behavior and regression coverage rather than reintroducing health types or a compatibility parser.

## Ordered tracer bullets

The slices deliberately run in order. Each is a thin end-to-end proof of one property, not a layer-wide cleanup batch.

```text
T0 evidence gate ──pass──> T1 contract-to-client removal ──pass──> T2 backup/search proof
       │                                      │                              │
       └──fail: stop                         └──no schema drop               └──fail: stop
                                                                          │
                                                                          v
                                                            T3 physical-schema drop
                                                                          │
                                                                          v
                                                            T4 final audit/report
```

### T0 — destructive preflight tracer

Create a reviewable preflight/evidence record and a classified reference manifest before altering the database. Trace source references from the PWA/API contract through controller/service/model/storage and include the supplied vocabulary plus discovery views and backup sidecars. Record Phase 2 deployment and the no-backward-compatibility policy as user decisions. The recorded exception waives separately collected deployed/live and database evidence only for this T0 preflight; report those conditions as waived rather than passed, and retain all later task-specific verification. This slice creates no destructive migration and has one output: an evidenced GO/NO-GO decision on the non-waived gate.

### T1 — public-contract to live-consumer tracer

With T0=GO and the no-backward-compatibility policy recorded, remove retired fields through the whole public-consumer seam in one atomic change: OpenAPI schemas/fields, API DTOs and mappers, runtime readers/writers/DI/workers, PWA generated client and handwritten adapters/store/views, fixtures/mocks, health-only tests, and the active retired runtime helper `api/src/RecipeApi/Services/FopThresholds.cs`. Regenerate Kiota rather than hand-edit generated models. Persistence-model ownership is reserved exclusively for T3: `Recipe`, `WeeklyPlan`, `DiscoveryRecipe`, `RecipeDbContext`, health entities, and table/view mappings are not T1 changes.

Physical storage and persistence models are intentionally still present during T1, but no runtime path may read or write retired storage. This makes T1 independently testable and creates the zero-reader/zero-writer evidence required by T3. It must not hide a retained database property with `JsonIgnore`; persistence properties/models and table/view mappings are owned by T3's final persistence cleanup.

### T2 — recovery and reindex tracer

Before irreversible storage deletion, prove the final persistence boundary in the application: new backup omits retired fields; the legacy fixture set covers recipe health fields, `weekly_plans.balance_summary`, and every current backup artifact that serializes a retired concept while restoring retained facts and ignoring unknown fields; current backup round trip works; and a clean reindex/search document build derives only WFS-owned facts. Include French vegetarian coverage, Find Similar, and planner-to-grocery mutation coverage. Failure is a NO-GO for T3.

### T3 — populated upgrade tracer

After T1/T2 and a fresh zero-reader/zero-writer audit, change every deployed migration-service configuration required to drop tables, the actual schema upgrade artifact(s), `schema.sql`, compatibility/install logic, persistence models (`Recipe`, `WeeklyPlan`, `DiscoveryRecipe`, `RecipeDbContext`, health entities, and table/view mappings), views and schema-integrity tests together. Drop health tables first only after their dependencies are removed; then drop obsolete core columns and recreate the discovery view without health projections. Inspect dependent indexes, constraints, sequences, triggers, functions, JSONB indexes, and materialized views rather than assuming the named columns are isolated.

Before any real deployment, inspect the actual deployed image/tool help to verify the installed sqldef version exposes an explicit destructive-table-drop capability; exercise it first with a dry run and assert the plan against a representative populated pre-Phase-3 schema. Then use that populated schema and the clean full chain. Record exact dropped objects and whether downgrade is structurally incapable of recovering health data. Retained vegetarian facts/classifier metadata are asserted before and after upgrade.

### T4 — final ghost-audit tracer

Run final full active-tree searches and classify every hit. Retained hits are only migration history, archived history, or the tested legacy-backup fixture. Run the final relevant API/PWA/database suites, update active architecture/data-flow material, and produce the migration report. T4 has no product-scope expansion: it neither adds health features nor implements the external agent.

## Failure and recovery rules

| Condition | Required behavior |
| --- | --- |
| A non-waived T0 condition is absent or fails | Stop before T1/T3 destructive work; report failed, blocked, or not-run evidence exactly. Record an enumerated deployed/live or database preflight exception as waived, not passed. |
| A retired store contains a unique retained fact | Stop T3; identify the fact and obtain a preservation decision. |
| An old backup contains retired keys | Ignore those keys under normal JSON deserialization; restore current fields; assert no health entity/table is recreated. |
| Contract/client regeneration differs unexpectedly | Treat it as contract drift; reconcile OpenAPI, generated client, adapters, mocks, and tests before continuing. |
| Populated upgrade fails | Do not substitute a clean-schema success; keep T3 incomplete and preserve the diagnostic fixture/database evidence. |
| A final ghost-search hit is live or unexplained | Remove/classify it before declaring completion. |

## Verification strategy

T0 and T4 record actual commands/result states. Expected routing includes `task gen:client:check`, `npm run typecheck` in `pwa`, focused API tests, and the applicable Playwright search/planner/recipe suites. The schema owner must add a repeatable populated-upgrade and clean-chain command/fixture if the current task targets do not exercise both paths. `task review` is useful contract/static evidence but does not itself run E2E or prove populated upgrade, backup restore, full reindex, or supported-client deployment safety.

## Alternatives rejected

- **One giant cleanup:** obscures whether contract removal, recovery behavior, or destructive DDL caused a regression and makes the no-go gate ineffective.
- **Keep `JsonIgnore`/unused columns forever:** retains zombie persistence and violates the final no-health contract.
- **Custom legacy health deserializer:** adds retired domain types when normal unknown-field tolerance is sufficient.
- **Drop vegetarian metadata with health fields:** risks deletion of the new WFS-owned classifier state and is outside the migration's target.
