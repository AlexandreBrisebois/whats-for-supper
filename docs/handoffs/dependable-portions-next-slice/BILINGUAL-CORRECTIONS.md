# Private shopping and category correction delivery

This delivery selects `bilingual-shopping-identity` tasks 3.1–3.2 directly on local
`recipe-view-redesign`. Clean entry local and remote both matched
`fb4978e6d521bcceb8014951957bde5949554320`; CI repair
`050c8d0635e071d9c6186ffc2df672a66b579908` was already included. Alex owns CI
monitoring. The [common vocabulary](BILINGUAL-COMMON.md), [grocery grouping](BILINGUAL-GROCERIES.md),
[recovery](RECOVERY.md) and [migration executor](MIGRATION-EXECUTOR.md) retain their
own identities and acceptance boundaries.

## Qualified correction path

Ordinary URL acquisition and RecipeAgent publication save EN/FR mapping facts
through FoodVocabularyStore, FoodMappingQualification and canonical publication.
The ordinary editor sends generated-client guarded ingredient rows through
OpenAPI PATCH recipes, RecipeController and CanonicalRecipeContentStore. Same-food
private spelling can retain a newly qualified mapping; changed or ambiguous
purchase meaning clears the association. Explicit clears and private decisions
carry their deciding operation through later quantity Saves, locale reads,
producer replay, independent DI/executable restart and full recovery.

The category picker sends the existing generated-client food or fallback operation.
FoodsController and HouseholdFoodOverrideStore own revision-guarded food corrections;
IngredientsController and IngredientCategoryService retain conservative normalized-key
scope. GroceryRecomputeService recomputes affected stored weeks, while grocery
presentation and GroceryCheckCoordinator own response decoration, row/check identity
and exact acknowledged baselines. Extra occurrences retain their separate owner.
No grouping, mapping qualification or correction scope moves to the browser.

Existing behavior met those inspected contracts. One demonstrated provider gap
required logic: CategorizeIngredientsProcessor accepted an unrequested food key
in a category-provider reply. Its regression failed before the in-place request-key
filter and passed afterward. A manual correction arriving before the delayed reply
retains human precedence. No public request/response behavior or generated shape
changed, so OpenAPI/client regeneration is not applicable to this internal repair.

## Revisions and retained human facts

Missing or stale/foreign contentRevision returns atomic 409 with no partial editor
field application. Missing/foreign mappingRevision paired with an existing food,
foreign food association and stale mapping replay return 400; a valid explicit
null/null clear remains supported. Same-food private spelling receives a qualified
new mapping revision. Quantity Saves carry that decision and advance its content
reference. Changed/ambiguous purchase names lose the association rather than
retaining an unrelated food ID.

Food-category expectedCategoryRevision is required: omission returns 409
upgrade_required, explicit null admits an absent override, and null/stale/foreign
values conflict after a correction exists. Two current-revision writers retain one
204 winner and one atomic 409 loser. The legacy fallback-key endpoint keeps its
existing unguarded compatibility scope; it does not reinterpret keys as food IDs.

A unique prior manual category retains its section/source provenance. Conflicting
manual aliases remain separately retained with unresolved presentation until an
explicit food correction; no source-order winner is selected. Food and fallback
corrections rebuild affected current/future stored weeks. Same-named checked extras
retain their independent category, check and version. Consumer operations do not
publish aliases or mutate exact vocabulary bytes/membership.

The reviewed input remains [three-anchor-reviewed-2026-11-14.1.json](../../data/food-vocabulary/three-anchor-reviewed-2026-11-14.1.json),
raw SHA256 `9a73124844fd93422d00bda2a287169317377f69ef2a1a66f6b405e101e8274b`.
Stable IDs, exact aliases, qualifiers, provenance, ambiguity/adoption/reversal
records remain unchanged. Global releases retain their pinned affected-set review.

## Acceptance and evidence

Evidence owner is `.task/bilingual-corrections-20261114/`; `delivery.json` owns the
complete prepared path set, final independent immutable review, stable verifier
record_path, full PostgreSQL receipt, tested source/runtime identities, signed
commit/push and ownership-scoped cleanup. Each invocation retains its own identity.

Focused API baseline passed 192 cases. After the provider regression/filter,
affected category/processor/recompute/normalizer owners passed 184 cases. Affected
mock API, category wire, grocery and editor units passed 191 cases. The stable
correction PostgreSQL matrix passed 10 cases with zero skips in
`dcf6954f3ac04579b9ae6d5d0bbf9b79`; broader bilingual/correction regression passed
31 with zero skips in `820ddd2830304de792a1e7f4a5bd5a38`.

