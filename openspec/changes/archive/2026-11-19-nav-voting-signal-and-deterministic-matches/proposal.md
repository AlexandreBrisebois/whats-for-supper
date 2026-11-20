# Proposal

## Why

On phones, `HomeCommandCenter` (`pwa/src/components/home/HomeCommandCenter.tsx`) renders `VotingNudgeCard` (`pwa/src/components/home/HomeSections.tsx`) beneath `TonightMenuCard`, pushing the Home voting invitation and status below the fold where people checking tonight's supper rarely scroll, while the center `Discovery` medallion in `pwa/src/components/common/Navigation.tsx` stays pinned above the fold on every route. At the same time, that medallion drops back to idle static yellow when a round converges (hiding completion on non-Discovery tabs), lacks a non-motion cue and `prefers-reduced-motion` guard while collecting, and `api/src/RecipeApi/Services/SmartDefaultsReader.cs` lacks a tie-breaker after `(unanimous, LastCookedDate)`, allowing tied consensus recipes (such as never-cooked recipes) to appear on different days across separate reads. Finally, once a member reaches Planner for a converged round, Planner still shows `Nudge family` as a solid green primary button, `Close Voting` as a terracotta outline with a `Ban` icon, and a pulsing ochre header dot—making it unclear that closing the vote saves the converged matches and completes the round.

## Outcome and Scope

Consolidate global voting status and navigation into the persistent center bottom-navigation medallion across all routes, remove the redundant below-the-fold Home voting section, clarify Planner's converged save-and-close CTA so families can finish the round smoothly, and make consensus day placement deterministic across all household members.

- **In scope:**
  - Remove `VotingNudgeCard` and Home voting checking/unavailable recovery from Home while preserving `Capture a Recipe`, Tonight supper decisions, and bottom `Recipes` navigation.
  - Upgrade the bottom-navigation Discovery medallion to communicate all three authoritative voting session phases (`unowned`, `collecting`, `converged`) using Era 3 semantic tokens, non-color/non-motion cues, `prefers-reduced-motion` support, a stateful converged label (`"Menu's in"` in English, `"Menu prêt"` in French), and direct non-mutating navigation to the converged round's absolute week in Planner's Meals tab (`"planner"`).
  - Preserve `/discovery`'s existing green `SuccessCard` celebration (`"Menu's in!"` → `"See your matches"`) for voters already on `/discovery` when convergence happens and for anyone visiting `/discovery` directly (such as via shared `Nudge family` links).
  - Promote Planner's close action to a primary Garden-green `<Check />` button (`"Save menu & close voting"` / `"Enregistrer et fermer le vote"` when pending suggestions exist, or `"Close Voting"` / `"Fermer le vote"` otherwise), hide `Nudge family`, switch the week-header voting dot to steady Garden green when confirmed converged for the loaded round/week, and update the English post-close confirmation toast (`planner.weekFinalized`) from `"Menu's in!"` to `"Menu saved!"`.
  - Add ascending `RecipeId` tie-breaking in `api/src/RecipeApi/Services/SmartDefaultsReader.cs` after `(unanimous, LastCookedDate)` so all household members observe identical consensus selection and day placement for the same vote and schedule state.
- **Explicit exclusions:**
  - Does not change convergence thresholds, host-lifetime latching, late-vote semantics, or the underlying `closeVoting()` persistence sequence; voting rounds still remain open until explicitly closed in Planner.
  - Does not auto-navigate an active voter away from `/discovery` upon convergence, change Planner's `Ask the Family` / `Portions` / `Meals`–`Grocery` controls outside the converged voting state, or alter OpenAPI request/response schemas.

## What Changes

