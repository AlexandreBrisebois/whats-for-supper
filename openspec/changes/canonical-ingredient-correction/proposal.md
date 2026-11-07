# Canonical recipe facts and original-basis correction

## Why

String edits and retained `RawMetadata.supply` currently have different owners; one changed string can invalidate the measured collection. Portions, cooking and groceries need the same exact saved facts and safe correction boundary.

## Outcome and Scope

Evolve this existing foundation, rather than replace it. One original-basis recipe content revision owns ordered ingredient rows, steps and their associations. Amount/unit remain independently nullable; exact fractions and ranges survive. The ordinary three-field editor stays quiet. This is a review draft with consequential allocation decisions outstanding; artifact existence is not implementation approval or readiness.

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
