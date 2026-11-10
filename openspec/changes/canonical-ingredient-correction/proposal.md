# Canonical recipe facts and original-basis correction

## Why

String edits and retained `RawMetadata.supply` currently have different owners; one changed string can invalidate the measured collection. Portions, cooking and groceries need the same exact saved facts and safe correction boundary.

## Outcome and Scope

Evolve this existing foundation, rather than replace it. One original-basis recipe content revision owns ordered ingredient rows, steps and their associations. Amount/unit remain independently nullable; exact fractions and ranges survive. The ordinary three-field editor stays quiet. Alex has approved absolute-allocation preservation, range comparison and new split/merge row behavior. Dataset and contract qualification remain engineering gates; artifact existence is not implementation approval or readiness.

## What Changes

- **BREAKING:** lossless scalar/range quantities, stable line/step IDs and `contentRevision` replace the proposed scalar-only, ingredient-only revision contract.
- Save original facts from every context; preserve human edits, explicit clearing, retained sources and existing serving protections.
- **BREAKING:** guarded atomic writes for ingredients, basis, instructions and shopping corrections; reject unversioned old editors before any field changes.
- Capture/import/reprocessing publish through the same guarded owner; preserve existing user reporting and eligible repair triggers. No selective candidate endpoint or dashboard.
- Share one server projection across Home, detail, Cook and grocery demand. Mandatory step scaling is owned by the companion below, not omitted from the release.
- Split the earlier cooking, grocery and recovery deltas into their companion owners; no main capability sync or archive in this session.

## Capabilities

### New Capabilities

- `recipe-ingredients`: canonical original facts, exact quantities, identity and publication.

### Modified Capabilities

- `recipe-editing`: original-basis drafts and coherent guarded Save.
- `recipe-library`: original canonical DTO and independent nullable basis.
- `recipe-capture`: coherent new capture and protected reprocessing publication.
- `recipe-sharing`: lower-fidelity text sharing remains distinct from backups.
- `supper-servings`: canonical original facts feed the existing shared projector.

## Impact

RecipeService, SupperIngredientProjection, import/synthesis/disk publication, generated client, editor, stateful mocks and PostgreSQL persistence will change only during a separately approved apply. Proposed shapes live in [contracts.md](contracts.md); the shared [review](review.md) and [acceptance corpus](acceptance-corpus.md) govern five bounded units. Companions: [groceries](../restore-dependable-grocery-interactions/proposal.md), [bilingual identity](../bilingual-shopping-identity/proposal.md), [steps](../scale-cooking-step-ingredients/proposal.md), [migration/recovery](../migrate-canonical-recipe-model/proposal.md).


## Fresh canonical web intake — separate publication review

The ordinary editor is now composed and qualified for explicitly converted recipes. The next bounded publication milestone is the existing fresh URL-import workflow producing editable canonical facts before readiness. It uses the current publication journal, workflow launch evidence and current recipe codec; no separate converter service, recovery endpoint or provider is introduced.

The cutover decision proposed for review is strict atomic canonical publication for a provably fresh bootstrap: preserve exact representable facts and wording, identify new source-authored facts separately from protected legacy/unknown facts, and reject an unrepresentable trustworthy candidate before publication. Preserve retained source and the existing retry/error path; do not silently mark a legacy fallback ready. Honest absent measurements remain valid. Existing-recipe reimport/repair stays fenced until its saved-identity/protection merge is qualified. The design below specifies the smallest complete workflow and acceptance; implementation is not authorized merely by this draft.

This milestone does not create validated ingredient-use bindings. Conversion currently creates empty bindings, ordinary step edits only carry prior ones, and projection deliberately never discovers them. Original step wording stays readable under the existing quiet-uncertainty rule. The ordinary binding-proposal/semantic-validation inlet remains a necessary separate step-companion dependency before claiming the complete whole-use portions tracer.

## Approved next slice: correct flagged recipes in the existing editor

Alex approved preserving manual ingredient and step editing for incomplete imports and clarified that the existing report flag must be used, not a new draft product concept. Qualifying retained content needing correction is accessible through the existing Ready for review queue and issue badge; Reported remains its existing superset. The existing detail editor edits saved original ingredients and original steps, including an intentional original-content entry when a dated projection is unavailable. Blank amount/unit and unbound instruction text remain valid. Late automation cannot overwrite human corrections; invalidated scaling proof stops applying without hiding the text or adding a persistent notice. This correction slice does not authorize the separate fresh-source publication cutover, semantic binding production or catalogue adoption.

## Reviewed system-review refinement (2026-11-10)

Alex approved a system flag only for actual ingredient/usable-step validation needs on retained editable recipe content. Use the existing Ready for review status and generic explanation, with a short system-authored explanatory comment and no repair launch. Unchanged feedback Save is a no-op; a changed human comment keeps the existing eligible correction rules (source URL/images, Ingredients/Steps, no Duplicate), history and stale-write protection. Do not turn image/category/transport failures into content reports or overwrite existing feedback. This is a limited bridge from content validation to the existing review queue, not replacement of failed-capture management. Review wording must not claim a re-import happened. Resolve retains its existing feedback-only semantics.

Use the existing Clear/deferred-cleanup guard conservatively: persisted ingredient/instruction/canonical content, including explicit empty saved collections, survives. This also retains some partial automated content; the trade-off avoids a new human-ownership marker/schema or recovery mechanism. Empty placeholders remain eligible for existing cleanup. Preserve the original-step editor and original-content entry, and verify system review → manual correction → reopen → changed comment correction, no-op unchanged save (including after backup/read-back), report preservation, clear protection and stale-job safety. The earlier broad failure-flag proposal is superseded; fresh canonical source publication and binding production remain separate, unimplemented scope. Broader tasks and archive stay open until required acceptance passes.
