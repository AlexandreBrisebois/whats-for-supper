# Proposal

## Why

Human designer feedback reports faint drag handles, Plan supper and This week. Source inspection confirms charcoal at 20%, 45% and 30% respectively, plus pale hover treatments. Enabled actions can look unavailable, while useful week context becomes hard to read. Actual rendered contrast has not been measured in this planning pass.

## Outcome and Scope

Explore two bounded Solar Earth treatments for these three elements, using the existing visual-language reference and tokens. Deliver matched comparisons, actual-background contrast evidence and a recommendation before treating a candidate as settled visual guidance. This is a local presentation exploration; existing actions, gesture timing, keyboard behavior, dates and week navigation retain their meanings.

Keep This week's uppercase and letter spacing as the initial design, checking French wrapping and readability rather than banning uppercase. Keep Plan supper in sentence case and the handle as the established Lucide grip. This week is informational context, not a new control.

## What Changes

- Compare a neutral charcoal-led treatment with a warm action treatment using terracotta and dark sage.
- Strengthen default and applicable hover/pressed/focus/grabbed treatments; touch users must not depend on hover to recognize an action.
- Require 4.5:1 normal-text contrast and 3:1 meaningful grip/control-cue contrast on actual composite backgrounds.
- Use the existing `planner.planSupper` locale key for the currently hard-coded label so EN/FR comparisons exercise the actual action.
- Preserve existing functionality and compare the candidate with the quieter-past-date proposal where available.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: readable empty-day planning action and week-context label.
- `meal-rescheduling`: recognizable enabled drag handle across its applicable visual states.

## Impact

- `pwa/src/app/(app)/planner/page.tsx` and `pwa/src/components/planner/PlannerDragHandle.tsx`, plus focused page/handle/browser checks and review evidence.
- Reuse current locale values, tokens, surfaces and Lucide icon; no intended new keys, palette, typography system, icon system, dependency or API/client/persistence changes.
- Independent of badge removal and directional return-arrow changes. Coordinate with fixed-date dragging and day-emphasis experiments at shared file boundaries; this exploration neither implements nor blocks those plans.
- Do not expand into all Planner text, global button variants, gesture bug fixes, new touch-target standards or grocery continuity. Report adjacent issues separately.

No unresolved product choice blocks building the comparison: the two visual candidates are the experiment, not competing behavior policies. Source-inspected risks remain distinct from measured rendered results and attributed human feedback.