- **Home (`pwa/src/components/home/HomeCommandCenter.tsx`, `pwa/src/components/home/HomeSections.tsx`):** Remove the below-the-fold `VotingNudgeCard` and Home voting-status/retry block so Home focuses exclusively on Tonight's supper and `Capture a Recipe`.
- **Global bottom navigation (`pwa/src/components/common/Navigation.tsx`, `pwa/src/app/globals.css`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`):**
  - **`unowned` / absent / unavailable:** Quiet tonal Sunlight ochre (`bg-ochre-100 text-sunlight-ink border-sunlight-line`) with `Compass` icon and localized `"Discovery"` / `"Découverte"` label, routing to `/discovery` for preemptive voting.
  - **`collecting` (with pending cards and not on `/discovery`):** Sunlight ochre with `Compass`, looping pulse animation (disabled under `prefers-reduced-motion: reduce`), a static non-motion status indicator, and a descriptive localized accessible label; stops pulsing and hides the indicator on `/discovery` or when the member has no remaining cards.
  - **`converged` (confirmed round with valid absolute Monday):** Steady cooled-herb Garden green (`bg-garden-fill text-white border-garden-fill-deep`), `Check` icon replacing `Compass`, stateful localized label `"Menu's in"` / `"Menu prêt"` (`text-garden-ink`), descriptive accessible name, at most a single non-repeating arrival pulse when motion is allowed, and **persistent** visibility across routes until voting is explicitly closed (`unowned`) or replaced by a new `collecting` round. Activating it navigates directly to `/planner?weekOffset=0&referenceWeekStartDate=<monday>` with the Meals tab active (preserving Planner's `requestPortionsDeparture` guard and falling back to `/discovery` if a valid Monday is unavailable) without assigning meals or closing voting.
- **Planner converged CTA (`pwa/src/app/(app)/planner/page.tsx`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`):**
  - Derive `isConvergedWeek` from `isVotingOpen`, `session?.phase === 'converged'`, matching `votingRoundId`, and matching `absoluteMonday(session.weekStartDate) === weekStartDate` (falling back to existing `collecting` controls if session state is loading, unavailable, `collecting`, or mismatched).
  - When `isConvergedWeek` is true (in both ordinary Planner and Portions mode), hide `nudge-family-cta` (nothing left to vote for across the household) to free row width, promote `close-voting-btn` to solid Garden green (`bg-garden-fill hover:bg-garden-fill-deep text-white`) with `<Check />` replacing `<Ban />`, label it `"Save menu & close voting"` / `"Enregistrer et fermer le vote"` when pending recipe suggestions exist (or `"Close Voting"` / `"Fermer le vote"` when none exist), display a steady Garden-green dot in the week header (`motion-reduce:animate-none` added to the collecting ping), and show `"Menu saved!"` in English (keeping `"C'est validé !"` in French) in the post-close confirmation toast.
- **Deterministic suggestions (`api/src/RecipeApi/Services/SmartDefaultsReader.cs`):** Add `.ThenBy(x => x.RecipeId)` after `.OrderByDescending(x => x.VoteCount == familySize).ThenByDescending(x => x.Recipe.LastCookedDate)` so tied consensus candidates select and order deterministically across every read and member session.

## Capabilities

### New Capabilities

<!-- None; all behavior belongs to existing capability owners. -->

### Modified Capabilities

- `tonight-meal-decisions`: Remove Home's below-the-fold voting card, Home voting-status/retry recovery, and Home matches handoff while preserving Home `Capture a Recipe` and bottom `Recipes` navigation.
- `recipe-discovery`: Expand the bottom-navigation Discovery control requirement to cover `unowned`, `collecting` (with static reduced-motion-safe status cue), and persistent Garden green `Check` + `"Menu's in"` / `"Menu prêt"` on `converged` with direct non-mutating navigation to the converged Planner week's Meals tab; add deterministic ascending `RecipeId` tie-breaking to consensus suggestion ranking.
- `meal-planning`: Promote the converged week close action to primary Garden green `<Check />` with save-and-close copy (`"Save menu & close voting"` / `"Enregistrer et fermer le vote"` when pending suggestions exist, else `"Close Voting"` / `"Fermer le vote"`) and a steady Garden-green header dot while hiding `Nudge family` during confirmed household-wide convergence (including Portions mode).

## Impact

- **Backend:** `api/src/RecipeApi/Services/SmartDefaultsReader.cs`, `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs` (and `api/src/RecipeApi.Tests/Services/VotingSessionTests.cs` as needed). No OpenAPI schema, endpoint, or Kiota client changes.
- **Frontend:** `pwa/src/components/common/Navigation.tsx`, `pwa/src/app/globals.css`, `pwa/src/components/home/HomeCommandCenter.tsx`, `pwa/src/components/home/HomeSections.tsx`, `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`.
- **Unit & contract tests:** `pwa/src/components/common/Navigation.test.tsx`, `pwa/src/components/home/HomeCommandCenter.test.tsx`, `pwa/src/components/home/HomeDuration.test.tsx`, `pwa/src/app/(app)/planner/page.test.tsx`, verified alongside `pwa/src/test/visual-contract.test.ts` and `pwa/src/test/tokens.test.ts`.
- **E2E & accessibility checks:** `pwa/e2e/home-recipe.spec.ts`, `pwa/e2e/discovery.spec.ts`, `pwa/e2e/planner.spec.ts`, `pwa/e2e/supper-servings.spec.ts`, `pwa/e2e/planner-voting-identity.spec.ts`, `pwa/e2e/voting-session-live.spec.ts` (including `assertCookbookVisualA11y` in Standard `'aa'` and High Contrast `'aaa'` modes across `320px`/200% text, phone, tablet, EN/FR, and reduced motion).
- **Documentation:** `docs/visual-language-reference.md` (align notes referencing `VotingNudgeCard` on Home).
