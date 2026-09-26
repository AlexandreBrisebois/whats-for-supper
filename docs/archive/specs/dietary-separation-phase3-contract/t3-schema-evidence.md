# T3 physical schema and persistence evidence

> **Archived — historical evidence only.** This records a completed isolated
> migration check; it is not a current verification procedure.

**Scope:** dietary-separation-phase3-contract / Task 3 only. This record does
not authorize T4.

## Migration tool and isolated fixture

The operator inspected the actual migration image with:

```sh
docker run --rm --entrypoint /usr/local/bin/sqldef \
  whats-for-supper-db-migration:latest --help
```

The observed tool is `sqldef v3.11.23`. Its help explicitly documents
`--enable-drop` as enabling drops for tables, schemas, functions, triggers,
views, indexes, sequences, and types. The deployed migration-service source
configuration now passes `--enable-drop`; its image continues to use the same
sqldef version.

The retired verifier created a unique `wfs-phase3-<pid>` Docker
network/container with no published port, built a candidate migration image
from the worktree, and targeted only three databases inside that disposable
cluster. It started from the supported
pre-Phase-3 snapshot `b21beba266144668ded790bbdb9db3a7f5376fc6` at
`api/database/schema.sql` (SHA-256
`6edfd3241cb4bde79354e0c1ca62abfb1a2dc52ecd5224261b2ac4d9e11cd6c7`). It
does not use Compose, a host port, a named volume, or a user/shared/live
database.

The populated fixture proves retained facts before/after the destructive
upgrade: recipe and ingredients, confirmed vegetarian classification version,
calendar schedule, weekly-plan grocery state, family search preference, and
search-document vegetarian metadata. It deliberately seeds retired table and
column data only as data to be discarded; no retained fact is sourced solely
from it.

## Observed isolated verification

The actual sqldef `--enable-drop --dry-run` emitted only the intended physical
removal/recreation plan: drop/recreate `vw_discovery_recipes`; drop
`health_events`, `health_recipe_profiles`, and `health_week_summaries`; drop
`recipes.is_healthy_choice`, `recipes.dietary_profile`, and
`weekly_plans.balance_summary`. No retained core store, `recipes.is_vegetarian`,
or classifier metadata was listed for drop.

The isolated populated apply completed through `compatibility.sql` and sqldef.
Its eight post-upgrade checks all reported `ok`: retired tables absent, retired
columns absent, discovery view clean, vegetarian/classifier retained, schedule
retained, grocery state retained, preference retained, and search document
retained; aggregate result: `overall=ok`.

An independent clean database then travelled the same migration-image path,
was seeded with current WFS facts, and produced the same eight `ok` results and
`overall=ok`. The verifier ended with:

```text
Phase 3 isolated populated upgrade and clean-chain verification passed.
```

## Changed persistence boundary and rollback limit

`schema.sql`, `compatibility.sql`, the migration service configuration, and EF
models remove the three health tables, their table-owned index/foreign-key
dependencies, the three obsolete core columns, and health fields from
`vw_discovery_recipes`. `Recipe.IsVegetarian` and every
`vegetarian_classification_*` field remain.

The forward upgrade is irreversible. A downgrade can recreate empty structures
only; it cannot reconstruct discarded health events, profiles, weekly
summaries, FOP flags, dietary profiles, healthy-choice values, or balance
summaries. Restore from a pre-upgrade backup is required to recover those
retired facts, and that recovery is outside the supported Phase 3 model.

## Current check ledger

| Check | Result | Boundary |
| --- | --- | --- |
| Actual image help and destructive option | passed | operator-observed image help; sqldef v3.11.23 / `--enable-drop` |
| Populated pre-Phase-3 dry plan | passed | isolated fixture only |
| Populated upgrade and retained-fact checks | passed | isolated fixture only |
| Independent clean chain and retained-fact checks | passed | isolated fixture only |
| `dotnet build api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore` | passed | local compile; not PostgreSQL proof |
| `task agent:reconcile` | passed | static route/mock coverage only; no live API/database claim |
| `task agent:drift:schemas` | passed | static OpenAPI/DTO check only |
| `git diff --check` | passed | local whitespace only |
| Focused schema/API tests | blocked | sandboxed vstest cannot bind its communication socket; must run locally |
| `task agent:prepare` | not-run | local operator run required before finish because it can format/generate |
| `task agent:finish` | not-run | must run exactly once after preparation and scope review |

## Baseline and scope review

T3 baseline: `/private/tmp/wfs-phase3-t3-baseline.fPtYqA`; HEAD:
`b21beba266144668ded790bbdb9db3a7f5376fc6`. Pre-existing dirty work remains
outside this task. T3 owns only the persistence/schema files, the directly
necessary compile fixes in the two existing recovery/search tests, the schema
integrity test, migration-service `--enable-drop` configuration, and the new
isolated verifier. The prior T1/T2/harness/capture/spec changes remain
pre-existing and are not claimed here. Completion scope review must be rerun
after `task agent:prepare` because that command may format application files.

## Prepared scope review

The operator ran `task agent:prepare` after the migration-service configuration
received its authorized harness classification. It reported application,
contract, documentation, and harness classes; `gen:client`, API formatting,
and PWA formatting passed, and it reported no generated-client diff. The
post-prepare worktree contains no path outside the captured pre-existing set
plus these T3 paths:

| T3 path | Reviewed purpose |
| --- | --- |
| `api/database/schema.sql` | Remove retired tables/columns and health projections from the discovery view while retaining vegetarian classifier columns. |
| `api/database/compatibility.sql` | Ordered irreversible view/table/column removal for populated upgrades. |
| `docker/compose/infrastructure.yml` | Pass the verified `--enable-drop` option to the deployed migration service. |
| `api/src/RecipeApi/{Data/RecipeDbContext.cs,Models/Recipe.cs,Models/DiscoveryRecipe.cs}` | Remove retired persistence mappings/properties; preserve WFS-owned fields. |
| `api/src/RecipeApi/Models/{HealthEvent.cs,HealthRecipeProfile.cs,HealthWeekSummary.cs}` | Delete retired EF entities. |
| `api/src/RecipeApi.Tests/Integration/SchemaIntegrityTests.cs` | Replace retired-schema expectations with absence/model-mapping assertions. |
| `api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs` | Remove only legacy persistence-property seeds so Find Similar still tests current facts. |
| `api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs` | Remove only eliminated persistence-property setup/assertions; its legacy JSON compatibility coverage remains T2-owned. |
| retired isolated verifier | Former real-PostgreSQL dry-plan, populated-upgrade, retained-fact, and clean-chain fixture; its observed result is preserved in this record. |
| `t3-schema-evidence.md` | T3-only evidence, scope review, and rollback boundary. |

Prepared content identity: `22da6830239cfc852d8773ea08b18195a767be2f139c3cbb15666f56929d8091`.
`git diff --check` passed after preparation. The previous ledger entry for
`task agent:prepare` is superseded by this passed preparation result; the
single completion entrypoint remains not-run.
