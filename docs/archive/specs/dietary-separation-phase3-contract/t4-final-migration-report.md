# Phase 3 final migration report

> **Archived — historical evidence only.** This completed report is retained
> for context and does not authorize further Phase 3 work.

**Spec:** `dietary-separation-phase3-contract`  
**Date:** 2026-09-25 (America/Toronto)  
**Scope:** T4 audit, active-documentation boundary, archive handling, and
evidence accounting. No external dietary agent is designed or connected.

## Decision and boundary

The user policy supports **no older API or PWA client**. Retired public fields
were removed immediately; there is no compatibility layer or sunset.

WFS retains recipes, ingredients, cuisine, meal types, vegetarian
classification, schedules, grocery state, preferences, and source/raw recipe
metadata. Nutritional and dietetic interpretation is external to WFS.

## Removed storage and code

- Tables: `health_events`, `health_recipe_profiles`, and
  `health_week_summaries`, including table-owned dependencies.
- Columns: `recipes.is_healthy_choice`, `recipes.dietary_profile`, and
  `weekly_plans.balance_summary`.
- Retired projections from `vw_discovery_recipes`, EF entities/mappings, the
  orphan `api/src/RecipeApi/Services/FopThresholds.cs` helper, and the retired
  public-contract/client/PWA consumer seam.

`recipes.is_vegetarian` and its classifier version/timestamp/failure metadata
remain. T4 also removed the direct stale PostgreSQL test-seed column and the
orphan PWA “Healthy Choice” locale label.

## Upgrade, rollback, and compatibility evidence

T3's detailed evidence is [t3-schema-evidence.md](t3-schema-evidence.md).
The operator inspected the actual migration image:

```sh
docker run --rm --entrypoint /usr/local/bin/sqldef \
  whats-for-supper-db-migration:latest --help
```

Observed: `sqldef v3.11.23` documents `--enable-drop`; deployed migration
configuration passes that option. The retired verifier used a unique no-port
disposable Docker cluster and the supported
pre-Phase-3 snapshot `b21beba266144668ded790bbdb9db3a7f5376fc6`
(`schema.sql` SHA-256
`6edfd3241cb4bde79354e0c1ca62abfb1a2dc52ecd5224261b2ac4d9e11cd6c7`). Its
`--enable-drop --dry-run` plan contained only discovery-view recreation, the
three retired tables, and the three retired columns. It did not list a
retained core store, vegetarian field, or classifier metadata.

The populated upgrade and independent clean chain both completed the same
migration-image path. Each reported all eight absence/retained-fact checks as
`ok` and `overall=ok`, then ended:

```text
Phase 3 isolated populated upgrade and clean-chain verification passed.
```

This is isolated-fixture proof, not a live deployment/database claim.

The forward migration is irreversible. A downgrade can recreate empty
structures but cannot reconstruct discarded health events, profiles, weekly
summaries, FOP values, dietary profiles, healthy-choice values, or balance
summaries. A pre-upgrade backup is needed to recover those retired facts and
is outside the supported Phase 3 model.

## Backup, reindex, and retained behavior

`ManagementService` ignores retired keys on restore and does not emit them in
new backups. Focused legacy/current backup and search-sidecar tests preserve
recipe/ingredient/cuisine/meal-type/vegetarian, schedule, and grocery facts
without rehydrating retired fields. Search-document tests retain deterministic
current WFS metadata and confirmed vegetarian indexing; PostgreSQL lexical
search retains the current-schema trigram-index seed.

## Final ghost-search ledger

The audit searched `api`, `pwa`, `specs`, `docs`, and `.kiro` for the removal
vocabulary, excluding `docs/archive/**`, dependencies, build output, and
coverage output. Exact-token follow-up searches excluded incidental `InfoPath`
and package-lock text.

