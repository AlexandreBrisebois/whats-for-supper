# Bilingual common vocabulary slice

This delivery selects `bilingual-shopping-identity` tasks 1.1–1.3 on local
`recipe-view-redesign`. Entry HEAD and the remote branch both matched
`82e975ecb5518e146bc1a08e9d6fa1104db48c88`, with a clean worktree. The prior
CI-repair delivery remains in `.task/ci-435655-20261114/delivery.json`.
Alex owns CI monitoring.

## Reviewed input and captured adoption

The [version1 three-food release](../../data/food-vocabulary/three-anchor-reviewed-2026-11-14.1.json)
has document revision `three-anchor-reviewed-2026-11-14.1` and raw SHA256
`9a73124844fd93422d00bda2a287169317377f69ef2a1a66f6b405e101e8274b`.
It retains the existing stable food IDs, food revisions, both language labels,
purchase qualifiers and all 15 literal aliases from the reviewed predecessor.

| Purchase | Stable app ID |
| --- | --- |
| Fresh bulb onion | `ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee` |
| Fresh tomato | `d9940182-48c9-4823-a820-1c7c54869d5f` |
| Canned tomato, unspecified cut | `031a0c4b-2d73-4a70-88aa-8ad3dd680ebb` |

The [review](../../data/food-vocabulary/three-anchor-reviewed-2026-11-14.1.review.json)
pins the original model-authored draft and reviewed predecessor hashes. The
original exact deployed model identifier remains unavailable in its retained
provenance. Current selection records the Codex/GPT-6 family and its own revision.
Independent finite source review found 15 exact aliases, 65 unmapped terms,
zero same-locale collisions and zero false merges within that corpus.
The [corpus](../../data/food-vocabulary/three-anchor-reviewed-2026-11-14.1.corpus.json)
retains exact decisions for each preparation phrase, ambiguous regional term,
product qualifier and alternative. Unlisted terms retain source spelling.

The [adoption/affected-set manifest](../../data/food-vocabulary/three-anchor-reviewed-2026-11-14.1.adoption.json)
binds the actual EN/FR disposable household captures, publication receipts,
snapshot/schema/history/file hashes and saved mapping facts. Each capture keeps
all 16 declared business tables plus the typed history projection. Existing
business-table descriptors remain identical across vocabulary publication.
Counts describe those exact captured households.

The [reversal manifest](../../data/food-vocabulary/three-anchor-reviewed-2026-11-14.1.reversal.json)
binds a separate captured household and the accepted raw reversal bytes. Its empty
active release disables future matching while the earlier referenced release and
three saved mappings remain exact. A subsequent quantity Save carries those
associations. Shared-library adoption and reversal require their own fresh
captured inputs, affected-set review and operation authority.

## Existing owners and demonstrated repairs

`FoodVocabularyStore` remains the explicit internal publication owner.
`RecipeService`, workflow capture and `RecipeFilePublicationStore` carry its
authority into ordinary source publication. `FoodMappingQualification` retains
the deterministic resolver and protected name/clear decisions.
`CanonicalRecipeContentStore` commits content and saved evidence together.

Three demonstrated integrity gaps were repaired in those owners.

- A document revision now admits one raw SHA256 across publication, retained
  membership and captured authority.
- Prepared publication retries re-admit every retained file and its compatible
  definitions before further file/head writes. Reintroducing the exact accepted
  missing bytes permits the retained operation to resume.
- The database test source bundle now includes the reviewed vocabulary directory
  required by these actual input bytes.

The public canonical API, generated client and method-sensitive mocks retain
their existing contracts. Source preparation uses complete lossless original
phrases and supply agreement. Private purchase-name changes clear an unrelated
association, explicit clears remain protected, and quantity-only Saves carry
mapping revisions and deciding operations into the new contentRevision.

## Acceptance and source identity

Evidence lives under `.task/bilingual-common-20261114/`. Its final `delivery.json`
records the complete prepared path set, immutable review, focused acceptance,
stable verifier record_path, signed commit/push receipts and owned cleanup.
Each earlier receipt keeps its tested source identity.

- Stable revision-immutability RED is database run
  `c11312fc9c104878ab63694c03b3479d`.
- Retained-file retry RED is database run
  `b67e69fe041e4e398cc391686f15248f`, with four intended failures and the revision
  guard passing. Missing/corrupt retained files were injected before/after the
  proposed new file write.
- Captured/membership contradictory revisions have pure RED/GREEN receipts.
  A missing-reference regression introduced during the guard edit was reproduced
  and corrected. Compile/setup and content-mutation attempts remain separately
  retained.
