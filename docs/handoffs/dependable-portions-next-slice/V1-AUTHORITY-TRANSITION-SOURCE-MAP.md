# Authority-transition source and dependency map

Inspected at `f38d92677e2fd1dcaca16779de6958aa8d258eab`. This is source evidence,
not executed transition behavior. The [contract](V1-AUTHORITY-TRANSITION-CONTRACT.md)
owns the prospective requirements. Independently retained trace:
`.task/v1-authority-transition-20261115/source-review/investigation.json`.

| Ordered seam / existing owner | Present source behavior | Bounded implementation dependency |
| --- | --- | --- |
| [V1MigrationPrewritePolicy](../../../api/src/RecipeApi/Services/V1MigrationPrewritePolicy.cs) | Pins original all221 request and raw predecessor identities. | Preserve it and its request; successor has a distinct finite request. |
| [RecoverySnapshotService.V1MigrationPrewrite](../../../api/src/RecipeApi/Services/RecoverySnapshotService.V1MigrationPrewrite.cs) | Capture/read-back/pre-write use closed four-file observation, source/coverage reconstruction, exact hold delta, final source then retained bytes, rollback. | Reuse validation/retention owners, not this result as write permission. |
| [RecoverySnapshotService.OpenAsync](../../../api/src/RecipeApi/Services/RecoverySnapshotService.cs), [V1Snapshot reconstruction](../../../api/src/RecipeApi/Services/RecoverySnapshotService.V1Snapshot.cs), [V1ExactSourceAdmission](../../../api/src/RecipeApi/Services/V1ExactSourceAdmission.cs), [schema owner](../../../api/src/RecipeApi/Services/V1ExactSourceAdmission.Schema.cs) | Own connection string, complete source graph and exact original protected facts. Fixed46 membership; original_request text and PostgreSQL result::text hashes. | Separate source graph at unchanged v4 logical DB/roots from execution graph; fresh re-admission and qualified schema lineage every invocation. |
| [V1RecoveryHistoryContext](../../../api/src/RecipeApi/Services/V1RecoveryHistoryContext.cs), [V1MigrationSource](../../../api/src/RecipeApi/Services/V1MigrationSource.cs) | Original snapshot context fixed; migration source captures specific DbContext/roots/transaction and revokes on dispose. | Never widen original membership or carry pre-write context across rollback. Distinct finite typed stage authority, freshly bound per transaction. |
| [MigrationInventory](../../../api/src/RecipeApi/Services/CanonicalRecipeContentStore.MigrationInventory.cs), [Manifest](../../../api/src/RecipeApi/Services/CanonicalRecipeMigrationManifest.cs) | Complete physical keyed tables, file descriptors, selected recipes and every stored/assignment week; recipes array follows request.Selected. | Existing owner produces a new all221 read-only corpus observation plus separate selected1 execution inventory from the same A baseline. Both are independently bound. |
| [MigrationAdmission](../../../api/src/RecipeApi/Services/CanonicalRecipeContentStore.MigrationAdmission.cs) | Checks source, complete baseline, files, selected outputs and typed history; allows later week/prune/search differences in batch mode. | Retain checks, add finite B/C partition/delta; prohibit its broader week/prune/search-insertion allowances for this tracer. |
| [MigrationExecution](../../../api/src/RecipeApi/Services/CanonicalRecipeContentStore.MigrationExecution.cs) | Any deferred selected status returns before writes; preflight, plan, selected conversions, every week rebuild. | Extract a real internal stage using existing owners and return before weeks. Full ExecuteMigrationAsync is not an eligible tracer invocation. |
| [CanonicalRecipeContentStore converter](../../../api/src/RecipeApi/Services/CanonicalRecipeContentStore.cs) | ConvertCoreAsync: replay, capture vocabulary, recipe/supper lock, replay/guards/evidence, pure line/instruction preparation, mapping, V2 recording, search invalidation, final admission, commit. | One preparation/commit seam for eligibility, frozen candidate and actual commit; no duplicate conversion rules. Internal migration defers grocery refresh; public behavior stays strict. |
| [V2 receipt producer/validator](../../../api/src/RecipeApi/Services/CanonicalRecipeContentStore.Vocabulary.cs), [historical validator](../../../api/src/RecipeApi/Services/CanonicalRecipeContentStore.Attestation.cs) | RecordV2 captures baseline/prior evidence/authority; strict V2 reconstructs using recorded generated IDs/revisions. Historical validator is bounded to attested members. | Dispatch fixed46 versus exact new V2 pair before validation. Independent producer/time/raw PG witnesses constrain the new row; no journal self-authorization. |
| [FoodVocabularyStore](../../../api/src/RecipeApi/Services/FoodVocabularyStore.cs), [inventory](../../../api/src/RecipeApi/Services/FoodVocabularyStore.Inventory.cs), [recovery](../../../api/src/RecipeApi/Services/FoodVocabularyStore.Recovery.cs) | CaptureAuthority→CaptureActive→RequireUnreferencedAbsence→complete typed references; retained-absence uses strict history parsing. | Thread finite context through these actual paths; pre-write bypass of them proves nothing about conversion. Absence is validated over complete closure. |
| [Inventory qualification](../../../api/src/RecipeApi/Services/FoodVocabularyInventoryQualification.cs), [history qualification](../../../api/src/RecipeApi/Services/FoodVocabularyInventory.Serialization.cs) | Uniqueness plus typed recipe/canonical/publication/workflow/repair/physical/maintenance/journal/override owners; attested branch enforces fixed membership. | Exact original subset unchanged, new pair strict V2, plan typed, all remaining reference owners ordinary. No filtering out historical facts or persisting a larger original context. |
| [FoodMappingQualification](../../../api/src/RecipeApi/Services/FoodMappingQualification.cs), [SupperIngredientProjection](../../../api/src/RecipeApi/Services/SupperIngredientProjection.cs) | No active vocabulary yields unchanged export/null evidence/no decisions; no trusted supply means literal description with no inferred numeric amount. | Selected candidate must keep SQL NULL evidence, no mappings; no AI, translation, vocabulary adoption or speculative package parsing. |
| [Migration receipt](../../../api/src/RecipeApi/Services/CanonicalRecipeMigrationReceipt.cs), [maintenance lifecycle](../../../api/src/RecipeApi/Services/MaintenanceCommandLifecycle.MigrationReceipt.cs) | Ordinary inert plan exact recipe set and complete week IDs; live/retained typed lookup/metadata/closure. | One exact plan only; no week receipt and no pruning. Preserve timestamp/request raw projections beyond existing weaker RequireBinding hash comparison. |
| [Maintenance boundary](../../../api/src/RecipeApi/Services/RecoveryBoundary.Maintenance.cs), [lease boundary](../../../api/src/RecipeApi/Services/RecoveryBoundary.cs) | Actual244005 operator advisory session, bound root/connection/hold, actual assembly digest, revocable AsyncLocal capability and leases. | No fake callback capability. Keep real maintenance+Write across stages, revalidate at writes/commit; new process reacquires. No source Snapshot nesting beneath execution Write graph. |
| [RecipeRotation](../../../api/src/RecipeApi/Services/RecipeRotation.cs), [SupperServingsService.BeginAsync](../../../api/src/RecipeApi/Services/SupperServingsService.cs) | Converter starts its own transaction; leading SHARE ROW EXCLUSIVE input locks then recipe row. | No outer pre-write transaction; extend in-place protected-union locking/finite transaction binding compatibly. Each stage locks itself. Between-stage divergence rejects. |
| [Grocery migration](../../../api/src/RecipeApi/Services/GroceryRecomputeService.Migration.cs) | Complete later per-week transaction/reset/receipt path. | Must never be invoked in this tracer; preserved36week accounting is not permission to rebuild. |