| Classification | Paths and rationale |
| --- | --- |
| retained migration history | Selected Phase 3 requirements/design/tasks and T0/T3/T4 evidence; `api/database/compatibility.sql` is forward-only destructive upgrade history. |
| explicitly evaluated legacy-backup compatibility | `ManagementService`, its tests, `SearchIndexBackupRestoreTests`, and the former pre-Phase-3 fixture seed/absence assertions. They tolerate old artifacts without restoring them. |
| REMOVE (negative removal assertions, not consumers) | `SchemaIntegrityTests`, `RecipeSearchDocumentBuilderTests`, and `RecipeShareIntegrationTests` name former keys only to assert their absence; none is a reader, writer, API, schema, or public-client contract. |
| archived documentation | 20 former active Kiro documents and 3 current-facing retired flow/technical documents now reside under `docs/archive/specs/dietary-separation-retired-health-model/`, each with a historical-reference notice. |
| zombie | **None.** `FopThresholds.cs`, the stale lexical seed field, and locale residue are removed. |

There is no active API, DTO, runtime reader/writer, OpenAPI, generated client,
PWA state/view, workflow/DI, or persistence-model retired contract.

## Documentation and archive result

`docs/architecture.md` now states the WFS/external-dietary boundary. Phase 1,
backup/readiness/search/week flow material retains only current vegetarian,
planning, grocery, and backup behavior. Retired dietary-classification,
balance-indicator, and technical categorization documents moved to the archive
with former Kiro proposals. Archive placement does not revalidate historical
commands or checkboxes.

## Verification ledger

| Evidence | Status | Boundary |
| --- | --- | --- |
| T0 non-waived preflight/manifest | passed | Static source evidence and no-backward-compatibility policy; see T0 packet. |
| T0 Phase 2 deployment/backfill/runtime identity/live/database record | waived, not passed | Explicit user exception for T0 only. |
| T1/T2 contract/client/API/PWA/search/planner/grocery/backup work | passed | Accepted task evidence; static/mocked checks do not prove a live endpoint. |
| T3 image help, dry plan, populated upgrade, clean chain | passed | Operator-run isolated PostgreSQL fixture. |
| Supplied `task agent:finish` record before T4 edits | passed checks; two blocked slots | Identity `2589d805611af312bfc11eab1db59758c93643447d3af3e4e9fbc78625c658a1`; docs, harness, lint, PWA format/type/unit, impact, API, and static contract checks passed. Endpoint drift was blocked; generic DB behavior was blocked by the harness but has the separate T3 fixture proof. |
| Post-T4 local completion checks | passed except generic database slot | `task agent:finish` at identity `a4aeb34bf54b20c0ee13db2c299de6f4c6301502424c13f9668dd7b73d93fa1f`: documentation, agent tests, lint, PWA format/type/unit, impact, API, and static contract checks passed. The harness left its generic database-behavior slot blocked. |
| Live endpoint drift | passed | Operator started the API under Development, then ran `GENERATED_API_URL=http://127.0.0.1:9001/openapi/v1.json task agent:drift:endpoints`; Tier 0 reported `All endpoints match`. This proves live OpenAPI endpoint parity only. |
| Task-specific database behavior | passed | T3's operator-run isolated populated-upgrade and clean-chain PostgreSQL fixture is the required database evidence. The generic finish slot remains blocked and is not presented as production/live database behavior. |

## Baseline, scope, and completion condition

T4 baseline: `/private/tmp/wfs-phase3-t4-baseline.cm7B6T`; HEAD:
`b21beba266144668ded790bbdb9db3a7f5376fc6`. It already contained T0–T3,
harness, and capture-test changes. T4 adds only this report, narrow active-doc
updates, archival handling, and direct retired-token cleanup in a test seed and
locale. It adds no API, schema, generated client, deployment, reset, or
external-agent behavior.

The ghost audit and documentation acceptance are resolved. The post-T4 finish
record captures identity
`a4aeb34bf54b20c0ee13db2c299de6f4c6301502424c13f9668dd7b73d93fa1f`, and
the subsequent operator-supplied live endpoint check passed at the local API.
The generic database slot in the finish record remains blocked by harness
design; T3's separate isolated populated/clean PostgreSQL qualification is the
task-specific database evidence. This report makes no production deployment or
production database-behavior claim.
