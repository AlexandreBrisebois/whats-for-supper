# T0 preflight and removal-vocabulary manifest

> **Archived — historical evidence only.** Decisions and commands below record
> the completed Phase 3 work and are not current authorization.

**Date:** 2026-09-25 (America/Toronto)  
**Task:** `dietary-separation-phase3-contract` / Task 0  
**Decision:** **NO-GO — T1, T2, and T3 are not authorized.**

This is an audit-only record. Static inspection, mocked PWA tests, and in-memory
API tests do not qualify a live API, deployed client, workflow, or populated DB.

## Baseline and scope

Controller baseline: `/private/tmp/wfs-phase3-t0-baseline.6MGT3f`.

| Check | Observed result | Status |
| --- | --- | --- |
| `git rev-parse HEAD` | `b21beba266144668ded790bbdb9db3a7f5376fc6`, equal to baseline | passed |
| Pre-write status | Only the three pre-existing Phase 3 specification corrections were modified | passed |
| Pre-write SHA-256 | `design.md` `f882ad…4678`; `requirements.md` `b2b0fa…39a7`; `tasks.md` `dc9330…5b`; each equals baseline | passed |
| Baseline ownership | Baseline staged/untracked lists empty; `tracked.patch` contains only the three accepted corrections | passed |
| T0 effects | This evidence file only; no application/schema/OpenAPI/generated/deployment file changed | passed |

## R1 preflight

| Required condition | Actual evidence | Status |
| --- | --- | --- |
| Phase 1 implementation | `docs/dietary-separation-phase1.md`, `Recipe.IsVegetarian`, classification writer/processors, and their tests exist | static-only |
| Phase 2 completion | No Phase-2 completion/acceptance record found. `FindSimilar_UsesCurrentRecipeFacts_NotLegacyDietaryProfile` is a current-code test only. | blocked |
| Accepted vegetarian backfill | Backfill/status processor tests exist; no live workflow-status counts or accepted coverage record exists | blocked |
| Supported-client policy/sunset | No supported-client identities, versions, compatibility decision, or dated sunset found | blocked |
| Health worker/event/profile/FOP/balance writers | `Program.cs` registers no health worker/event publisher/computation service; remaining schema/EF mappings are listed as removal owners | static-only |
| Search/planner/grocery readers | Exact-vocabulary scan has no hits in current public search/schedule/grocery/PWA consumer code | static-only |
| Semantic search and Find Similar | API regression passed, but PostgreSQL lexical/semantic tests skipped | blocked for database proof |
| Planner and grocery | API regression and selected PWA suites passed | passed regression; PWA mocked only |
| Backup/restore | Current omission and legacy unknown-field-tolerance tests passed | passed regression; blocked final-schema proof |
| Live endpoint parity | `task agent:drift:endpoints` could not reach `127.0.0.1:5001/openapi/v1.json` (`Operation not permitted`) | blocked |

Any blocked R1 condition is terminal. The zombie findings below independently fail
the gate.

## Commands and results

| Command | Scope / result | Status |
| --- | --- | --- |
| `task test:api` | .NET 11 preview; 679 passed, 0 failed, 22 skipped, 701 total. Includes current search/Find Similar, planner/grocery, and management backup tests. PostgreSQL lexical/semantic tests were skipped. | passed, with DB limitation |
| `task test:e2e -- e2e/recipes.spec.ts e2e/planner.spec.ts e2e/grocery.spec.ts` | Local PWA server and route mocks; 28 passed, 1 skipped. Includes Find Similar at `recipes.spec.ts:497`. | passed, mocked boundary only |
| `task agent:drift:endpoints` | Live OpenAPI unavailable; target exited 2. | blocked |
| `task gen:client:check` | Kiota 1.35.0 temporary generation exceeded 20 seconds; exit 124; no retry. | blocked |
| `task typecheck` | `tsc --noEmit` exit 0. | passed |

The API run is not populated supported-Postgres evidence. The PWA run mocks API
routes, so it is not live runtime evidence.

## Static source trace

`specs/openapi.yaml` and handwritten PWA source have no exact retired public
contract hit. Kiota freshness is blocked. `ManagementService` serializes
`RecipeInfo`, which omits retired values; `ManagementServiceTests` exercises both
omission and unknown-field tolerance. `schema.sql`, `RecipeDbContext`, `Recipe`,
`DiscoveryRecipe`, and the health entities retain physical mapping ownership for
T3. The Find Similar integration test deliberately seeds a legacy profile to prove
search uses current recipe facts.

---

## Retry audit addendum — controller-gated independent review

