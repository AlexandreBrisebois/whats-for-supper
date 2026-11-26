# Design

## Context and Existing Ownership

The proposal states motivation and scope; `specs/recipe-discovery/spec.md` (with this change's delta) owns the observable behavior.

Observed in source:

- **Family-wide settings persistence:** `api/src/RecipeApi/Controllers/SettingsController.cs` exposes `GET /api/settings/{key}` and `POST /api/settings/{key}`, backed by `api/src/RecipeApi/Services/SettingsService.cs` and `family_settings` (`api/src/RecipeApi/Models/FamilySetting.cs`). The contract is already published in `specs/openapi.yaml` and generated into `pwa/src/lib/api/generated/api/settings/`. Note that `SettingsController.UpsertSetting` extracts `"value"` from the JSON body if present (otherwise stores the body), and returns `{ data: { key, value } }`. Missing keys return `404`.
- **Settings UI anatomy:** `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx` renders `FamilyManagement` → `PassThePhoneSettingsSection` → `UsualPortionsSection` → `SearchIndexSection` → `FailedCapturesSection` → `PreviewFeaturesSection`. `PassThePhoneSettingsSection` (`pwa/src/components/profile/PassThePhoneSettingsSection.tsx`) establishes the Era 3 card pattern: Tier 2 `rounded-3xl border border-chrome-line bg-white p-6 shadow-card`, Garden `role="switch"`, and a collapsed-by-default `ChevronDown` **How it works** disclosure.
- **Discovery voting & Pass the phone integration:** `pwa/src/app/(app)/discovery/page.tsx` tracks `recipes` in `useDiscoveryStore`, handles `handleSwipeRight` / `handleSwipeLeft`, integrates `PassThePhone` (`pwa/src/components/discovery/PassThePhone.tsx`) and `FamilyNudgeDialog` (`pwa/src/components/discovery/FamilyNudgeDialog.tsx`), and checks `converged` (`session?.phase === 'converged'`).
- **Handoff Dock exit behavior:** `pwa/src/components/common/Navigation.tsx` renders the quiet Handoff Dock when `handoffLock` is set and currently gates the mid-stack confirmation modal on `const hasRemainingCards = discoveryStack.length > 0 || hasPendingCards`.

## Decisions and Tradeoffs

1. **Reuse `GET/POST /api/settings/quick_votes` instead of adding a dedicated endpoint or table.**
   - _Choice:_ Store `{ "enabled": boolean, "targetLikes": number }` under key `quick_votes` via the existing generic family settings endpoint (`apiClient.api.settings.byKey('quick_votes')`), wrapped in a typed PWA helper `pwa/src/lib/api/quick-votes.ts`.
   - _Tradeoff:_ Avoids backend/OpenAPI/migration churn while achieving true family-wide persistence across devices. Unlike `supper_servings_default`, Quick Votes has no optimistic version token, which is acceptable because Settings changes are infrequent last-write-wins household preferences; we still guard against unreadable responses and preserve drafts/retries in the UI instead of silently resetting on error.
   - _Validation & fallback:_ On read, `404` or malformed payloads normalize safely to `{ enabled: false, targetLikes: 16 }`. On save, `targetLikes` must be a safe positive integer (`>= 1`, no artificial upper cap); invalid inputs display an inline alert and never post.

2. **Place `QuickVotesSettingsSection` directly below `PassThePhoneSettingsSection`.**
   - Grouping the two Discovery pacing/coordination controls together in `SettingsPageContent.tsx` makes both easy to discover while clearly distinguishing scope in their **How it works** flyouts (`"Only turns on for this device."` vs `"Applies to everyone in the family."`).
   - _Control design:_ Garden `role="switch"` for ON/OFF. When ON, smoothly reveal a `min-h-12` numeric input + `-` (disabled at `1`) and `+` stepper buttons with `min-h-12 min-w-12` touch targets and `inputMode="numeric"` so households can either tap to adjust around the default `16` or type any positive number (`>= 1`). Saves immediately on toggle or stepper change (debounced/flush on numeric input, matching `UsualPortionsSection.tsx` hygiene so partial typing like clearing the field doesn't fire invalid saves).

3. **Ephemeral per-visit turn state in `discovery/page.tsx` (counter-free UI, fresh return).**
   - _Choice:_ Keep `likesThisTurn` and `quickVotesCheckInOpen` in local component state inside `pwa/src/app/(app)/discovery/page.tsx` rather than persisting them in `sessionStorage` or `localStorage`.
   - _Behavior:_
     - Every `handleSwipeRight` while `!converged` increments `likesThisTurn` (passes in `handleSwipeLeft` do not).
     - When `quickVotes.enabled` is true, `likesThisTurn >= quickVotes.targetLikes`, `updatedRecipes.length > 0` (cards remain), and `!converged`:
       - In a normal turn (`!isLockedTurn`): open `quickVotesCheckInOpen = true`.
       - In a locked `Pass the phone` turn (`isLockedTurn`): set `quickVotesKidCompleted = true`, rendering the existing `discovery-kid-wrap-up` celebration card (`Nice picks, {name}!`).
     - Tapping **Keep voting** on `"Your picks are in!"` sets `likesThisTurn = 0` and `quickVotesCheckInOpen = false`, immediately revealing `recipes[0]` (the exact next unvoted card already in `useDiscoveryStore.discoveryStack`) with zero network refetch.
     - Navigating away unmounts `DiscoveryPage`, so returning to `/discovery` naturally starts with `likesThisTurn = 0` and `quickVotesCheckInOpen = false` — zero extra taps to resume.
     - Switching members via `PassThePhone` resets `likesThisTurn = 0`, `quickVotesCheckInOpen = false`, and `quickVotesKidCompleted = false`.
   - _Tradeoff:_ Refreshing the browser mid-turn resets the in-memory turn count rather than remembering partial progress. That aligns with the zero-pressure, no-counter posture and guarantees no stale check-in ever blocks returning voters.

4. **Signal completed locked kid turns to `Navigation.tsx` for direct Handoff Dock return.**
   - In `Navigation.tsx`, `hasRemainingCards` previously assumed a kid finishes only when `discoveryStack.length === 0`. With Quick Votes, a child hits `Nice picks, {name}!` while `discoveryStack.length > 0`.
   - _Choice:_ Add a lightweight transient flag in `useDiscoveryStore` (`handoffTurnCompleted: boolean`, `setHandoffTurnCompleted(completed: boolean)`), set to `true` when `isLockedTurn` displays `discovery-kid-wrap-up` (via Quick Votes target or empty stack) and cleared on unmount/handoff/return/cancel. `Navigation.tsx` treats `hasRemainingCards` as `(discoveryStack.length > 0 || hasPendingCards) && !handoffTurnCompleted`, so tapping `← Back to {origin}` from `Nice picks, {name}!` returns directly without a confusing `"Return to {origin}?"` mid-stack prompt.

5. **Visual distinction for `"Your picks are in!"` (no count, non-converged).**
   - Uses Tier 1 white cookbook card (`rounded-[2.5rem] border border-chrome-line bg-white px-4 py-8 text-center shadow-card sm:px-6`) with a Sunlight Ochre medallion (`bg-ochre-100 border-sunlight-line text-sunlight-ink`, e.g., `Sparkles` or `Star` icon) — never solid Garden green (`SuccessCard`), reserving Garden green strictly for `"Menu's in!"`.
   - Actions stack in clear hierarchy (`min-h-12` pill buttons, `320 px` safe):
     1. **Keep voting** (`bg-hearth-fill text-cream-100`, primary action to continue the burst)
     2. **Pass the phone** (`PassThePhone` component, Garden tonal `bg-sage-50 border-garden-line text-garden-ink`, rendered when `passThePhoneEnabled || isCurtainPending`, `!converged`, `otherMembers.length > 0`, `currentMember`)
     3. **Nudge family** (`bg-white border-garden-line text-garden-ink`, rendered when `ownsRound`)
   - Note: While `quickVotesCheckInOpen` or `quickVotesKidCompleted` is true, hide the bottom `✕` / `♥` thumb buttons (same as `isLockedTurn && recipes.length === 0`) so thumb buttons don't sit inactive beneath the check-in card.

## First Observable Slice

Enable Quick Votes in Settings (`targetLikes = 2` in test/E2E or `16` default) → swipe target likes in Discovery with zero counters visible → see **"Your picks are in!"** → tap **Keep voting** → swipe seamlessly from the next card → navigate away and return directly to cards.

- **Entry:** `/profile/settings` toggles Quick Votes ON (`POST /api/settings/quick_votes` with `{ enabled: true, targetLikes: 16 }` or custom integer).
- **Steps:** Open `/discovery` → confirm zero counter chrome while swiping → like `targetLikes` cards (with remaining cards in stack and non-converged session) → verify `"Your picks are in!"` renders without any count → tap **Keep voting** → verify next card renders immediately → like `targetLikes` more cards → verify check-in repeats.

## State, Concurrency and Recovery

- **Settings load/save:**
  - `GET /api/settings/quick_votes` `404` → treated cleanly as `{ enabled: false, targetLikes: 16 }` (not an error).
  - Non-404 read failure → Settings card shows inline Hearth recovery banner with `Retry`; Discovery silently defaults to `{ enabled: false, targetLikes: 16 }` so voting is never blocked.
  - Save failure on `POST /api/settings/quick_votes` → Settings card shows inline Hearth error with `Retry` and keeps user's draft intact (or reverts optimistic switch only with clear error feedback + retry).
- **Rapid swipes & convergence race:**
  - If `session.phase === 'converged'` arrives on swipe `N` or while `quickVotesCheckInOpen` is true, the `if (converged)` early return in `discovery/page.tsx` takes precedence immediately and shows `"Menu's in!"`.
  - If `likesThisTurn` hits `targetLikes` on the final card in the stack (`updatedRecipes.length === 0`), exhausted-queue logic runs (`loadNextCategory` / `"That's a wrap!"` or `Nice picks, {name}!`) rather than `"Your picks are in!"`.

## User Experience

- **Era 3 / Dual-Mode Tokens:** Reuse semantic tokens (`bg-white`, `bg-cream`, `bg-ochre-100`, `border-sunlight-line`, `text-sunlight-ink`, `bg-hearth-fill`, `text-cream-100`, `bg-sage-50`, `border-garden-line`, `text-garden-ink`, `border-chrome-line`, `text-ink-body`, `text-ink-muted`) verified in both Standard AA and High Contrast AAA at `320 px` and `200%` text scaling via `assertCookbookVisualA11y`.
- **Accessibility:**
  - Switch uses `role="switch"` with `aria-checked`, `aria-labelledby`, and `aria-describedby`.
  - Numeric target input uses explicit label, `inputMode="numeric"`, `min={1}`, `aria-invalid`, and `role="alert"` on invalid input; `-` / `+` buttons have localized `aria-label`s and `>= 48 x 48 CSS px` targets.
  - Check-in card moves or preserves logical focus cleanly; **Keep voting**, **Pass the phone**, and **Nudge family** meet `min-h-12`.
- **Copy (EN / FR):** New keys under `settings.quickVotes.*` and `discovery.quickVotes.*` in `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json` (_Votes rapides_, _Vos choix sont notés !_ / localized equivalents checked via `locale-integrity.test.ts`).

## Risks and Deferrable Questions

- **Coordination with `pass-the-phone-discovery-handoff`:** That completed unarchived change also modifies `pwa/src/app/(app)/discovery/page.tsx`, `pwa/src/components/common/Navigation.tsx`, and `pwa/e2e/discovery.spec.ts`. Because `pass-the-phone-discovery-handoff` is already implemented in those files on the working tree, `quick-votes` builds cleanly on top of them (`PassThePhone`, `handoffLock`, `SettingsPageContent`); if `pass-the-phone-discovery-handoff` is synced/archived first, no spec delta conflict occurs because `quick-votes` puts all new requirements in `## ADDED Requirements`.
- **E2E & `mock-api.ts` support:** `pwa/e2e/mock-api.ts` must handle `GET /api/settings/quick_votes` (`404` when unset, `200` when saved) and `POST /api/settings/quick_votes` in-memory per test context so Playwright scenarios exercise the real API wrapper seam.
