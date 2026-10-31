# Proposal

## Why

The current Home Tonight pivot suppresses usable recipe photography when Mystery night is saved, substituting a decorative icon and a second large Mystery heading. Households should see the proposed food while recognizing the saved Mystery plan.

## Outcome and Scope

Only saved Mystery night with a ready proposed recipe changes composition: Mystery night occupies the usual header above the normal 5:4 hero and normal recipe content. Showing a proposal does not accept it. No new invitation sentence, below-photo Mystery label, button change, or behavior change is included.

## What Changes

- Show the ready proposal's ordinary hero at the normal card width and proportions.
- Retain Mystery identity once in the normal header position and typography, above photography.
- Preserve Make this tonight, Quick Find and Order In, their styling and effects, readiness gates, fallback behavior and ordinary planned/unplanned states.
- Keep EN/FR, long titles, phone/iPad reflow, keyboard operation and touch targets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: clarify saved Mystery photography and its header hierarchy, including the existing cookbook fallback scenario.

## Impact

Presentation in `pwa/src/components/home/TonightPivotCard.tsx`, its unit regressions and existing Home E2E coverage. Reuse `TonightRecipeImage` and `TonightCardBase`; no API, generated client, persistence, dependency or telemetry changes. Existing dirty/index work belongs to concurrent owners and must be preserved. Runtime edits and checks wait for coordinator release.
