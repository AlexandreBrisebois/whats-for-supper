# Proposal

## Why

Recipe detail currently puts several secondary controls before the recipe, hides empty notes behind Add a note, and offers a route into saved portions editing. Planner and grocery controls can communicate their purpose with less visual noise while preserving the dated planning and quantity-recovery work already implemented locally.

## Outcome and Scope

Refine the existing choosing, reading and shopping journey into a calm family cookbook: read the recipe, optionally preview quantities, then find Rating, Family notes and Ask the Family at the end. Keep saved planning, prepared meals and shopping state trustworthy.

This is one follow-up to `redesign-recipe-detail-planning` and `scale-supper-ingredients-by-attendance`, in that order. Both predecessor task lists are complete locally but unarchived; their evidence remains historical and unchanged. This change explicitly supersedes their conflicting presentation and no-preview requirements, not their guarded operations. Its deltas assume those predecessor deltas as the baseline; any later sync/archive must reconcile them in dependency order. No sync/archive is requested now.

Current authorization covers these planning artifacts and the living visual reference only. Alex will review them before a separate implementation approval. The uncommitted E2E rationalization and its separately pending grocery SSE fixture proposal are excluded. No product code, deployment, production test, commit or session creation is included.

## What Changes

- End recipe reading with Rating, directly writable Family notes, then the existing Ask the Family control. Preserve note debounce, acknowledged saves, retained drafts and explicit retry. Keep the useful notes shortcut when notes exist.
- Move GOTO into the top action bar; place known Ready in and eligible View Original on readable hero surfaces. Remove standalone Steps. Use Cook with the former Steps icon for the existing cooking action.
- Preserve every contextual planning/recovery footer. Add Planner's two-arrow change icon at the end of Plan for day; give Plan another day Home's quieter Change Plan treatment.
- Replace the recipe-to-Planner portions-editing link with ephemeral 2/4/6 ingredient previews. A preview never saves portions, changes groceries or changes cooking/completion context. Reuse authoritative scaling safeguards; an unknown original yield offers explicit recipe-yield correction, never an assumed basis.
- Rename Planner's At the table entry to Portions, with a plate/cutlery icon and visible label; remove its neighboring Recipes heading, preserving bottom Recipes navigation. Refine the existing date/photo/count editor with joined minus/value/plus and direct entry. Keep blank usual portions unconfigured and preserve all three dirty-exit choices with the approved hierarchy.
- Give recipe-derived grocery rows a compact recipe-book disclosure listing real contributor recipe titles. Reuse loaded Planner names first; lazily resolve missing contributor IDs through the existing recipe GET, with deduplication and week-change guards. Keep quantity warnings explicit, source links on original-quantity review, and the checkbox and aisle tag as separate controls. Use an honest unavailable-title fallback when resolution cannot supply a title.
- Extend the living visual language with this proposed composition, bilingual/reflow expectations and state coverage, clearly separated from observed implementation.

## Capabilities

### New Capabilities

None. Reuse existing owners, including `supper-servings` introduced by the implemented predecessor.

### Modified Capabilities

- `recipe-library`: reading order, directly writable notes, hero/toolbar/cooking controls, contextual footers and isolated ingredient previews.
- `meal-planning`: Portions entry and compact editor, preserved numeric/default/recovery behavior.
- `grocery-shopping`: recipe-title disclosure, uncertainty semantics and original-quantity inspection.
- `supper-servings`: additive read-only preview using the shared authoritative projection rules, independent of dated state.

## Impact

Affected source owners are RecipeDetailSheet, RecipesExperience, recipeNotesStore, Planner's useSupperServingsEditor, GroceryList, the recipes API wrapper and IngredientProjectionService/SupperIngredientProjection. The proposed additive ingredient-preview contract affects `specs/openapi.yaml`, Kiota, API tests and stateful `pwa/e2e/mock-api.ts` handlers. Grocery source titles reuse the existing schedule names and `GET /api/recipes/{id}`; no grocery DTO, schedule/SSE contract or generated-model change is required for titles. Missing contributor resolution covers other meal slots and independent live grocery refreshes without making routine loaded Planner titles incur another request. No new persistence model, ingredient parser, preparation workflow or quantity algorithm is needed.

See [design](design.md) for source evidence, contract choices, trade-offs and review points, and [tasks](tasks.md) for bounded implementation slices and required acceptance. All implementation tasks remain unchecked.
