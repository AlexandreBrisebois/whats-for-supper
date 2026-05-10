# Requirements: Recipe Detail Image And Import Actions

## Vision
Enhance the recipe management experience by providing direct "In-Situ" actions for refreshing content and improving visual fidelity. Users can easily re-sync recipes from their original sources (URL or Photos) and personalize the experience by uploading their own "finished dish" photos or forcing a higher-quality hero image regeneration.

## Product Decisions
1. **Gear Menu Consolidation**: Deletion and Reimport are secondary actions; they live in a header gear menu to keep the bottom action row focused on "Primary Intent" (Cooking/Planning).
2. **Conditional Reimport**: Only show "Reimport Recipe" if the source is known (URL or Photos). Synthesized-only recipes (e.g., created from chat without an external reference) cannot be reimported.
3. **Non-Destructive Regeneration**: Hero regeneration is "fire and forget" and happens in the background. The UI remains responsive, and the old hero is kept until the new one is ready.
4. **MinimalCapture Integration**: Uploading a cooked photo reuses the `MinimalCapture` component to allow users to choose from their photo library or downloads, ensuring flexibility.
5. **Thumb-Zone Hero Actions**: In Edit Mode, hero controls are anchored to the bottom corners for easy thumb reach while keeping the image content visible.

## Acceptance Criteria

### AC 1: Gear Menu & Deletion
- [ ] A gear icon button appears in the top-right of the `RecipeDetailSheet` header.
- [ ] Clicking the gear icon opens a menu containing "Move to Bin".
- [ ] Clicking "Move to Bin" triggers the deletion flow (same as the legacy button).
- [ ] The "Move to Bin" button is removed from the bottom action row.

### AC 2: Conditional Reimport
- [ ] The gear menu includes "Reimport Recipe" ONLY if the recipe has a `sourceUrl` or `imageCount > 0`.
- [ ] If the recipe is `sourceType: "synthesized"`, the "Reimport Recipe" item is hidden.
- [ ] Clicking "Reimport Recipe" triggers a `POST /api/recipes/{id}/import` and closes the menu immediately.
- [ ] A success toast "Reimport started..." is shown.

### AC 3: Hero Image Controls (Edit Mode)
- [ ] When the recipe sheet is in **Edit Mode**, two controls overlay the hero image:
    - **Bottom-Right**: Camera icon (Upload Cooked Photo).
    - **Bottom-Left**: Regenerate icon (Forced Hero Regeneration).
- [ ] Controls use a glassmorphism style (semi-transparent backdrop-blur circle).

### AC 4: Cooked Photo Upload
- [ ] Clicking the **Camera** icon opens the `MinimalCapture` sheet.
- [ ] After a file is selected/captured, it is uploaded via `POST /api/recipes/{id}/originals`.
- [ ] The upload triggers a background hero regeneration.
- [ ] A toast "Photo uploaded, regenerating hero..." is shown.

### AC 5: Forced Hero Regeneration
- [ ] Clicking the **Regenerate** icon triggers `POST /api/recipes/{id}/hero/regenerate`.
- [ ] The backend bypasses existing "hero exists" checks to force a new generation.
- [ ] The PWA shows a toast "Regenerating hero image...".

## Glossary
- **Source Type**: The origin of the recipe (URL, Photos, or Synthesized).
- **Reimport**: The process of re-running the acquisition agent to update ingredients/instructions from the original source.
- **Forced Regeneration**: Re-triggering the AI image generation for the hero image even if one already exists.
- **Cooked Photo**: A user-uploaded photo of the final result, used as a high-priority source for future hero generations.
