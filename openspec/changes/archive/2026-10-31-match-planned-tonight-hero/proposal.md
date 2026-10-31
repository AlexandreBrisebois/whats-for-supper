# Proposal

## Why

The planned Tonight photograph becomes noticeably shorter than the ready-GOTO pivot photograph for the same dish and viewport. Source inspection identifies the planned-only 160–240 CSS px viewport clamp; the user approved retaining the pivot's taller photographic presence.

## Outcome and Scope

Loaded planned and ready-GOTO photographs have matching 5:4 geometry at equal inner widths on phones and iPad. The planned card and following Home content may require normal page scrolling. Preserve state-specific spacing, controls, disclosure, image cover crop, rounded corners, width caps and modest missing/failed-image fallbacks. No cooking, API, telemetry or global image changes.

## What Changes

- Give planned usable imagery the ready-GOTO pivot's 5:4 proportions.
- Keep that geometry at the same width when viewport height decreases.
- Replace the initial no-scroll lower-handoff obligation with readable, reachable handoffs through normal scrolling.
- Add rendered transition parity coverage and retain bilingual/reflow/fallback checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: planned photography and lower Home handoff composition.

## Impact

One image sizing utility in TonightMenuCard; focused Home Playwright assertions; a delta for the existing Tonight capability. No API/dependency changes. User implementation approval includes the increased scrolling tradeoff. The user subsequently authorized canonical spec sync and archival after implementation and verification complete.
