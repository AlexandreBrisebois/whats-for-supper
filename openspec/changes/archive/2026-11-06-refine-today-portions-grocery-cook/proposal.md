# Proposal

## Why

Alex cannot correct today's five portions because its supper is already marked Cooked. Grocery rows repeat Review amounts and reserve extra warning space, while recipe detail's Cook action remains narrower than the planning row above it.

## Outcome and Scope

Allow an explicit correction to today's Cooked supper when it has no preparation receipt, which matches the observed DV entry. Keep its recipe, Cooked status and cooking history; show the corrected count and refresh its ingredient/grocery quantities through the existing save journey. Past dates, future Cooked dates, non-cooking dates and explicitly prepared occurrences remain protected. This bounded proposal does not introduce correction of an explicit preparation receipt.

Remove the grocery-row Review amounts text and its redundant space. Alex declined a replacement row-level warning; do not introduce another icon or label. Keep one truthful known subtotal, existing prior-check warnings, and the separate source-book/aisle/checkbox actions. A wholly unknown amount will lose its explicit visible row warning; original quantities remain inspectable through available recipe sources. This is an intentional proposed presentation trade-off, not a claim that uncertainty was resolved.

Make the existing Cook action span the recipe footer's content width, below the dated Plan and icon-only Change day row where that row exists. Preserve all contextual planning, editing, completion, recovery and source-review boundaries.

This request authorizes investigation and planning only. All implementation tasks remain unchecked. No product/data changes, deployment, production tests, commit or push are part of this pass. The four predecessor changes are already synced and archived; canonical specs are the baseline.

## What Changes

- Expand date editability only for deployment-local today when its supper is Cooked without an explicit preparation receipt. Ordinary unprepared today stays editable. Retain atomic/version-checked writes, save-and-return/reset, uncertain-result recovery and frozen history/default safeguards.
- Treat the correction as dated portion intent, not cooking again. Recipe quantities and usual portions remain unchanged. Groceries recalculate; a reliable increase can uncheck the affected item under the existing shopping rule.
- Remove both occurrences of Review amounts, adjacent separators and any empty warning layout. Render a known partial subtotal once. Preserve the distinct prior-unknown-checked-amount warning even when the current total is complete. Do not add a replacement icon or fabricate an unknown amount.
- Give Cook its own full-width footer row in contexts that already expose it, with the existing icon/name and minimum 48 CSS px target. Keep Plan/Change day adjacent, preserve Plan another day and original-review Plan transition, and retain responsive clearance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `supper-servings`: the narrow current-day Cooked correction and its date/default/history/grocery consequences.
- `meal-planning`: editable current-day correction, preserved read-only boundaries and existing portions draft actions.
- `grocery-shopping`: compact amount presentation without the repeated review label, preserving subtotal/prior-check distinctions.
- `recipe-library`: full-width Cook placement with contextual footer behavior unchanged.

## Impact

Affected owners are SupperServingsService's authoritative read/write eligibility, its existing projection/invalidation/refresh path, useSupperServingsEditor, the shared serving mock, GroceryList and RecipeDetailSheet. The API behavior changes require OpenAPI editability/write semantics, generated-client qualification, consumers and stateful mock alignment in the same vertical slice; no new endpoint, DTO field, database schema or dependency is proposed.

The [design](design.md) records local DV GET evidence, source/test findings, trade-offs and acceptance boundaries. The [tasks](tasks.md) define test-first slices and required real integration checks. Approval of this proposal is still required before implementation; this document does not authorize it.
