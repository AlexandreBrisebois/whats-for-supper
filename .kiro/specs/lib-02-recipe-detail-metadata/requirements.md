# LIB-02 — Recipe detail and metadata: requirements

## Status

**Implemented capability baseline.** Canonical owner of recipe detail display and editable metadata.

## Current behavior

- **LIB-02-AC1.** `RecipeDetailSheet` loads `GET /api/recipes/{id}` and displays available recipe facts, instructions, readiness, import issue, notes, rating, ingredients, meal types, cuisine, and imagery actions.
- **LIB-02-AC2.** Edit mode locally drafts name, description, ingredients, cuisine, and meal types, then sends `PATCH /api/recipes/{id}`. It updates its local record only after the request resolves; failures show edit-specific error text.
- **LIB-02-AC3.** Notes save after an 800 ms debounce and immediately show a transient Saved label; rating updates locally then awaits PATCH. Neither path catches a failed PATCH or restores the previous local value.
- **LIB-02-AC4.** Load effects use an active flag and `recipeId` dependency, preventing an old fetch from setting a newly selected sheet. Autosave is tied to the current `recipe` object but has no request sequencing.

## Boundaries and limitations

LIB-03 owns action eligibility, LIB-04 imagery/provenance, LIB-05 deletion, and LIB-06 sharing. PATCH response data is not used to reconcile notes/rating/edit state, so concurrent changes can be overwritten visually. Contract: GET/PATCH recipe detail.
