# Proposal

## Why

Recipe detail's changed-preview area shows Original quantities / Planned quantities links and the repeated “Preview only. Your plan and shopping list stay unchanged.” sentence. Alex requested removing those controls/copy while retaining the original serving-count label and existing previews.

## Outcome and Scope

Remove the inline original/planned return links and the preview-only sentence. Preserve original serving-count label visibility, the effective count, 2/4/6 preview selection/calculation and all existing read-only safeguards. Keep necessary original inspection and reset capabilities in Recipe actions rather than the ingredient reading area. Planning/design only until separate implementation approval; no other proposal, deployment, commit or push is included.

## What Changes

- Remove the inline Original quantities and Planned quantities links, including the duplicate original-return link shown for standalone previews, and the requested preview-only sentence.
- Keep the current Original recipe: N servings label under its existing changed-preview/original-inspection conditions; do not turn it into permanent default exposition.
- Keep original inspection available through Recipe actions as View original ingredients, including during a changed preview. Offer Reset view there when preview/original inspection differs from default; it returns to the current dated/frozen or standalone default without a write.
- Keep Preview portions labeling, selected-count state, loading/error/retry, specific unchanged-instruction-amount guidance, saved-basis correction and original source-image access.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: quieter preview presentation with progressive original/reset access and unchanged preview semantics.

## Impact

RecipeDetailSheet, ActionGearMenu, dedicated English/French labels and focused unit/browser acceptance. Existing projection API/client, stored recipes, groceries, preparation and other active proposals remain unchanged. This is a small successor to archived quiet-recipe-portions, not an application of canonical ingredient correction.
