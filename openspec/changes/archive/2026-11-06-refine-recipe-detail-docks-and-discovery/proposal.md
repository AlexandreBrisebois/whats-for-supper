# Proposal

## Why

Recipe detail currently stacks Cook beneath planning controls or uses it in a different footer position for Planner entry. Ratings have gained a red selected treatment/checkmark, and Find Similar is hidden in the three-dot menu. Alex wants a calmer recipe surface with consistent docks and fewer repeated planning decisions.

## Outcome and Scope

For Planner and Recipes detail, move the existing Cook action to the left of the top dock. Keep the bottom action controls in one row. A confirmed saved occurrence uses a white Planned control, without change arrows; activating it opens Planner on that exact captured date. Do not repeat planned status in the recipe body. Unplanned recipes retain dated Plan and the existing arrows for choosing a proposed target date, not moving a saved meal or navigating to Planner.

Restore main's neutral rating visual character without the red selection or checkmark, preserving current accessibility, localization, saving and end-of-reading order. Restore one visible Find Similar entry using the existing functionality, without a duplicate menu entry or another bottom-dock action.

This is a focused follow-up on `recipe-view-redesign`. Alex separately approved applying the reviewed design in the existing Mac session. Preserve the predecessor archive and all concurrent work; production tests, commit and push remain outside this apply authorization. Alex subsequently authorized redeploying the existing nonproduction DV instance once verification is complete. Today's portions and grocery-label commitments remain owned by their earlier change and are not redesigned here.

**Verification discrepancy:** `refine-today-portions-grocery-cook` is archived but has only 1/13 tasks checked complete. Its full-width bottom Cook requirement is superseded by this proposal; do not claim its other work is implemented or verified, mark it complete, or drop its remaining portions/grocery obligations. Coordinate overlapping source/test ownership before any future apply.

## What Changes

- Put one existing Cook control at top-left, preserving its cooking context, guards and readiness/completion semantics. Remove its bottom-dock copy; retain Close/GOTO/share/actions/original-source access.
- For a verified matching dated occurrence, show white Planned with its date and a localized navigation name; activation reads/opens that Planner date without saving or moving anything. Remove change arrows and duplicate planned-status wording in this state. Planning changes happen in Planner.
- For an unplanned target, keep the dated Plan action and target-date chooser arrows beside each other in one bottom row. Preserve current read, conflict, non-cooking, replacement and uncertain-save safeguards.
- Use the app's accent for the next best enabled action: normal dated Plan when unplanned, Cook when already planned, or the applicable Retry/Review action when recovery owns the state. White Planned remains an available navigation control, not disabled-looking decoration.
- Restore the verified main rating anchor: evenly spaced borderless emoji/label choices, rounded white selected surface and shadow/emphasis, no selected red fill/checkmark. Keep readable localized labels, pressed/focus state, targets and responsive behavior rather than restoring main's faint inactive text or literal English-only accessible names.
- Put one quiet labeled Find Similar action in the recipe overview before Ingredients, outside both docks. Reuse the existing callback/Similar flow and remove the detail-menu duplicate. Preserve Rating → Notes → Ask the Family at the end.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: top Cook, one bottom action row, single planned-status presentation/navigation, neutral ratings and visible Similar.
- `meal-assignment`: confirmed identical-target presentation and exact-date Planner navigation without repurposing target-date arrows.

## Impact

Affected existing owners are RecipeDetailSheet, RecipesExperience and Planner entry/navigation adapters, ActionGearMenu's optional Similar entry, EN/FR resources and the living visual reference. Reuse existing routing, captured dates/reference, original-review and Similar search owners; no API shape, persistence, ranking or new planning endpoint is proposed.

The [design](design.md) records the actual source/screenshot states, exact main source anchor, state matrix, preserved contracts and verification plan. [Tasks](tasks.md) track the approved implementation and its required acceptance evidence.
