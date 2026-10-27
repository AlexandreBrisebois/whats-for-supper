# Proposal

## Why

Human designer feedback asks for clearer orientation within a Planner week, especially later in the week. Source inspection shows that day rows have no explicit Today label or past-date treatment; the existing sage success ring represents separate action feedback and cannot communicate calendar position.

## Outcome and Scope

Experiment with a clear border and localized Today label for the authoritative current date, and quieter decorative treatment for earlier dates while preserving readability. Past means earlier than today, not cooked, completed, unavailable or unsuccessful. Future dates retain the normal treatment. Date emphasis belongs to the date slot and must stay there if recipes move.

This is one reversible candidate for qualitative review against the existing Planner, not an A/B test, analytics project or proven usability improvement. Evaluate on a midweek and weekend view as well as Monday. No automatic rollout or permanent visual-language adoption is included in planning.

## What Changes

- Identify today explicitly with a readable border and `Today` / `Aujourd’hui` label, independent of meal type or status.
- Reduce past rows' decorative prominence without fading the entire row, lowering essential text contrast, disabling controls or adding completion signals.
- Use existing authoritative deployment-calendar context; omit temporal emphasis when reliable context is unavailable, and update it when that context refreshes.
- Compare the candidate with baseline for date recognition, readable past content and correct interpretation of uncooked past meals.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: date-relative visual orientation without changing meal state or action availability.

## Impact

- Planner page and date-row presentation, plus existing reactive calendar/freshness consumption as needed.
- EN/FR locale files for the Today label and existing page/browser tests for date/state separation.
- Reuse `deployment-calendar.ts`, `todayStore` and the established refresh lifecycle. No browser-local date policy, API/schema, generated client, persistence or dependency changes.
- Compatible with `fix-planner-fixed-date-drag`: emphasize the fixed date/slot wrapper, never the movable recipe identity. The experiment can be reviewed on the existing row layout first; drag implementation is not a prerequisite.
- Preserve the badge-removal and return-arrow plans. Grocery transitions, enlarged today cards, new cooked indicators and broader Planner contrast repairs remain outside this experiment.

The visual starting point is proposed, not observed. No runtime or usability validation has been performed for this experiment during planning.