**Date:** 2026-09-25 (America/Toronto)  
**Retry task:** `dietary-separation-phase3-contract` / Task 0  
**Decision:** **NO-GO — stop. T1, T2, and T3 remain unauthorized.**

### Provenance and retry baseline

This addendum was written by the retry audit owner. The preceding 4,258-byte
document was an untrusted partial artifact from a failed prior agent; it is
preserved verbatim above and is not claimed as fresh evidence by this retry.

| Item | Observed result | Status |
| --- | --- | --- |
| Retry baseline | `/private/tmp/wfs-phase3-t0-retry-baseline.bxmqSd`; HEAD `b21beba266144668ded790bbdb9db3a7f5376fc6` | passed |
| Pre-existing tracked work | Only approved corrections to `requirements.md`, `design.md`, and `tasks.md`; baseline SHA-256 values respectively `b2b0fa8f0a8f737cc725e7d2ffb3e14916b004cede8b2f21b2a82fa90b1c39a7`, `f882ad4469c862def018b1f1703fd5a79a414f74d80cf6a019e98fa82de04678`, and `dc9330a49636a78a4959d92275672a4f87afa78bf8d838016b66ec26da621b5b` | passed |
| Failed-agent artifact before retry edit | Untracked `t0-preflight-evidence.md`; SHA-256 `3e345f35160d69b384e8827bd258958e2eed33236a4650f705ecca88a9c3546a` | preserved and attributed |
| Retry-owned change | This addendum only, appended to that pre-existing artifact | passed |
| `git diff --check` before retry edit | Exit 0 | passed |

### R1 hard-gate ledger

Only the checks below were performed by this retry. Earlier artifact assertions
are historical claims, not rerun evidence. The static checks establish only the
inspected source properties; they do not prove deployed runtime, live endpoint,
workflow, populated database, or supported-client behavior.

| Hard condition | Fresh evidence | Status |
| --- | --- | --- |
| Phase 1 complete | `HANDOVER.md` records a Phase 1 checkpoint and `docs/dietary-separation-phase1.md` describes the intended workflow, but the checkpoint itself says live migration evidence remains blocked | blocked |
| Phase 2 ready and accepted | No dietary-separation Phase 2 task package, acceptance record, or completion evidence was found. The only similarly named package is unrelated `cnf/dietitian-agent-phase2`. | blocked |
| Accepted vegetarian backfill coverage | Phase 1 documentation prescribes a live `vegetarian-classification-status` result; no dated live counts, acceptance threshold, or approval record was found | blocked |
| Supported-client policy | `DEPLOY.md` describes a single household PWA deployment but names no supported versions/identities, compatibility decision, or dated public-field sunset; no policy record was found by repository scan | blocked |
| Zero live search/planner/grocery reader and health worker/event/profile/FOP/balance writer | Static scan found no controller/service/DTO/Program reference to the retired model names other than orphan `FopThresholds`; physical DbContext/model/schema mappings remain. No live process, event stream, or database inspection was available. | blocked |
| Semantic search regression | No retry-run semantic regression against a supported live/PostgreSQL identity | not-run (terminal gate already blocked) |
| Find Similar regression | No retry-run Find Similar regression against a supported live identity | not-run (terminal gate already blocked) |
| Planner regression | No retry-run planner regression against a supported live identity | not-run (terminal gate already blocked) |
| Grocery regression | No retry-run grocery regression against a supported live identity | not-run (terminal gate already blocked) |
| Backup/restore regression | Static inspection finds `ManagementService` serializes `RecipeInfo` and tests exercise unknown-field tolerance, but no retry-run current/legacy restore against final schema exists; `weekly-plans.json` is separately serialized from `WeeklyPlan` | blocked |
| Live endpoint / supported-environment identity | No deployed URL, client identity, isolated runner, or populated database was supplied or discoverable | blocked |

### Source trace and vocabulary manifest

Static traversal was: public contract `specs/openapi.yaml` → controller/service/DTO
and `Program.cs` → persistence `RecipeDbContext`, `Recipe`, `DiscoveryRecipe`,
health entities and `api/database/schema.sql` → PWA source/generated client →
`ManagementService`/`RecipeInfo` and `search.index.json` sidecar → active tests
and active `docs/flows`. `specs/openapi.yaml`, `pwa/src`, and the generated client
had no vocabulary hit. The exact active-root scan returned 21 files. Every hit is
classified below; none is silently treated as runtime proof.