## Selected prospective input

Identity is `7d4c50f3-a3b9-412d-8e8b-940809b9553e`; title “Kraft Dinner with
Broccoli” is display context only. The [planning envelope](V1-AUTHORITY-TRANSITION-CONTRACT.json)
pins its retained disk and DB recovery-row byte hashes and delivered content/source
revision/original-fields hashes. The retained package table is
`.task/v1-full-snapshot-implementation/final-linux-package/staged-snapshot/tables/recipes.json`,
SHA256 `56c191bf8f595120a326dd26db88568ec79c29c659dbfbf38f78098fc2b5948c`.
It has an active row, null canonical_content/mapping evidence, servings2,
five current literal ingredient strings, raw supply null, two supported instruction
sections with three text steps each, and an existing search row in the inventory.
The old selection operation `a420929b-590d-423a-94db-f978f8f280db` is historical;
allocate a fresh successor operation, explicitly bound before observation.

Representative source fact: `1/4 cup milk` has no independently trusted supply
amount in this row. Existing projection/conversion preserves that entire literal
as Description, with Amount/AmountText/Unit/Package and food IDs null; it does not
infer a numeric quarter cup. Exact Render must reproduce the string. Other four
strings and all six instruction texts must retain order and wording. This is an
expected source-derived example, not a converter execution or certified eligibility.

Fresh A must match every source-bound fact/hash and existing search-row identity;
then the actual converter/codec/mapping eligibility test must pass before B.
Retired/conflicting/unsupported inputs defer without persistent writes. Do not
replace the selected recipe by title, relax conversion or infer losslessness from
requires-forward-assessment. All other220 recipes remain unchanged, including the23
retired/deferred outcomes.

## Design alternatives assessed

Calling the entire executor and interrupting before its week loop has no successful
stage boundary and retains all221/deferred and unchanged-source problems. A generic
legacy loader/parallel converter would duplicate owners and weaken ordinary checks.
Extending original46 would make changed facts their own historical authority.
The selected in-place finite context plus converter stage preserves existing typed
owners, independent originals and explicit transaction boundaries, at the cost of
narrow context threading and create-once candidate retention. Reusing only the old
pre-write capability would avoid new state but cannot survive rollback, mutating
source facts or fresh-process reconciliation, so it cannot meet this contract.
