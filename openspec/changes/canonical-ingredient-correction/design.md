# Design

## Context and Existing Ownership

Observed in `api/src/RecipeApi/Services/RecipeService.cs`, `UpdateRecipe` serializes `dto.Ingredients` into `Recipe.Ingredients`; it does not replace measured `RawMetadata.supply`. `SupperIngredientProjection.Read` compares all current strings with retained `recipeIngredient`/`ingredients` before binding supplies. A single changed string makes that collection incoherent and supplies no row measurements. `CategorizeIngredientsProcessor` also independently reads retained supply names. These paths explain both stale quantities and the need to converge readers rather than merely add editor boxes.

Existing projection contracts own original, temporary preview and captured dated contexts. Their scaling, incompleteness and frozen occurrence rules remain the authority. This change replaces their ingredient input owner; it does not invent another calculator or change instruction prose. Existing Search routes and report resolution remain unchanged.

## Decisions and Tradeoffs

### One structured current owner

A canonical row contains stable `id`, `description`, nullable `amount` and nullable `unit`, in saved order. Description preserves arbitrary ingredient/preparation wording. Finite nonnegative amounts, zero and unitless counts are valid. Blank amount means null, not zero; blank unit means null independently of amount. A unit-only row is valid. Empty amounts do not need a quantity-state control or a recognized “to taste” phrase. Internal provenance distinguishes supported source facts, unknown legacy association and explicit manual choices without adding mandatory editor fields.

The canonical collection plus its opaque revision owns current facts. Compatible `ingredients` strings and projection `originalText` are rendered from it; raw extraction text/supply and captured legacy source records are evidence only. Any retained formatting is tied to that row revision, cannot be edited independently and is invalidated/rebuilt on change. Saving a description alone never silently reuses a conflicting metadata quantity. The editor updates one complete structured row, not independent legacy/current stores.

Keeping only strings and patching metadata was rejected: it leaves association and write precedence ambiguous. Requiring units or numbers was rejected because real recipes contain unitless counts and qualitative ingredients. Text parsing and bulk provider repair are not prerequisites.

### Read and write contract

Detailed reads expose ordered `ingredientLines` and `ingredientRevision` alongside derived compatible strings and the existing saved nullable servings. The editor always initializes those original facts, even when entered from a dated or preview display. It has three labeled inputs per row, supports addition/removal, preserves row order and does not require a separate quantity-state selector.

PATCH submits the final ordered lines and `expectedIngredientRevision`; supplied serving-basis changes use the same guard. Reject mixed canonical/legacy arrays. A stale or missing revision on ingredient/basis mutation returns 409 and applies none of that request, including unrelated supplied fields. Other field-only PATCHes retain their existing behavior. Legacy string updates are supported only with a current revision and a conservative adapter: unchanged unambiguous rows can retain facts; changed/new/ambiguous rows retain description without inherited numbers. At cutover old unversioned writers must refresh rather than overwrite corrections.

Save renders the returned authoritative detail/revision, not a reconstruction from submitted strings. Opening from Search returns to its existing mounted results; no new membership flag is introduced. Existing household feedback remains independently resolved.

### Conservative legacy conversion

Before modifying a recipe, capture its current text/order, raw extraction evidence, independent basis and revision. Use only currently coherent, unambiguous original-mode associations accepted by the existing projection boundary; never use a scaled projection to recover stored numbers. Do not zip supply by index, parse arbitrary numeric prose or infer basis from ingredient amounts. A known original 200 g remains 200 g even if servings is null.

The adapter preserves exact current wording and trusted facts with reversible source association/formatting. It must demonstrate that rendering the converted row reproduces the current line without duplicating its quantity or dropping preparation/package wording. If a trustworthy amount cannot be represented safely, leave that recipe on its read-only legacy adapter and report a conversion conflict; require explicit editor reconciliation before canonical publication. If there is no trustworthy association, retain the full current line as description with null structured facts and retained evidence. Never replace current manual text with older extracted text. Ambiguous authorship is protected, not assumed machine-owned.

Publication checks the captured revision and is atomic per recipe, resumable and idempotent. There is exactly one current owner for each recipe: legacy read adapter until guarded conversion, canonical thereafter. Once canonical exists, no fallback may replay retained supply over explicit nulls or an empty collection. Converted/source provenance is retained for diagnosis and recovery; this is not a selective repair candidate lifecycle.

## First Observable Slice

A recipe with original basis 4 and coherent 200 g pasta is opened from a dated eight-serving view. Edit shows 200, g, pasta, not 400. Save 250 g, reopen and observe 250 g original and 500 g for that dated context. An untouched sauce row retains its own measured facts. Repeat with blank amount, blank unit and both blank; valid descriptions save/reopen without invented values or new report flags. Exercise the real browser → generated client → API → PostgreSQL seam before extending consumer cutover.

## State, Concurrency and Recovery

Canonical line/basis changes advance the ingredient revision. Human Save atomically persists accepted rows, explicit nulls, provenance/protection and existing durable affected grocery/search refresh obligations. Provider/reimport/conversion work must check its captured revision and preserve human edits, including explicit clearing. Unrelated description/rating changes do not overwrite ingredients.

Validation/conflict retains the local draft. A lost success reply does not prove failure: reread authoritative detail, compare the revision and reconcile before another mutation. Existing dispatch retries keep saved facts and pending work truthful; do not claim derived refresh succeeded when it has not. No new queue platform or generic repair service is required.

## Persistence and Side Effects

Capture, text-share import, disk sync and restore normalize through the same boundary. Categorization derives normalized names from current descriptions using the existing category normalization owner, not stale extraction names; it does not become another stored ingredient-name authority. Grocery projection uses original canonical amounts before scaling/conversion/grouping and retains existing uncertainty/check/manual-extra rules. Home, detail and Cook share the existing projector. Instructions, dates, occurrence receipts and frozen preparation facts retain their existing owners.

Full-fidelity version-2 recipe envelopes preserve rows/identities/revision, explicit nulls/clears, independent basis, evidence and human protection separately from raw metadata. Supported legacy/version-1 imports are conservative; merge cannot erase richer protected current facts merely because an older file lacks them. Exact recovery extends the existing snapshot schema/preflight to include canonical state; incompatible snapshots fail before publication. Portable share version 1.0 remains privacy-scrubbed rendered text and cannot promise structured round-trip fidelity.

## Compatibility, Rollout and Reversal

Use additive storage first, inventory every writer, then prove adapters and recovery on disposable nonproduction copies before enabling canonical writes. Preserve legacy source storage during this increment. Deployment/cutover needs separate approval and verified independent backup, exact artifact identity, old-writer quiescence, no-write dry run, bounded guarded conversion and a rehearsed restore. See [rollout.md](rollout.md). Rolling back the application image alone after canonical edits is unsafe because older code could ignore saved facts; restore a compatible state or keep incompatible writers disabled.

## Risks and Deferrable Questions

This scope has no unresolved behavioral choice: optional fields, current ownership, revision failure, legacy fallback and format compatibility are specified above. Physical column/table layout and internal formatting-cache shape may be selected during implementation provided they satisfy these invariants. Exact operator commands depend on the then-confirmed target environment and do not authorize live writes now. Selective automated repair remains a separate design review.
