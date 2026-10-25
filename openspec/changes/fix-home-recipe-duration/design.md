# Design

## Context and Existing Ownership

Main ba8dca21 has one preformatted caller: HomeCommandCenter invokes lib/formatTime.formatTotalTime before TonightMenuCard invokes lib/duration.formatRecipeTime. PT6H becomes 6h, then 6 MINS. ScheduleService, planner normalization and todayStore preserve totalTime. Current prop is totalTime; older history named it prepTime, but it still represented total time.

Duration rendering ownership (all inputs are recipe totalTime strings, normally ISO 8601):

| Surface | Handoff and rendering owner |
| --- | --- |
| Home | HomeCommandCenter → TonightMenuCard → formatRecipeTime; remove the earlier formatTotalTime call |
| Discovery | DiscoveryCard formats raw totalTime |
| Swipe stacks / Browse | RecipeStackCard formats raw totalTime |
| Browse list | browse-all-stack/page formats raw recipe.totalTime |
| Search top pick and results | recipes/page formats raw totalTime in both branches |
| Quick Find | QuickFindModal formats raw currentRecipe.totalTime |
| Recipe detail | RecipeDetailSheet formats raw fetched recipe.totalTime |
| Planner, Cook's Mode, capture previews | Reuse RecipeDetailSheet; no separate prep/cook duration display |

These are eight common.readyIn expressions across seven render files. Each uses tWithVars and the same formatter. English is READY IN {{time}}; French is PRÊT EN {{time}}. Formatter output remains the approved uppercase H/MINS vocabulary in both locales. Cooking step timers are distinct from recipe total duration.

## Decisions and Tradeoffs

Pass currentRecipe.totalTime through Home and format once at the display owner. Normalize empty/null to undefined at this handoff to retain the existing Home fallback behavior. Do not alter the shared parser, the existing 30-45 mins default (currently rendered 30 MINS), arbitrary natural-language handling, copy or ranking. No new abstraction is needed. Keep the legacy formatTime helper; deleting unrelated code is unnecessary.

PR #339 is open at 2378942 and touches Home and its existing unit test. This branch starts at main and must keep its change limited to the duration handoff. Add an isolated duration composition test to avoid overwriting that PR's test work. Demo work remains separate.

## First Observable Slice

Synthetic today state → real HomeCommandCenter → real TonightMenuCard → real formatter → real locale wrapper. Provider/state boundaries can be stubbed; the card, formatter and translations cannot. Observe the intended red for PT6H and PT1H30M before the handoff fix, then green for PT6H/PT1H30M/PT45M/PT360M, missing/empty and EN/FR. Retain raw-duration coverage through Discovery/stack and the shared formatter. Existing browser Home coverage exercises schedule/network composition; extend it proportionately for duration and iPad/iPhone/Pixel viewport checks.

## User Experience

No interaction, layout or copy changes. Hours remain hours. Inspect rendered badges at target viewports with both wrappers. Existing missing-time estimates are an adjacent trust issue to present for a separate decision.

## Risks and Deferrable Questions

The exact screenshot payload and deployed SHA are unknown. The source defect is reproducible without household data. A shared renderer can affect many Home recipes containing hours; it does not prove those stored recipes are corrupted. Extraction validation gaps and imported legacy strings require separate policy decisions before remediation.
