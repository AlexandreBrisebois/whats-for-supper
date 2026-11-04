# Proposal

## Why

People cannot see how many portions the stored ingredient quantities make. All three inspected recipes already retain a correct `recipeYield` in raw metadata (2, 2 and 4 portions), but that fact is absent from the detail response and presentation. The image prompt also conflicts between selecting one serving column and copying the printed yield verbatim.

## Outcome and Scope

“Portion size” means the number of servings covered by the saved ingredient quantities. A recipe detail shows this count when known. The three supplied originals are acceptance examples; four portions must remain four without reducing quantities to a universal two-serving basis.

Keep `recipeYield` in its existing raw metadata location and add a dedicated nullable serving-count database column. Do not add it or a derived count to `recipe.info`. This change covers prompt clarification, database projection and legacy backfill, detail reading/display, manual correction or addition during recipe editing, and preservation through existing backup/restore. It does not add serving-based ingredient selection, ingredient scaling, weight/volume per serving, planning policy, grocery scaling, recipe-sharing changes, or a bulk AI re-import. This proposal authorizes no implementation or live data changes.

## What Changes

- Make image extraction resolve the serving basis from explicit labels, serving-column symbols and base/doubling notes; retain quantities from one coherent basis without scaling.
- Reuse the existing extracted `recipeYield` without introducing a second provider-output count field or adding any recipe.info field.
- Derive nullable positive integer `servings` from unambiguous serving-yield text and persist it in the recipe table; backfill existing raw metadata without AI calls or changing ingredients.
- Expose persisted servings through the recipe DTO and show the localized count in a quiet badge immediately beside the Ingredients heading in detail; omit unavailable values.
- Allow recipe editing to correct a known serving count or add a missing one, using the existing Save/Cancel flow without changing ingredient quantities or raw yield.
- Retain manually saved serving counts and existing raw yield data through export/restore and rebuild the derived column for legacy files, without extending recipe.info.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-capture`: resolve and retain the serving basis associated with extracted ingredients.
- `recipe-library`: persist, backfill and return the serving count, show it in recipe detail, and allow manual correction/addition in recipe editing.
- `data-backup-and-recovery`: preserve the new database fact and recover legacy yields without adding a recipe.info field.

## Impact

Affected owners include the embedded image extraction prompt, disk sync, recipe model and EF mapping, declarative database schema/compatibility path, recipe DTO mapping, management export/restore, OpenAPI, generated Kiota types, PWA recipe mapping/detail/locales, and method-sensitive E2E mock projections. RecipeInfo and its serializers receive no yield/count additions. No new external dependency is proposed. Provider-image qualification remains separate from deterministic parsing, persistence and browser tests.
