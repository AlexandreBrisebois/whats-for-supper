# Design

## Context and Existing Ownership

Source inspection at `d51222ffbb7e3eb6d08fed394851a52de3f5522c`, branch `recipe-view-redesign`, 2026-11-07. Uncommitted browser-parity edits are concurrent evidence, not part of this change. `RecipeService.UpdateRecipe` writes string Ingredients while `SupperIngredientProjection.Read` requires whole-list coherence before binding retained supply. Its `IntentionallyUnquantified` phrase list is not a validity rule for the new model. `CategorizeIngredientsProcessor` still reads raw supply. `SyncRecipeProcessor` replaces raw content and basis from disk. These are current competing publication paths, not implemented canonical support.

The existing projection/context and durable invalidation owners remain authoritative for dated counts, previews, cooked baseline and prepared receipts. The new model replaces their recipe input. Shared ownership and conflicts are in [review.md](review.md), exact proposed public/persistence boundaries in [contracts.md](contracts.md).

## Decisions and Tradeoffs

Use one `contentRevision` instead of the old draft's `ingredientRevision`: ingredients, basis, step text/bindings and shopping association can invalidate one another. This increases honest conflicts between simultaneous editors, but prevents mixed revisions. Notes/rating-only updates remain independent. Stable IDs are unrelated to order, displayed name and food ID.

Use bounded exact rational quantities, a tagged scalar/range union, independently nullable unit, original notation and explicit scaling policy. A stored zero is real, missing is unknown. Strings are rendered compatibility output; no second quantity store or prose parser on reads. Preserve source evidence/provenance separately. No whitelist of qualitative phrases and no always-visible repair selectors.

A complete content read includes all instructions and original facts even where step bindings are uncertain. Safe migration may retain a per-recipe legacy adapter until canonical publication can preserve trustworthy facts and exact wording. Never zip by position or import rounded projections. A known 200 g with unknown basis remains known original 200 g.

Import-time AI may propose facts and identities through existing provider boundaries. It cannot certify evidence or publish over protected human values. Existing Report issue/Review issue plus eligible reimport remain available. `RecipeAgent` currently writes recipe.json before `SyncRecipeProcessor` updates the DB; unchanged reuse would bypass protection. Future controlled reprocessing must stage results before file and DB publication, compare captured content/source revisions and preserve unselected media and human edits. Report state is not ingredient completeness and generation is not a saved correction.

## First Observable Slice

Search → detail at eight portions from basis four → Edit original 200 g pasta and untouched 100 ml sauce → Save pasta 250 g → reread 250 g original and 500 g dated, with one shared revision and source retained. Include a proven whole-use step in the coordinated step slice; until that slice passes, this tracer is not complete portions support. Exercise UI → generated client → real API → PostgreSQL plus durable grocery/search invalidation, and method-sensitive mock equivalents.

## State, Concurrency and Recovery

A guarded write atomically changes original facts, dependent-binding validity, human protection, contentRevision and durable derived obligations. Derived execution and notification remain later effects with updating/failed/current status. A timeout may follow commit: preserve the draft, reread and reconcile, never blindly replay. Concurrent ingredient/step writers using one baseline cannot both succeed.

Explicit nulls/empty collections are authoritative; retained metadata cannot revive them. Unrelated IDs/order/sections/media stay unchanged. A local active cooking session retains its coherent installed revision until explicit accepted refresh; a new read of a prepared meal uses current recipe with recorded prepared portions, never a fabricated historical snapshot.

## Compatibility, Rollout and Reversal

Add storage, settle contracts and client/draft fencing, qualify guarded publication, then in-place conversion under [rollout.md](rollout.md). Recovery and current-format-only support belong to the migration companion. No permanent legacy backup adapters. A per-recipe legacy read adapter during conversion is not old-backup restore compatibility. Disabling new code after new writes is not safe rollback.

## User Experience

Keep amount, unit and description as the primary editor fields. Accept fractions/ranges in amount. Shopping-name correction and fixed exceptions use progressive disclosure. Original and Reset stay in recipe actions; preserve quiet preview state, current phone/tablet composition, horizontal portions editor, original overlays, drafts, check states, exact offset and completion protections. Review EN/FR at 320 CSS px, 200% text and tablet Split View separately from automated checks.

## Consequential Review Holds

The choice after ingredient-total correction is still unresolved: preserve absolute step amounts (recommended), keep explicit fractions and recompute only proven whole uses, or intentionally redistribute selected uses. The step companion records the counterexample and blocks dependent implementation tasks. Dataset adoption and conditional disk/live precedence have separate gates in their owners. These are not deferrable implementation details.