| Classification | Files / rationale | Count |
| --- | --- | --- |
| REMOVE — physical schema/persistence | `api/database/schema.sql`; `api/src/RecipeApi/Data/RecipeDbContext.cs`; `api/src/RecipeApi/Models/Recipe.cs`; `DiscoveryRecipe.cs`; `HealthEvent.cs`; `HealthRecipeProfile.cs`; `HealthWeekSummary.cs` retain retired columns, tables, view projection, or mappings reserved for T3 | 7 |
| REMOVE — orphan retired helper | `api/src/RecipeApi/Services/FopThresholds.cs` declares retired FOP constants; source scan found no consumer. It is an active source zombie until removed/classified in a later authorized task. | 1 |
| REMOVE — active tests coupled to pre-removal storage | `RecipeLexicalSearchPostgresTests.cs`; `RecipeSearchIntegrationTests.cs`; `SchemaIntegrityTests.cs` seed/assert legacy storage or mappings and must be replaced/removed under the owning later slice | 3 |
| Explicitly evaluated legacy-backup compatibility | `ManagementServiceTests.cs` supplies unknown retired recipe fields and asserts restored health values stay absent; this is source/test evidence only, not a final-schema restore proof | 1 |
| REMOVE — retained-behavior tests containing retired terms | `RecipeSearchDocumentBuilderTests.cs`; `RecipeShareIntegrationTests.cs` assert output omits retired values. Their assertions must be retained or rewritten after removal; the vocabulary occurrences themselves are not a live contract. | 2 |
| REMOVE — active documentation | `docs/dietary-separation-phase1.md`; `docs/flows/data-flows/backup-restore-readiness.md`; `dietary-classification.md`; `recipe-readiness.md`; `recipe-search-index-and-recovery.md`; `week-lifecycle.md`; `docs/flows/user-flows/balance-indicator.md` describe the retired contract and are active, not archived. They require later authorized update/archive handling. | 7 |
| Retained migration history | None found in the active-root scan | 0 |
| Archived documentation | Excluded from the active-root scan by `docs/archive/**`; no archived hit was used as evidence of current behavior | 0 in manifest |
| Zombie / unexplained active hit | `FopThresholds.cs` is an unreferenced active helper. Its presence is a zombie finding. The active documents are classified REMOVE rather than unexplained because they directly describe the explicitly retired system. | 1 |

The manifest count is 21 files (the FOP helper is deliberately shown both as a
REMOVE target and the one zombie finding; it is counted once in the total).
That zombie independently makes the R1 decision NO-GO.

### Commands actually run by this retry

| Command | Result / scope | Status |
| --- | --- | --- |
| `git rev-parse HEAD`; inspect retry-baseline `head`, `status-short`, `untracked-paths`, and `phase3-spec-sha256` | HEAD and baseline content matched the controller-provided retry baseline; prior artifact identified as untracked | passed |
| `shasum -a 256` on the historical pre-archive `.kiro` path before editing | `3e345f35160d69b384e8827bd258958e2eed33236a4650f705ecca88a9c3546a` | passed |
| `rg -n -i ... api pwa specs docs` with `docs/archive`, build output, dependencies, and coverage excluded | 21 active files matched the stated removal vocabulary; classifications recorded above | passed (static only) |
| `rg -n -i 'HealthWorker|HealthComputationService|HealthEventPublisher|IHealthEvent|ClassifyDietaryProfile|WeeklyBalanceScorer|FopThresholds|RecipeDietaryProfile|WeeklyBalanceSummary' api/src pwa/src specs/openapi.yaml` | Only `FopThresholds.cs` matched in active source; no proof of a running process or database state | passed (static only) |
| Repository scan for `supported client`, `client support`, `sunset`, and related policy language | No supported-client policy/sunset record found | passed discovery; policy condition blocked |
| `git diff --check` before retry edit | Exit 0 | passed |
| Taskfile target inspection (`test:api`, `test:e2e`, `gen:client:check`, `typecheck`, `agent:drift:endpoints`) | Identified the available targets and that E2E requires a running PWA; inspection is not test execution | passed |

No application, schema, OpenAPI, generated-client, deployment, test, or migration
command was run by this retry after the first terminal hard-gate findings. This
avoids presenting unavailable live/regression proof as passed. `task agent:prepare`
and `task agent:finish` were not run, as authorized.

### Blockers and exact next action

1. Record an approved supported-client policy: client identities/versions in scope,
   whether removal is permitted, and a dated compatibility sunset if any client
   remains supported.
2. Produce a Phase 2 completion/acceptance record and a dated accepted live
   vegetarian-backfill status result with its threshold and environment identity.
