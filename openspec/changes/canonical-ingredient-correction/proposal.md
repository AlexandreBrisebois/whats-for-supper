# Structured ingredient editing and consistent saved facts

## Why

Recipe editing currently PATCHes `Recipe.Ingredients` strings while measured ingredients remain in `RawMetadata.supply`. `SupperIngredientProjection.Read` accepts that supply only while the entire retained ingredient string sequence matches, so changing one ingredient can make every measured row stale. A person needs to edit the measured facts themselves through three clear fields.

## Outcome and Scope

Each ingredient has amount, unit and free-text description fields in the existing recipe editor. Amount and unit are independently optional; unquantified ingredients are valid. Save, reopen, original reading, dated projections and groceries agree on the saved original quantities. Editing from a scaled view always initializes original saved facts.

This increment includes only the structured owner, guarded editor/read contract, safe legacy adapters and consumer/recovery compatibility necessary for that outcome. It follows the independently releasable quiet-portions UI and reuses its projection contexts. Existing ordinary Search → detail → Edit → Save navigation and household report resolution remain unchanged. New repair filters, repair dashboards, automated/provider repair, selective candidate workflows and the unrelated next-available-date issue are outside scope.

## What Changes

- Replace the string-only ingredient draft with ordered rows containing amount, unit and free-text description. Preserve row identity, order, Cancel and failed-Save recovery.
- Establish one versioned authoritative structured ingredient collection. Legacy strings become a compatible rendering; retained extraction metadata remains evidence, never a competing current writer.
- Preserve reliable original measurements through supported conversion; preserve current manual text and unknown legacy authorship. Unsupported associations are not guessed, zipped by position or reparsed by AI.
- **BREAKING:** ingredient and serving-basis writes require a captured current revision. Stale or unversioned writes return a conflict before any requested field changes; other field-only requests retain their existing contract.
- Read canonical facts through the existing original/preview/dated projection owner and existing grocery/category consumers. New capture/import and restore boundaries use the same canonical contract.
- Preserve structured facts, source evidence, human protection and explicit empty/null values in full-fidelity export/restore; retain privacy-scrubbed version-1 text sharing as a lower-fidelity format.

## Capabilities

### New Capabilities

- `recipe-ingredients`: ordered original ingredient facts, safe legacy conversion and current ownership.

### Modified Capabilities

- `recipe-editing`: three-field original-basis drafts and guarded authoritative Save.
- `recipe-library`: canonical detail reads and nullable independent serving basis.
- `recipe-capture`: initialize canonical facts at existing publication boundaries.
- `recipe-sharing`: current rendered ingredients with conservative text-only import.
- `cooking`: consume the shared current projection without changing instructions or occurrence semantics.
- `supper-servings`: project canonical original facts using existing context rules.
- `grocery-shopping`: derive quantities and categories from the same saved facts.
- `data-backup-and-recovery`: preserve canonical ownership across export, sync and restore.

## Impact

Affected owners include `RecipeService.UpdateRecipe`/DTO mapping, `SupperIngredientProjection`, detail editor/client, capture/import processors, grocery/category derivation and existing disk/export/recovery adapters. Implementation will first update `specs/openapi.yaml`, generated clients and method-sensitive mock state consistently. This revision changes planning only; it does not approve implementation, migration or deployment of this increment.
