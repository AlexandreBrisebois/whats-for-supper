# Proposal

## Why

People need to find today's supper, recognize the next action and return to real life. Reported faint controls and missing date orientation make this harder; fixing them together must leave the phone screen calm rather than add competing signals.

## Outcome and Scope

One focused Planner readability and date-orientation improvement, following the proposed Solar Earth language and North Star: glance, act, leave. This change absorbs the unimplemented `experiment-planner-day-emphasis` package. Review one matched baseline/proposed treatment rather than implement two colour candidates.

Current source has fixed date labels outside movable meals and a charcoal/70 grip, not the charcoal/20 grip described by the earlier plan. Week context remains tiny uppercase charcoal/30; Plan supper remains hard-coded charcoal/45. These are source findings, not measured rendered failures. Badge removal, directional return-to-this-week navigation and fixed-date movement are existing behavior to preserve.

## What Changes

- Make week context sentence case and readable, with the date range remaining more prominent.
- Localize Plan supper with its existing EN/FR key; use readable terracotta text and Plus while keeping the light empty-day treatment.
- Give the grip a readable neutral default and sage interaction feedback, preserving keyboard focus and hold-to-move.
- Include fixed weekday/month labels in the readability scope without widening the date column or reducing meal space.
- Identify authoritative today with one localized Today label and faint decorative divider above its row, outside draggable content; keep the fixed date marker neutral. Let the label use available row width and wrap; other rows gain no label line.
- Quiet past decorative surfaces/shadows without fading essential content, changing meal status or making available controls look disabled. Future rows retain normal treatment.
- Reuse reliable server-owned calendar context; missing, invalid or expired context gives neutral temporal treatment while content stays usable.
- Require actual-background contrast evidence, phone-first EN/FR review and preservation of existing planning/movement behavior. Judge the combined result for calmness as well as readability.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: readable week context, empty-day actions and fixed date labels; compact Today identification and quiet past dates based on reliable calendar context.
- `meal-rescheduling`: recognizable grip and preserved movement feedback alongside fixed date emphasis.

## Impact

- Planner page/date-row presentation and `PlannerDragHandle`, existing locale files, focused unit/browser tests and comparison evidence.
- Reuse `todayStore`, deployment-calendar validation/freshness helpers and existing resume refresh. No new calendar policy, API/schema, generated client, persistence, dependency, runtime variant switch or analytics platform.
- Remove the absorbed planning package after carrying its calendar, state-separation and review requirements here. This is consolidation, not an implementation or archival claim.
- Preserve current voting/recipe/non-cooking actions, return navigation, fixed-date movement and reconciliation. No whole-Planner redesign, new badges/legends, global typography/button rollout, gesture repair or grocery continuity work.

The treatment is agreed for a local implementation and review, not proven usable or automatically promoted to canonical visual guidance. If the Today label creates clutter, record that finding and revise the treatment through review rather than silently dropping the explicit date cue.
