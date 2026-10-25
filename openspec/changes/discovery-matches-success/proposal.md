# Proposal

## Why

Issue [#322](https://github.com/AlexandreBrisebois/whats-for-supper/issues/322) records the existing logo celebration. The user's later approved request replaces it with the familiar green cooked-success presentation and a deliberate route to the completed round's matches.

## Outcome and Scope

Discovery shows a centered green card with the exact English headline "Menu's in!", secondary text "Your family found its matches." and action "See your matches". Activation opens that round's meal plan. Home confirmation, personal exhaustion, voting lifecycle and suggestions remain unchanged. No merge or deployment is authorized.

## What Changes

- Replace the logo and two headings with the existing success-card visual and one headline.
- Add explicit, week-anchored meal-plan navigation, including when Planner previously showed groceries.
- Preserve immediate static rendering, polite status announcements and stability across late updates.
- Translate the new copy in English and French without claiming assignments or locks.
- Use a Discovery-only dark sage treatment for small subtitle/action text to achieve at least 4.5:1 contrast; preserve Home styling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-discovery`: confirmed-convergence presentation and navigation to the owning week.

## Impact

Discovery page, a narrow shared success presentation extracted from Home, locale strings and affected unit/browser tests. Existing Planner navigation state and absolute-week query support are reused. No API, schema, dependency or household-data changes.