- The first complete common PostgreSQL run passed 15 cases with zero skips in
  `1c9de74bc57a4c26ab6da407fdb91b3a`. Its actual capture observations own the
  checked-in adoption/reversal manifests.
- Pure resolver/artifact/manifest acceptance passed 25 cases in
  `pure-manifests/pure.trx`. Generated-client parity passed. The affected mock API
  units passed 40 cases.
- `live1` passed one native acceptance and two EN/FR browser journeys with zero
  skips or retries. Its production PWA build ID is `WeHnZ_1P3mGp08n-dnJhx` and
  immutable source-manifest SHA256 is
  `c03ecd5a6eb8deed77887c078f5353af5d6f2dcd30c7649f7cf36319088824cd`.

The browser fixture uses real PostgreSQL/files and Kestrel through
`TestWebApplicationFactory`, a production-built PWA and the ordinary generated
client editor. Acquisition/extraction providers are doubled at their external
boundaries, and Hero completion uses the existing controlled publication seam.
Saved evidence is reread from PostgreSQL after browser quantity Saves. App-level
provider/network spies record zero calls during these reads and Saves.

Restart acceptance separately recreates the application/DI instance over the same
database and recipe root with unavailable providers, then exercises two starts
of the actual `Program.cs` executable against that owned library. Its dormant
fixture producer tasks are deferred during process observation. The provider
endpoint returns 503 and records attempted calls. Exact vocabulary files,
membership, canonical content and mapping evidence are compared after each start.
The final focused receipt owns the actual process outcomes and assembly hashes.

Recovery acceptance extends the existing ordinary/demo independent full
backup→restore→re-export owner with these exact bounded bytes. Existing reference,
private-clear, interruption and zero-provider assertions remain in that owner.
The final focused receipt owns those outcomes. Runtime backup behavior retains
its qualified implementation.

The expanded prepared-source run passed 97 PostgreSQL cases with zero skips in
`8447e52dc60148ad844d7b476d8da1d7`, including the four ordinary/demo full recovery
cases and both actual executable starts. Independent review then found that an
inherited configuration-style workflow root could escape the process fixture's
owned filesystem. An owned canary reproduced that failure in
`327fc927d3334e029bed4c72b38d7476`. Explicit workflow/backup roots passed the same
process case in `eb547e8671034914a6b0a2934c4dc06e`, with both starts retaining exact
vocabulary and recording zero provider calls. Its canary remains unchanged.

The repeated final-code browser run `live2` passed one native acceptance and both
EN/FR generated-client journeys with zero skips or retries. Build ID is
`WVcMAll5o8EYckmrrm5-5` and immutable source-manifest SHA256 is
`0b53751feb89ca34ffe675a86a6eaf696678540cdea15b05aedd17bf5a82c801`.
The complete stable repository gate and full PostgreSQL rerun have their terminal
receipts in `delivery.json`.

The first stable 26-path repository gate passed all selected checks in
`3c0c57a81f8b420e9688d289108579a6`, including 2,192 frontend units, 1,008 browser
passes with 103 existing conditional skips, and 2,900 host API passes with 711
conditional skips. Required common-slice browser/database acceptance retained
zero skips.

The concurrent full PostgreSQL run retained 835 passes, zero skips and one failure
in `47f7cbd2387441338df0c25bde74cfea`. Its migration owner lost the operator session.
The shared recovery fault-injection test selected advisory-lock holders across
the test cluster. A separate owned database/session canary reproduced termination
of that foreign session in `1915cae908e348dcb528d9200286af0b`.
`OnlineRecoveryPostgresTests.MaintenanceOperator.cs` now scopes its termination
query to the fixture database. Existing own-session revocation assertions and
the foreign-session continuity assertion passed together with the previously
affected migration case in `c1e5909b77a24079b7e4345b27eb4f4e`, two passes and zero
skips. The final 27-path source review and repeated complete gates retain their
own terminal receipts. This repair changes the recovery test's fault-injection
scope.

## Next selection

Resume from the final delivery receipt and current local/remote refs. Task 1.1–1.3
evidence supports this common vocabulary slice. Combined grocery grouping,
private/category correction, migration 4.2 and final release 5.1 acceptance stay
with their selected task owners.

The next bounded implementation selection can qualify tasks 2.1–2.2 through the
existing grocery aggregation, locale-label and row/check owners after explicit
selection. Reuse this exact release and saved mapping seam. Preserve the existing
plans/events, extras, corrections, history and continuing check policy. Migration
activation and shared-environment vocabulary adoption retain their operator
prerequisites in [the migration handoff](MIGRATION-EXECUTOR.md) and shared rollout.
Port 3000 and the six entry containers remain reserved for Alex's existing work.