3. On a designated supported, isolated environment, capture actual passing
   semantic search, Find Similar, planner, grocery, and current/legacy backup
   restore regressions; identify the deployed API/PWA/database and the runner.
4. Resolve or remove the `FopThresholds.cs` zombie and classify all current active
   documentation in an authorized later slice. Re-audit after those changes.

Until all four are evidenced as passed, Task 0 is **NO-GO**. This report does not
authorize Task 1, Task 2, Task 3, or any destructive action.

---

## Waiver re-audit — approved policy amendment

**Date:** 2026-09-25 (America/Toronto)  
**Audit task:** `dietary-separation-phase3-contract` / Task 0  
**Decision:** **GO on the amended, non-waived T0 gate.**

This entry is the sole fresh assessment in this addendum. The two earlier
NO-GO entries remain preserved above as historical audit attempts; their
blocked deployed/live/database and supported-client findings are superseded
only to the precise extent of the approved policy recorded here.

### Approved policy and evidence boundary

The user expressly decided: **“phase 2 is deployed, we will forego the
deployed evidence and database”** and **“phase 3 goes forward with no backward
compatibility.”** The current approved Phase 3 contract records the resulting
policy: Phase 2 deployment is accepted; no older API or PWA client is
supported; public retired-health fields may be removed immediately; no
compatibility layer or sunset is required.

Accordingly, the following are **waived, not passed**, for this T0 preflight
only: separately collected Phase 2 deployment proof, accepted vegetarian-
backfill coverage, supported runtime/client identity, and deployed/live or
database regression evidence. This does not waive T1--T4 checks, T3's
destructive-migration safeguards, or R6 populated-upgrade/clean-chain proof.

### Amended R1 condition ledger

| Non-waived T0 condition | Evidence and boundary | Status |
| --- | --- | --- |
| Phase 1 repository readiness | `docs/dietary-separation-phase1.md` defines the WFS-owned vegetarian fact and workflow. `Program.cs` registers classification policy/writer and classify/backfill/status processors; workflow definitions and focused processor/policy/writer tests are present. This establishes repository-source readiness only. | passed (static source evidence) |
| Phase 2 deployment | User decision accepts Phase 2 deployment; no separately collected deployment record was required for this re-audit. | waived (not passed) |
| Accepted vegetarian-backfill coverage | The live status/count acceptance record is not collected in this packet under the approved exception. | waived (not passed) |
| Supported runtime/client identity | No older API or PWA client is supported by explicit user policy; no supported-version inventory or sunset is required. | waived (identity evidence); passed (no-backward-compatibility policy) |
| Deployed/live endpoint and database regression record | No live endpoint, workflow, populated-database, or database regression result is claimed. | waived (not passed) |
| Removal-vocabulary accounting | Complete 45-file static manifest below; each hit has a permitted classification and a named later owner where removal is required. | passed (static source evidence) |
| Unexplained hit or unowned zombie | None. `FopThresholds.cs` is a `REMOVE` target with the explicit T1 owner in the approved design and tasks, not an unowned zombie. | passed |

Static inspection does not establish runtime, deployment, live endpoint, event
stream, workflow execution, client freshness, or database behavior. Those
properties are either expressly waived above for T0 only or remain required by
their owning later task; none is relabeled passed.

### Complete removal-vocabulary manifest

The static scan covered `api`, `pwa`, `specs`, `docs`, and `.kiro`, excluding
`docs/archive/**`, build output, dependencies, and coverage output. It found
45 files. `pwa/src`, `pwa/src/lib/api/generated`, `specs/openapi.yaml`, API
controllers/DTOs/workflows, and active API services had no retired-contract
hit except the named `FopThresholds.cs` helper. Physical persistence mappings
are deliberately still present and owned by T3.

