# Proposal

## Why

The initial implementation exposed Home's meal actions, clarified pivot choices and improved readability. Alex reports that it lost the original UI's refinement and cookbook feel, specifically rejecting dark text on yellow for the desired Home treatment. Source and retained browser images show a shallow image region and repeated prominent controls; earlier layout/contrast acceptance did not establish aesthetic acceptance.

## Outcome and Scope

Restore the feeling of a refined contemporary family cookbook to `TonightMenuCard` and `TonightPivotCard`: food photography and recipe typography lead, warm surfaces and considered depth frame them, and controls support the composition. Keep the implemented readable context, directly discoverable cooking/recovery, honest GOTO state, explicit ingredients and EN/FR reflow.

Sessions 1–4 and their recorded evidence remain historical implementation checkpoints. The revision adds three bounded follow-up sessions: 5 restores the planned card's cookbook composition, 6 applies it to pivot states, and 7 reconciles visual and functional acceptance. This update changes planning/reference documents only; implementation is a later apply request.

Preserve assignment optimism, authoritative date targeting, GOTO eligibility, recovery stages and failure semantics. Exclude backend/API/schema changes, new persistence indicators, a new suggestion engine/card, delivery ordering, global token/button redesign, new fonts/dependencies, navigation/zoom changes, cooked-feedback redesign and unrelated Home sections. Restore generous imagery without fixed-height text clipping. The supplied meal-card [Screenshot_20261026-212933.png](../../../../docs/visual-language/references/Screenshot_20261026-212933.png) anchors composition: a portrait-shaped card, nearly square dominant food photograph, deep rounded corners, soft elevation, strong recipe title and a restrained blush terracotta duration pill. The pivot reference [Screenshot_20261026-212918.png](../../../../docs/visual-language/references/Screenshot_20261026-212918.png) shares the rounded frame, food emphasis, title and soft elevation but uses a wider photograph and a primary action above two side-by-side secondary choices. Preserve this relationship rather than forcing identical image proportions or stacked controls onto both states. Retain readable context and current action access rather than copying faint labels, hidden controls or the rejected yellow action. No consequential open decision blocks this proposal; exact crop, spacing and shadow tuning remain bounded visual choices.

## What Changes

- Increase essential context and action-label readability using existing typography and darker token variants; keep the existing localized duration wrapper and units.
- Restore generous near-square/portrait food imagery at ordinary mobile text sizes, warm paper-like surfaces, confident editorial titles and purposeful depth; allow text/actions to grow independently of the image.
- Show Cook and Change plan on the planned card's initial face; replace implicit whole-card flipping with an explicit View ingredients disclosure and clear return action.
- Prioritize Make this tonight for a ready GOTO, and Quick Find otherwise; present Order In as an enabled secondary choice, with GOTO setup below immediate supper decisions.
- Distinguish empty, ready GOTO, checking, preparing and saved Mystery context without claiming that display proves persistence.
- Verify affected touch targets, keyboard/focus behavior, contrast, reduced motion and EN/FR reflow within each session.
- Use rich existing terracotta with light text for Home's primary action, including Cook and ready-GOTO confirmation. Use ochre as a restrained accent here, not a dark-text/yellow action surface. Give Change plan a quieter secondary treatment and ingredient disclosure a text-style affordance with a generous hit area.
- Require same-content, same-viewport comparison with the original UI and the current implementation, including representative food photography. Preserve usable actions while restoring a recipe-led composition; missing-image stress fixtures alone cannot establish aesthetic acceptance.
- Reconcile the visual-language prose and both schematic boards so mathematical contrast examples do not prescribe a utilitarian Home composition or a global palette change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: preserve the initial six requirements and add cookbook composition and Home action styling. Existing data and mutation requirements remain authoritative.

## Impact

Primary owners: `pwa/src/components/home/TonightMenuCard.tsx` (including `TonightCardBase`), `TonightPivotCard.tsx`, Home tests and EN/FR locale keys. `HomeCommandCenter.tsx` is integration context; change its wiring only if required to preserve current callbacks, not to add policy. Relevant browser suites are `home-recipe`, `home-goto`, `home-race` and `tonight-replacement-recovery`; mocks remain owned by `pwa/e2e/mock-api.ts` and scenario-local handlers.

Use existing values in `pwa/src/app/globals.css`. Update `docs/visual-language-reference.md` and its two SVG boards as review guidance, explicitly separating implemented treatments from the revised proposed direction. No new dependency, API operation, generated client or database migration is proposed. Main specs remain untouched until a separately requested sync/archive step. Earlier runtime records remain valid for their tested identities, not for this newly required aesthetic outcome.
