# Bugfix Requirements Document

## Introduction

`TonightPivotCard` has three UX bugs that surface together when the user has no meal planned for today **and** no GOTO recipe configured — the pure empty state (`!currentRecipe && !gotoRecipeId`). In this state the card displays a misleading header, a nonsensical prep-time badge, and a call-to-action that is visually buried and not tappable. All three bugs are confined to `pwa/src/components/home/TonightPivotCard.tsx`.

**Bug condition C(X):** `X.currentRecipe == null AND X.gotoRecipeId == null`

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN no meal is planned for today AND no GOTO recipe is configured THEN the system renders the card header as "TONIGHT'S MENU", which is misleading because there is nothing planned.

1.2 WHEN no meal is planned for today AND no GOTO recipe is configured THEN the system renders a "30-45 MINS" prep-time badge, which is nonsensical because there is no recipe to associate a prep time with.

1.3 WHEN no meal is planned for today AND no GOTO recipe is configured THEN the system renders the "Add your family's GOTO recipe" call-to-action as a plain `<a>` tag inside the image area, which has a dark gradient overlay (`bg-gradient-to-t from-charcoal/60`) on top of it, no button affordance (no background, no border, no pill shape), and fails the Toddler Rule — it is not recognisably tappable.

### Expected Behavior (Correct)

2.1 WHEN no meal is planned for today AND no GOTO recipe is configured THEN the system SHALL render the card header as "What's for Supper?" instead of "Tonight's Menu".

2.2 WHEN no meal is planned for today AND no GOTO recipe is configured THEN the system SHALL hide the prep-time badge entirely so no prep time is shown.

2.3 WHEN no meal is planned for today AND no GOTO recipe is configured THEN the system SHALL render the "Add your family's GOTO recipe" action as a full-width pill button in the footer actions section (outside the image area), styled with an ochre background, white text, `h-12 rounded-[1.5rem]`, matching the visual weight of the "Confirm GOTO" button — and the image area SHALL show only the fork/knife icon centered with no gradient overlay obscuring it.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a GOTO recipe is configured (regardless of its status) THEN the system SHALL CONTINUE TO render the card header as "Tonight's Menu".

3.2 WHEN a GOTO recipe is configured and is ready THEN the system SHALL CONTINUE TO render the "Confirm GOTO" button in the footer, enabled and tappable.

3.3 WHEN a GOTO recipe is configured and is pending synthesis THEN the system SHALL CONTINUE TO render the "Your GOTO is being prepared…" body message and hide the "Confirm GOTO" button.

3.4 WHEN a GOTO recipe is configured THEN the system SHALL CONTINUE TO render the prep-time badge (it is only hidden in the pure empty state).

3.5 WHEN any state of `TonightPivotCard` is rendered THEN the system SHALL CONTINUE TO render the "Quick Find" and "Order In" footer buttons with their existing styles and behaviour unchanged.

3.6 WHEN a GOTO recipe is configured and is ready THEN the system SHALL CONTINUE TO display the GOTO recipe image (or the fork/knife placeholder) in the image area with the gradient overlay.

3.7 WHEN a meal is planned for today THEN the system SHALL CONTINUE TO render `TonightMenuCard` (not `TonightPivotCard`) with the "30-45 MINS" badge and "Tonight's Menu" header unchanged.