Production-built live2 passed one native owner and five browser journeys with
zero skips/retries, build `qmAwdvMAWUbDvrLnerCjp`, source-manifest SHA256
`ebd630803fb421674e38be92ce88e4e578bd7185770dd0ed0d4509a70873ed30`.
Both EN/FR ordinary generated-client editors correct private shopping spelling;
both food-category corrections retain the shared checked 100 g demand and exact
baseline. Independent readers retain their labels/checks. Native read-back compares
canonical mapping evidence, private decisions, vocabulary files and category facts.

Acquisition/extraction/category providers use explicit controlled external doubles;
Hero completion uses the established publication fixture seam. The live fixture
explicitly calls the real recompute owner after editor Saves. Strict application
provider/network spies assert zero consumer calls. The extra occurrence is a
controlled persisted consumer fixture, independent of ordinary recipe publication.
Existing category failure/retry, stale-week navigation, split/merge/proven-increase
and accepted 400-clear/untouched-800 cases retain their owners and run in the final
applicable suites. Food-category EN/FR mocked journeys additionally retain state
through a controlled failed transport and successful method-sensitive retry.

Corrected private spelling, an explicit clear and actual food category are now
compared across independent DI restart and two actual Program.cs starts. Existing
ordinary/demo full backup→isolated restore→re-export acceptance compares actual
producer-backed private corrections/clears and category overrides after a vocabulary
update. Full final PostgreSQL execution qualifies those cases with its own receipt.

Retained failures include the provider intended RED; initial category fixtures
with unnormalized keys/missing extra version and concurrent content mutation
`7a89ead6ad9941ef97a496464121c875`; read-only-extra fixture failure
`c6aacae63e264c1aaa833d163f43f413` (eight passed, two failed); and live1 (four
browser passes, one French same-category no-op timeout). Correcting the fixture
clock and choosing distinct category transitions produced separately recorded
passes. Earlier failures are not rewritten as product defects or success.

## Lifecycle and next selection

Current CLI roots resolve the local planning root and wfs schema. All six artifact
graphs are ready, with parity specs explicitly skipped. Selected tasks 3.1–3.2 are
complete: bilingual is 8/10 and the release family is 33/68, from entry 6/10 and
31/68. No additional unchecked aggregate task has complete matching acceptance.

| Change | Complete | Remaining acceptance |
| --- | --- | --- |
| canonical-ingredient-correction | 1/12 | Broader editor/corpus, later intake/general repair and integrated release |
| scale-cooking-step-ingredients | 2/14 | Complete reevaluation/stale/failure, combined role/context and hosted release |
| bilingual-shopping-identity | 8/10 | Migration 4.2 and release 5.1 |
| migrate-canonical-recipe-model | 3/8 | Final baseline, old recovery pair, coordinated cutover and integrated release |
| restore-dependable-grocery-interactions | 8/9 | Final integrated candidate and applicable hosted acceptance under 4.1 |
| restore-local-ci-browser-parity | 11/15 | Cooking cause/repetition 4.1–4.2 and local/hosted sequence 6.2–6.3 |

The eligible sync/archive set is empty; synced capabilities and archived changes
are both empty. Delta overlap remains in dependency order: canonical foundation,
step/grocery behavior, bilingual identity, migration recovery/cutover. Main-spec
Purpose and unaffected requirements/scenarios remain unchanged. Similar remains
deferred; selective repair remains superseded and unimplemented.

The next bounded selection is migration companion acceptance supporting bilingual
4.2: actual copied-library candidate/configuration, current-date freshness, exact
old application/schema recovery pair, coordinated hold/shutdown/restart and fresh
independent post-conversion backup/read-back. Reuse the executor and its operator
prerequisites. Preserve all plans/events, extras, corrections and history; recompute
all stored/required weeks. Bulk check/baseline reset belongs only to the captured
migration epoch and cannot reset later checks on retry. Activation/shared adoption
and DV/production require their later selection. Final release 5.1, additional
intake, Similar, garlic and adjacent UI remain subsequent work.

The recorded prior CI failure belongs to `fe6263bb`; its later repair is already
included at entry. No new hosted qualification is claimed by these local checks.
Alex continues CI monitoring. Existing containers and port 3000 remain reserved;
all executed acceptance uses disposable resources and task-owned ports.