| Classification and later owner | Files / rationale | Count |
| --- | --- | --- |
| REMOVE — T1 public-consumer cutover | `api/src/RecipeApi/Services/FopThresholds.cs` (explicit T1 target; no source consumer found); `Integration/RecipeSearchIntegrationTests.cs` and `Integration/RecipeShareIntegrationTests.cs` (retired-contract fixtures/assertions to remove or rewrite with the cutover) | 3 |
| REMOVE — T2 recovery/search proof | `Services/RecipeSearchDocumentBuilderTests.cs` contains a retired-field omission assertion; T2 owns final search-document recovery proof and must retain/rewrite the behavior without the retired vocabulary. | 1 |
| REMOVE — T3 physical schema/persistence | `api/database/schema.sql`; `Data/RecipeDbContext.cs`; `Models/Recipe.cs`, `DiscoveryRecipe.cs`, `HealthEvent.cs`, `HealthRecipeProfile.cs`, `HealthWeekSummary.cs`; `Integration/SchemaIntegrityTests.cs`. These retain retired tables, columns, view projection, mappings, or physical-schema assertions. | 8 |
| Explicitly evaluated legacy-backup compatibility — T2 | `Services/ManagementServiceTests.cs` supplies old retired recipe/weekly-plan fields and asserts unknown-field tolerance and omission. It is retained only as a T2 legacy-backup compatibility test, then must be revalidated against the final schema. | 1 |
| REMOVE — T4 active documentation cleanup | `api/docs/DIETARY_CATEGORIZATION.md`; `docs/dietary-separation-phase1.md`; six active flow documents: `backup-restore-readiness.md`, `dietary-classification.md`, `recipe-readiness.md`, `recipe-search-index-and-recovery.md`, `week-lifecycle.md`, and `balance-indicator.md`. These must be updated/removed so active guidance retains WFS-owned facts but no retired contract. | 8 |
| REMOVE — T4 active historical-spec cleanup | 20 active `.kiro` documents: the 18 files under `cnf/{cnf-data-ingestion,cnf-health-orchestration,cnf-search-augmentation,dietitian-agent-phase2,family-health-profiles}`, `.kiro/specs/diet-agent/01_diet_agent_inference.md`, and `.kiro/specs/health/implementation-map.md`. They are outside the repository's archived-spec paths and therefore require authorized T4 removal/update/archive handling, rather than being silently treated as archive history. | 20 |
| Retained migration history / current migration contract | This packet plus `requirements.md`, `design.md`, and `tasks.md` in this selected Phase 3 package. Their references document the removal and its gate; they are retained as the reviewable migration record. | 4 |

**Counters:** 45 total = 40 `REMOVE` (T1 3, T2 1, T3 8, T4 28) + 1
explicitly evaluated legacy-backup compatibility + 4 retained migration records.
There are 0 retained pre-existing migration-history hits outside the selected
Phase 3 contract, 0 archived-documentation hits in the scanned active roots,
0 unexplained hits, and 0 unowned zombies.

### Commands and observed results

| Command / inspection | Result | Status |
| --- | --- | --- |
| `rg -l -i <removal-vocabulary> api pwa specs docs .kiro` with archive/build/dependency exclusions | 45 classified files; manifest above. | passed (static only) |
| `rg -l 'VegetarianClassificationOptions|...|VegetarianClassificationStatusProcessor' api/src/RecipeApi/{Program.cs,Services,Workflows,Tests}` | Phase 1 policy, writer, all three processors, workflows, and focused test files present. | passed (static only) |
| `rg -n -i <retired-vocabulary> specs/openapi.yaml pwa/src pwa/src/lib/api/generated api/src/RecipeApi/{Controllers,Dto,Services,Program.cs,Workflows}` | Only `FopThresholds.cs` matched; no static public-contract/consumer match. | passed (static only) |
| `rg -n 'FopThresholds' api pwa specs .kiro` | No active source consumer; only the helper and its explicit Phase 3 T1 ownership/older spec references matched. | passed (static only) |
| Supported-client policy scan | No contrary supported older-client policy found; current approved Phase 3 requirements/tasks record immediate removal. | passed |
| `git diff --check` before this append | Exit 0. | passed |
| Focused API/PWA/live/database regression commands | Not run by this audit-only re-audit; their relevant deployed/live/database T0 evidence is waived, while T1--T4 checks remain due. | not-run / waived only where stated above |
| `task agent:prepare`; `task agent:finish` | Not run; audit/evidence-only scope does not authorize them. | not-applicable |

### Baseline, scope review, and next controller action

Controller baseline: `/private/tmp/wfs-phase3-t0-waiver-baseline.KFf0CZ`, HEAD
`b21beba266144668ded790bbdb9db3a7f5376fc6`. Before this append, the baseline
hashes matched the three pre-existing selected specs and the pre-existing
untracked evidence packet was
`252285add7edcfed02d151a55fa37c5389505ad24375b848bbdaa7e56a8077b6`.
This waiver re-audit owns only this appended addendum in that evidence file;
the three modified specs and all preceding evidence text remain pre-existing.
No application, schema, OpenAPI, generated-client, test, deployment, reset, or
destructive change was made.

The amended T0 non-waived gate is **GO**. This packet supplies evidence for the
controller's sequential decision only; it does not itself authorize T1. If the
controller dispatches T1, its owner must capture a fresh implementation
baseline and perform the stated contract/client/test checks. T2--T4 remain
dependent on their own specified evidence.
