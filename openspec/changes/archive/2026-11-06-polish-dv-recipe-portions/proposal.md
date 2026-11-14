# Proposal

## Why

DV review exposed quantity previews that accept 2/4/6 but leave every ingredient unchanged, a planning action hidden in grocery-source review, and controls that feel heavier than the family cookbook. The read-only investigation reproduced these behaviors and identified the quantity-alignment and preview-invalidation causes.

## Outcome and Scope

Make reliable quantities visibly respond to portions, keep uncertain amounts honest, and make planning and household defaults understandable with fewer competing controls. Restore the familiar borderless Rating and single-field Notes presentation without losing the newly verified autosave/recovery behavior.

This follow-up depends on `redesign-recipe-detail-planning`, then `scale-supper-ingredients-by-attendance`, then `refine-recipe-planner-grocery`. Those completed but unarchived deltas form the effective baseline. This change supersedes their conflicting presentation, unset-default and grocery-review-only rules; guarded writes, date ownership, prepared/history snapshots and quantity warnings remain. Later synchronization must follow that dependency order. No sync or archive is included now.

Authorization covers specifications/design and the living visual reference only. Implementation, data repair, deployment and test execution against changed product behavior require subsequent approval. Preserve the dirty checkout and existing E2E work. No new sessions or production operations.

## What Changes

- Bind reliable structured amounts to their actual original ingredient lines instead of rejecting every line when supply arrays omit ingredients. Preserve partial/unquantified/unknown semantics and stale-source protection. Use the verified four-portion shells example as acceptance evidence, without modifying DV recipes.
- Preserve an explicit preview through routine schedule loading and resume; refresh safely when actual projection inputs change. Never change saved portions or groceries through preview reads.
- Separate dated Plan and adjacent Change day; show only the change-arrows icon on Change day, retaining a localized accessible name and 48 px target so the dated Plan label has more space. Retain distinct Cook, recovery actions and intentional Plan another day.
- Restore evenly spaced borderless Rating choices, one directly writable Notes field, and a warm translucent View Original capsule with measured contrast. Remove the duplicate Serving details ingredient list; preserve plain original yield and purposeful original-quantity/source access.
- Configure usual portions in Settings. Unset means automatic family-member count; human-set values remain explicit despite membership changes. Preserve existing positive defaults as explicit during migration, retain prepared/history snapshots and date overrides, and handle unavailable/empty family counts honestly. **BREAKING semantic change:** legacy unset no longer means original quantities for editable future dates when family count is positive.
- Remove the usual-setting field from Planner. Replace Use usual text with a compact number button that resets the date draft to the current usual count. Keep clear accessible labels and save/cancel/conflict behavior. Make the Portions entry a quiet rounded counterpart to Ask the Family.
- Keep grocery source heading and titles collapsed behind the book control, reveal Used in on expansion, preserve warnings and aisle actions. Offer Plan from grocery-source detail as an explicit transition into normal guarded dated planning, with original evidence still available.

## Capabilities

### New Capabilities

None. `supper-servings` is owned by the implemented, unarchived predecessor.

### Modified Capabilities

- `supper-servings`: trustworthy per-line quantity alignment, automatic/explicit usual semantics and migration.
- `recipe-library`: stable previews, restored quiet composition, purposeful original evidence, distinct planning controls and grocery-to-planning transition.
- `meal-planning`: compact numeric usual-reset button and Settings-owned default.
- `grocery-shopping`: fully collapsed Used in disclosure and intentional exit from original review into planning.

## Impact

Affected owners: SupperIngredientProjection, IngredientProjectionService, capture/sync and recipe correction metadata ownership, SupperServingsService/SupperProjectionInputs/Invalidation, FamilyService membership changes, RecipeDetailSheet/RecipesExperience, useSupperServingsEditor, SettingsPageContent and GroceryList. Shared changes affect cooking, groceries, SSE freshness, recovery snapshots and demo isolation. Existing preview/projection and GET/PUT schedule/servings operations should be reused; additive default-source metadata requires OpenAPI/Kiota, consumers and stateful mocks in the same slice. No new grocery-title response field or external ingredient parser/AI read is proposed.

Evidence and decisions are in [design](design.md); dependency-ordered acceptance is in [tasks](tasks.md). All implementation tasks remain unchecked.
