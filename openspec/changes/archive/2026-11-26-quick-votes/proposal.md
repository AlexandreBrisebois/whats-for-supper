# Proposal

## Why

As a household's recipe collection grows (200+ recipes, with 100+ eligible Supper cards in Discovery), voting through the entire queue becomes an unbounded chore—especially for the first family member voting, who sees cards with zero votes, cannot trigger `"Menu's in!"` alone, and cannot reach **Pass the phone** until exhausting all 100+ cards (`pwa/src/app/(app)/discovery/page.tsx`). Households need a calm, family-wide way to vote in short, satisfying bursts without losing progress or feeling pressured by counters.

## Outcome and Scope

**Outcome:** Households can opt in to **Quick Votes** (FR: _Votes rapides_) in Settings (`/profile/settings`, directly below **Pass the phone**), enabled family-wide and persisted in `family_settings` (`GET/POST /api/settings/quick_votes`) with a configurable target of positive likes (any whole number `>= 1`, default `16`). While swiping in Discovery, the screen stays 100% counter-free. Once a voter reaches the target number of likes in a Discovery visit while cards remain and the round has not converged, Discovery presents a calm, non-blocking check-in card (**"Your picks are in!"**) that celebrates their contribution without displaying any vote count and lets them **Pass the phone** (when enabled), **Nudge family** (when a round is open), leave naturally, or tap **Keep voting** to reset the turn counter and continue seamlessly at the next card. Leaving Discovery and returning later starts a fresh turn immediately with no extra tap required. During a locked **Pass the phone** child turn, reaching the target goes straight to the pure celebration card (`Nice picks, {name}!`) so the child hands the phone back cleanly.

**In scope:**

- **Family-wide Settings card (`/profile/settings`):** A compact **Quick Votes** section directly below **Pass the phone**, `OFF` by default, with a Garden `role="switch"`, a positive-integer target likes input + `-`/`+` stepper (minimum `1`, no upper cap, default `16`) shown when enabled, a collapsed-by-default **How it works** disclosure noting `"Applies to everyone in the family."`, and inline retry/recovery if reading or saving fails.
- **Persistence via existing generic family settings endpoint:** Stores `{ "enabled": boolean, "targetLikes": number }` under key `quick_votes` via existing `GET /api/settings/quick_votes` and `POST /api/settings/quick_votes` (`api/src/RecipeApi/Controllers/SettingsController.cs`, `api/src/RecipeApi/Services/SettingsService.cs`). Missing (`404`) or unavailable settings fall back safely to `{ enabled: false, targetLikes: 16 }` without blocking Discovery.
- **Counter-free swiping view:** Zero numbers, progress bars, or quota indicators during swiping.
- **Calm non-blocking check-in card (normal turn):** Shown when `Quick Votes` is ON, `likesThisTurn >= targetLikes`, cards remain in the stack, and `session.phase !== 'converged'`. Uses a Tier 1 white card with a Sunlight ochre medallion (visually distinct from `"Menu's in!"`), heading **"Your picks are in!"**, warm copy (_"Let's see what the rest of the family thinks — come back anytime, or keep going."_), no displayed count, **Pass the phone** (when device opt-in is ON and `otherMembers.length > 0`), **Nudge family** (when `ownsRound`), and **Keep voting**.
- **Repeating cadence & fresh return:** Tapping **Keep voting** resets `likesThisTurn` to `0` and resumes immediately at the next card without refetching, repeating every `targetLikes` likes (`16 → 32 → 48`). Navigating away from Discovery and returning later starts a fresh turn (`likesThisTurn = 0`) with cards ready immediately. Dislikes/passes never increment `likesThisTurn`, and switching members resets `likesThisTurn` to `0`.
- **Locked Pass-the-phone turn completion:** During a locked `Pass the phone` turn, reaching `targetLikes` likes (while cards remain and not converged) presents the pure kid celebration card (`Nice picks, {name}!`, zero card buttons) and allows direct return via **← Back to {origin}** on the Handoff Dock without a mid-stack exit confirmation prompt.
- **Precedence:** Household convergence (`"Menu's in!"`) always supersedes the check-in card immediately (including on the target-reaching like or while viewing the check-in card). Exhausting the stack before reaching `targetLikes` still shows `"That's a wrap!"` (or kid wrap-up).

**Out of scope / exclusions:**

- Changes to vote storage (`RecipeVotes`), consensus thresholds, queue ranking, Dreaming rotation, or OpenAPI schema (`specs/openapi.yaml` already defines `/api/settings/{key}`).
- Per-member Quick Votes preferences or showing individual completion/vote counts anywhere in the UI.
- Blocking or locking a member out of Discovery after reaching the target.

## What Changes

- **Settings (`/profile/settings`):** Adds `QuickVotesSettingsSection` directly below `PassThePhoneSettingsSection` backed by `GET/POST /api/settings/quick_votes`.
- **Discovery & Handoff Dock:** Tracks an ephemeral per-visit `likesThisTurn` counter in `discovery/page.tsx` (zero UI while swiping), adds the **"Your picks are in!"** check-in card (integrating `PassThePhone` and `Nudge family` when eligible), sends locked `Pass the phone` turns to `Nice picks, {name}!` when the target is reached, and treats that completed kid state as directly returnable in `Navigation.tsx`.
- **Locales & Tests:** Adds EN/FR keys (`settings.quickVotes.*`, `discovery.quickVotes.*`) in `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json`, unit tests, and Playwright E2E + visual/a11y checks.
- No breaking changes; no API, OpenAPI, or database migration changes.

## Capabilities

### New Capabilities

_None._ Quick Votes is part of Discovery voting and household settings behavior already owned by `recipe-discovery`.

### Modified Capabilities

- `recipe-discovery`: adds family-wide **Quick Votes** settings configuration (`enabled`, positive integer `targetLikes` defaulting to `16`), counter-free swiping, calm repeating **"Your picks are in!"** check-in card with **Keep voting** / **Pass the phone** / **Nudge family**, fresh-turn behavior on return, convergence precedence, and locked kid-turn celebration completion + direct Handoff Dock return.

## Impact

- **PWA:** `pwa/src/lib/api/settings.ts` (or `discovery.ts` wrapper around `apiClient.api.settings.byKey('quick_votes')`), `pwa/src/components/profile/QuickVotesSettingsSection.tsx`, `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`, `pwa/src/app/(app)/discovery/page.tsx`, `pwa/src/components/common/Navigation.tsx`, `pwa/src/store/discoveryStore.ts` (optional `isTurnCompleted` flag for Handoff Dock direct return), and EN/FR locale files `pwa/src/locales/en/common.json` + `pwa/src/locales/fr/common.json`.
- **Backend / OpenAPI / Database:** Reuses existing `GET /api/settings/{key}` and `POST /api/settings/{key}` (`api/src/RecipeApi/Controllers/SettingsController.cs`, `api/src/RecipeApi/Services/SettingsService.cs`, `family_settings` table); no contract or schema changes.
- **Tests:** Unit tests for Settings section, `discovery/page.test.tsx`, `Navigation.test.tsx`, `locale-integrity.test.ts`, plus Playwright E2E and `assertCookbookVisualA11y` in `pwa/e2e/discovery.spec.ts`.
