# Design

## Context and Existing Ownership

See proposal.md for scope. Source inspection of `pwa/src/app/(app)/planner/page.tsx` confirms that `vote-count` derives its count from `day._voteCount ?? day.recipe?.voteCount ?? null`, chooses the vote branch only for a positive count, and hardcodes both badge strings. This establishes the source cause; live browser reproduction is not yet evidence.

`pwa/src/store/weekStore.ts` composes suggestions with `_isPending` and vote metadata, while persisted recipe content takes precedence. `meal-planning` owns this presentation boundary. A positive count can occur on an assigned recipe too; vote totals do not encode persistence.

`pwa/src/locales/index.ts` already supplies `t` and `tWithVars`, backed by English and French `common.json` tables. Interpolation does not perform plural selection. `pwa/e2e/fixtures.ts` supports `appLocale`; `pwa/e2e/planner.spec.ts` already covers localized Planner rows with shared builders and routes. The Planner unit suite delegates translation to the real tables with a controlled locale, so it can cover count and locale variants; browser acceptance additionally exercises the fixture-to-render path.

## Decisions and Tradeoffs

- Add `planner.chosen`, `planner.votedOne` and `planner.votedOther` in both locale tables. Use `t` for chosen and `tWithVars` for the selected vote variant, selecting one only for count 1. This bounded positive-integer domain needs no new pluralization library or shared translation API.
- Use “Choisie” to refer to the recipe; French vote forms are “{{count}} vote” and “{{count}} votes”. Keep both English variants “{{count}} voted” for compatibility.
- Preserve count precedence, positive-count branching, unanimity styling, `vote-count` test ID, pending state, and assignment actions. Do not replace the count branch with a pending-versus-assigned branch: that would change behavior beyond localization.
- Keep zero/null/undefined handling on the existing chosen branch, including any pending row reaching it. The label is existing presentation, not new confirmation of server persistence. State-model improvements are outside this change.

## First Observable Slice

Add a focused browser regression in `pwa/e2e/planner.spec.ts` using `test.use({ appLocale: 'fr' })`, existing builders and `setupCommonRoutes`. Render a saved recipe with no positive votes beside a pending smart-default suggestion with two votes. Exercise the real locale table → translation helper → Planner row path. Observe the expected failure before changing the labels, then localize and obtain green.

Use the existing `GET /api/schedule?weekOffset=...` schedule envelope and `GET /api/schedule/{weekOffset}/smart-defaults` suggestion envelope. Reuse method-sensitive mock handlers in `pwa/e2e/mock-api.ts` and schema-compliant builders; no route, payload or state-transition changes are intended. Assert that rendering submits no `POST /api/schedule/assign`, and a reread still returns an empty persisted slot for the suggestion. This proves browser behavior against the fixture, not live backend persistence.

Extend the same focused coverage to both locales, counts 1, 2 and 12, zero/missing count, and an assigned row retaining positive votes. Test narrow phone layout at 320px and enlarged text at 200%, with labels readable and controls reachable. No additional backend seam is affected.

## User Experience

Keep the current compact badge and all actions. Vote copy conveys household interest; the existing suggestion state and assignment flow continue to determine whether a meal is saved. Preserve focus, recipe opening, drag controls, non-cooking rows and empty-day actions. No new confirmation, explanation or aggregate badge is introduced.
