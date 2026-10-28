# Proposal

## Why

Home's planned-meal actions are hidden behind a whole-card flip, while both Tonight cards use small uppercase labels and low-contrast supporting copy. The pivot gives GOTO setup stronger emphasis than choosing supper when no ready GOTO exists. These are source-observed treatments, not findings from a new live usability study.

## Outcome and Scope

Make tonight's context readable, cooking and changed-plan recovery directly discoverable, and an unassigned GOTO visibly distinct from tonight's chosen recipe. Apply the existing Solar Earth visual language to `TonightMenuCard` and `TonightPivotCard`, including their EN/FR copy and mobile layout.

Deliver three bounded implementation sessions, each with its own acceptance: (1) readable card presentation, (2) front-facing planned-meal actions and explicit ingredient disclosure, (3) pivot choice hierarchy. Integrate and verify the combined result afterward. This proposal authorizes planning only.

Preserve assignment optimism, authoritative date targeting, GOTO eligibility, recovery stages and failure semantics. Exclude backend/API/schema changes, new persistence indicators, a new suggestion engine/card, delivery ordering, global token/button redesign, navigation/zoom changes, cooked-feedback redesign and unrelated Home sections. No consequential open decision blocks this proposal; exact spacing and shadow tuning remain bounded visual choices.

## What Changes

- Increase essential context and action-label readability using existing typography and darker token variants; keep the existing localized duration wrapper and units.
- Keep food imagery and rounded surfaces, reduce competing shadows, and allow text and actions to grow without fixed-height clipping.
- Show Cook and Change plan on the planned card's initial face; replace implicit whole-card flipping with an explicit View ingredients disclosure and clear return action.
- Prioritize Make this tonight for a ready GOTO, and Quick Find otherwise; present Order In as an enabled secondary choice, with GOTO setup below immediate supper decisions.
- Distinguish empty, ready GOTO, checking, preparing and saved Mystery context without claiming that display proves persistence.
- Verify affected touch targets, keyboard/focus behavior, contrast, reduced motion and EN/FR reflow within each session.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: readable/responsive Tonight presentation, directly available planned-meal actions and explicit details disclosure, and state-aware supper-choice hierarchy. Existing data and mutation requirements remain authoritative.

## Impact

Primary owners: `pwa/src/components/home/TonightMenuCard.tsx` (including `TonightCardBase`), `TonightPivotCard.tsx`, Home tests and EN/FR locale keys. `HomeCommandCenter.tsx` is integration context; change its wiring only if required to preserve current callbacks, not to add policy. Relevant browser suites are `home-recipe`, `home-goto`, `home-race` and `tonight-replacement-recovery`; mocks remain owned by `pwa/e2e/mock-api.ts` and scenario-local handlers.

Use existing values in `pwa/src/app/globals.css` and guidance in `docs/visual-language-reference.md`. No new dependency, API operation, generated client or database migration is proposed. Main specs remain untouched until a separately requested sync/archive step.
