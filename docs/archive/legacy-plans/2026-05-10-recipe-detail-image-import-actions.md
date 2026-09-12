# Recipe Detail Image And Import Actions

## Summary

Move recipe deletion into a top gear menu. Add gear-menu reimport for recipes captured from photos or URL, hiding it for synthesized recipes. Add edit-mode-only hero image tools for uploading a cooked meal photo and forcing non-destructive hero regeneration.

## Key Changes

- Add a gear icon button in `RecipeDetailSheet` header with a compact popout menu.
- Move `Move to Bin` into the gear menu and remove it from the bottom action row.
- Add `Reimport Recipe` to the gear menu only when the recipe source is reimportable:
  - URL import: `sourceUrl` is present.
  - Photo import: original image count is greater than zero.
  - Synthesized-only recipe: hide the option.
- In edit mode, overlay two icon controls on the hero image:
  - Camera: opens native `image/*` picker and uploads one cooked meal photo.
  - Regenerate: queues forced hero regeneration.
- Keep the current hero visible during regeneration; do not mark the recipe unready or remove it from rotation.

## API / Contract Changes

- Extend `RecipeDto` with source metadata needed by the UI:
  - `sourceType: "url" | "photos" | "synthesized"`
  - `canReimport: boolean`
  - `imageCount: number`
- Update `POST /api/recipes/{id}/import` behavior:
  - If `sourceUrl` exists, queue `url-import` with `recipeId` and `url`.
  - Else if `ImageCount > 0`, queue `recipe-import`.
  - Else if synthesized-only, return `409 RECIPE_NOT_REIMPORTABLE`.
- Add `POST /api/recipes/{id}/originals`:
  - Upload one cooked meal photo.
  - Append it as a new original.
  - Mark it as the finished-dish source.
  - Queue forced hero regeneration.
- Add `POST /api/recipes/{id}/hero/regenerate`:
  - Queue forced hero regeneration.
- Hero regeneration behavior:
  - Pass `force: true` into the hero workflow.
  - Bypass the existing "hero already exists, skip" guard only for forced regeneration.
  - Generate to a staged/temp file first.
  - Replace `hero.jpg` only after successful generation.
  - On failure/retry, the old hero remains available.

## Test Plan

- API/contract tests:
  - Detail DTO exposes correct `sourceType`, `canReimport`, and `imageCount`.
  - Reimport queues `url-import` for URL recipes.
  - Reimport queues `recipe-import` for photo recipes.
  - Reimport is rejected for synthesized-only recipes.
  - Uploading a cooked photo updates image count/source image and queues forced hero regeneration.
  - Failed/slow hero regeneration leaves old hero readable.
- PWA/e2e tests:
  - Gear menu contains `Move to Bin`.
  - Gear menu shows `Reimport Recipe` for URL/photo recipes.
  - Gear menu hides `Reimport Recipe` for synthesized-only recipes.
  - Edit mode shows camera/regenerate controls on the hero image.
  - Upload/regenerate show busy state without removing the current hero.
- Validation split:
  - Codex runs targeted non-hanging checks and focused tests where safe.
  - Human runs tasks known to hang or touch Kiota/codegen, including `task review`, `task format`, `task agent:reconcile`, `task types:sync`, and any Kiota generation command.
  - Human also runs full-gate validation if local behavior suggests long-running process risk.

## Assumptions

- A recipe with `sourceUrl` is treated as URL-imported even if it also has original images.
- A recipe with no `sourceUrl`, `imageCount > 0`, and not synthesized-only is treated as photo-imported.
- Reimport is async and non-destructive, like hero regeneration.
- Codex must stop and ask the human to run any hanging/Kiota-touching task instead of launching it directly.
