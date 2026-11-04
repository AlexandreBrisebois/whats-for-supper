# Proposal

## Why

People editing a recipe need the servings label immediately to the left of its text box. The reported below-field placement conflicts with that expectation; current source in `RecipeDetailSheet.tsx` instead defines a block label before a full-width input, which also does not provide the requested horizontal layout. The reported placement has not yet been reproduced in a browser.

## Outcome and Scope

In recipe-detail edit mode, display `Servings [text box]` on one row in English and `Portions [text box]` in French, including narrow screens. Keep validation feedback below the row and preserve existing editing, saving, cancellation, accessible naming and view-mode behavior. Scope is this field's presentation and focused regression coverage; API, persistence, quantities, translations and other editor fields are excluded. No consequential decisions remain open.

## What Changes

- Require the visible servings label to sit to the left of the input on the same row.
- Keep the row usable without clipping, overlap or horizontal scrolling at supported narrow widths.
- Preserve the input's accessible label and error association, with validation text beneath the row.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-editing`: Add an explicit layout requirement for the existing servings editor.

## Impact

- Presentation owner: `pwa/src/components/recipes/RecipeDetailSheet.tsx`.
- Browser regression owner: `pwa/e2e/recipes.spec.ts`, using existing recipe fixtures and mock routes.
- Preservation coverage: `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` and existing servings browser scenarios.
- Existing locale keys `recipes.servingsLabel` and `recipes.servingsInvalid` are reused. No contract, generated client, backend, dependency or mock-handler changes are expected.
