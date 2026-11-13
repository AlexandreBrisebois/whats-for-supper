# Bilingual shopping identity

> **Selected release scope — 2026-11-12:** Alex included bilingual shopping identity in this release and selected an app-owned, model-authored bounded vocabulary, persisted as versioned UTF-8 JSON and included in full backup/restore. No imported external dataset, licence/attribution package, production download or runtime AI dictionary generation is required. The model proposes vocabulary; review and adversarial evidence qualify each accepted exact relation.
>
> **Historical decision — 2026-11-10, superseded:** Alex deferred this feature from the first dependable-portions baseline. That decision explains the earlier release sequence; it no longer excludes bilingual behavior from this release. Existing accepted portions/package/step/check behavior remains protected. See the shared [release scope](../canonical-ingredient-correction/proposal.md).

## Why

Mechanical description normalization cannot safely identify equivalent French/English purchases. Households need deterministic bilingual grocery grouping and labels from reviewed saved identities, while ambiguous foods and private corrections retain their meaning.

## Outcome and Scope

A small app-owned vocabulary supplies stable food IDs, reviewed EN/FR labels, exact aliases, explicit purchase qualifiers and model-authoring/review provenance. A qualified import or ordinary guarded correction saves the association; grocery reads and recomputation consume it without AI or translation guesses. Unmapped or ambiguous inputs retain source shopping spelling and the existing conservative fallback.

The durable JSON and every referenced revision survive restart and full backup/restore without reseeding, overwriting or regeneration. Private shopping-name and household category corrections remain distinct from globally reviewed vocabulary releases. A FoodId is not a grocery rowId; quantities, compatible unit definitions, package capacity/count/basis, saved-contributor lineage and ordinary check continuity remain independent.

## What Changes

- **BREAKING:** extend the applicable shared [contract](../canonical-ingredient-correction/contracts.md) with qualified saved mapping, explicit revision scopes and compatible failure behavior; update clients/mocks with actual API changes.
- Replace the external-dataset adoption gate with a pinned model-authored JSON revision/hash, exact-alias/purchase-qualifier corpus, collision/false-merge review and affected-set/adoption/reversal manifest. Model confidence is not validated equivalence.
- Add deterministic bilingual labels and food grouping through the existing canonical publication/projection/grocery owners. Locale-only label changes preserve saved recipe facts, row identity, checks and baselines.
- Persist vocabulary through the existing storage owner; integrate exact JSON, mapping references and protected household overrides into the actual full backup/restore path, including fail-before-write validation and interrupted-publication recovery.
- Qualify ordinary private shopping/category corrections, mapping clears, stale writers and current-format recovery through real persistence and generated-client/browser seams. Preserve the shared [review](../canonical-ingredient-correction/review.md) and [corpus](../canonical-ingredient-correction/acceptance-corpus.md) boundaries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grocery-shopping`: reviewed saved bilingual identity, deterministic locale labels, protected corrections and durable offline vocabulary/recovery behavior.

## Impact

Reuse the canonical shopping association/contentRevision owner, grocery exact aggregation and row/check coordinator, category correction, `IStorageProvider`/atomic local storage, current archive dictionary/override validation and ordinary snapshot/restore owners. Archive validation does not establish an implemented live vocabulary or complete backup integration. Implementation acceptance remains unfinished; this update changes planning only.

The [migration companion](../migrate-canonical-recipe-model/design.md) owns cutover: preserve **all** plans/events, rebuild **all** grocery lists, and allow bulk check/baseline reset only within its captured migration epoch; preserve manual extras/corrections/history. This change introduces no empty-list gate and does not alter completed historical operations. Shared canonical contracts/review/corpus/tasks/rollout and migration artifacts have their own writers. PDF authority stays separate; synthesis/share later qualify the same common mapping seam. Similar, garlic-placeholder work and production deployment remain outside this change.
