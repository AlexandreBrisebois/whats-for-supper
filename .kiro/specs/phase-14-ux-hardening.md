# Feature: Phase 14 — UX Hardening

## Intent

A set of focused UX fixes identified after Phase 12/13 went live. No new features — every task corrects something that is broken, confusing, or missing from the current experience.

---

## Issues & Resolutions

### Issue 1 — Cook's Mode shows fallback steps in production
`parseRecipeSteps` handles flat string arrays and flat `HowToStep` objects, but the actual data on disk uses `HowToSection` objects (`{ "@type": "HowToSection", "name": "...", "itemListElement": [{ "@type": "HowToStep", "text": "..." }] }`). The parser falls through to the 4-step fallback for every real recipe.

**Resolution**: Extend `parseRecipeSteps` to unwrap `HowToSection → itemListElement → HowToStep`. Section name becomes the step title prefix. Flat formats remain supported for backward compat.

### Issue 2 — "Cooked" button is confusing on the flip card
The explicit "Cooked" button on `TonightMenuCard`'s back face is redundant and confusing alongside Skip/Cook. The natural moment to mark a meal cooked is when you finish Cook's Mode.

**Resolution**: Remove the standalone "Cooked" button from `TonightMenuCard`. When the user taps "Done" on the last step of Cook's Mode, call `onCooked` implicitly before closing. Cook's Mode already has the `onClose` prop — add `onCooked?: () => void` and wire it in `HomeCommandCenter`.

### Issue 3 — No way to close voting without finalizing the whole week
Once "Ask the Family" is tapped, `isVotingOpen` is true with no escape hatch short of finalizing the week (which requires ≥4 planned days). If you want to cancel voting and plan next week independently, you're stuck.

**Resolution**: Add a "Close Voting" button in the planner header when `isVotingOpen` is true. Calls `lockSchedule(currentWeekOffset)` (which already purges votes server-side) and sets `isVotingOpen = false`, `isLocked = true`. Same as finalize but without requiring ≥4 days.

### Issue 4 — TonightPivotCard is not shown directly when nothing is planned
When no recipe is planned for tonight, the home screen should land directly on `TonightPivotCard` with Confirm GOTO / Quick Find / Order In immediately visible — no flip card, no skip dialog. The current implementation should handle this via the `!currentRecipe` condition in `HomeCommandCenter`, but the SSR + client-side loading sequence may cause a flash or incorrect state.

**Resolution**: Verify and harden the `HomeCommandCenter` loading path so that when SSR returns no recipe and the client-side schedule fetch confirms no recipe, `TonightPivotCard` is shown immediately without any intermediate state showing `TonightMenuCard`. Remove the `SkipRecoveryDialog` from the no-recipe path — it should only appear when skipping a *planned* meal.

### Issue 6 — "Plan next week" locks this week but doesn't transition to next week's voting

Tapping "Plan next week" (`handleFinalize`) locks the current week and shows "Menu's In!". But:
1. It does not navigate to next week automatically.
2. `isVotingOpen` and `isLocked` in the Zustand store are week-agnostic — they carry over when you navigate to next week, so next week shows "Menu's In!" immediately and the "Ask the Family" CTA never appears.
3. There is no automatic opening of voting for next week.

**Resolution**:
- After `lockSchedule` succeeds, automatically navigate to `weekOffset + 1` and reset `isVotingOpen = false`, `isLocked = false` for the new week context.
- Immediately call `openVoting(weekOffset + 1)` so next week's discovery stack is live for the family to vote on.
- Show a brief success toast ("This week is locked — voting open for next week!") before navigating.
- The `isVotingOpen` / `isLocked` store state must be reset on every week navigation (`setWeekOffset`) so stale state from a previous week never bleeds into the new week view. The authoritative state comes from the API (`schedule.status` field) — sync it on `loadData`.
Recipes with more votes were appearing at the bottom of the discovery stack. Fixed: `DiscoveryService.GetRecipesForDiscoveryAsync` now orders by `VoteCount DESC`, then `LastCookedDate ASC NULLS FIRST`.

**Status**: ✅ Already done. Documented here for completeness.

---

## Tasks

### Phase A — Cook's Mode Steps Fix (seam: real recipe steps visible in production)

**Stop condition**: Cook's Mode shows actual recipe steps for any recipe that has `HowToSection` instructions on disk. Fallback still works for recipes with no instructions.

- [ ] A1. Update `pwa/src/lib/cooking/stepParser.ts` — add a third branch to handle `HowToSection` objects:
  - Detect: `firstItem` has `itemListElement` property (array of `HowToStep`).
  - Unwrap: flatten all sections → steps. Use `section.name + ": " + step.text` as the instruction, or just `step.text` if section name is generic ("Preparation", "Instructions", etc.).
  - Preserve existing string array and flat `HowToStep` branches unchanged.
- [ ] A2. Add unit tests for `parseRecipeSteps` covering:
  - `HowToSection` input → correct flat step array.
  - Flat `HowToStep` input → unchanged behavior.
  - String array input → unchanged behavior.
  - Empty / null input → empty array.
- [ ] A3. Run `npm run typecheck` — zero type errors.

---

### Phase B — Cook's Mode "Done" = Cooked (seam: marking cooked is implicit)

**Stop condition**: Tapping "Done" on the last Cook's Mode step marks the meal as cooked and closes the overlay. The standalone "Cooked" button is removed from `TonightMenuCard`.

- [ ] B1. Add `onCooked?: () => void` prop to `CooksModeProps` in `pwa/src/components/planner/CooksMode.tsx`.
- [ ] B2. In `CooksMode.nextStep()`: when `currentStep === steps.length - 1` (last step), call `onCooked?.()` before `onClose()` and `router.push('/home')`.
- [ ] B3. Wire `onCooked` in `HomeCommandCenter.tsx` — pass `handleCookedMark` as `onCooked` to `CooksMode`.
- [ ] B4. Wire `onCooked` in `pwa/src/app/(app)/planner/page.tsx` — when Cook's Mode is opened from the planner, pass a handler that calls `POST /api/schedule/day/{date}/validate` with `status: 2`.
- [ ] B5. Remove the "Cooked" button (`data-testid="cooked-btn"`) from `TonightMenuCard`'s back face. Remove the `onCooked` prop from `TonightMenuCardProps` and all call sites.
- [ ] B6. Run `npm run typecheck` — zero type errors.

---

### Phase C — Close Voting Button (seam: voting can be cancelled without finalizing)

**Stop condition**: When voting is open, a "Close Voting" button appears in the planner header. Tapping it calls `lockSchedule`, clears voting state, and the pulsing "Voting live" badge disappears.

- [ ] C1. Add `handleCloseVoting` to `pwa/src/app/(app)/planner/page.tsx`:
  ```ts
  const handleCloseVoting = async () => {
    try {
      await lockSchedule(currentWeekOffset);
    } catch (e) {
      // non-fatal — clear client state regardless
    }
    setVotingOpen(false);
    setIsLocked(true);
  };
  ```
- [ ] C2. In the planner header, when `isVotingOpen` is true, render a "Close Voting" button next to the "Voting live" badge:
  - Style: small, ochre/destructive tone, `data-testid="close-voting-btn"`.
  - Positioned inline with the voting badge, not as a full-width CTA.
- [ ] C3. Run `npm run typecheck` — zero type errors.

---

### Phase D — TonightPivotCard Direct Landing (seam: no-recipe home state is immediate)

**Stop condition**: When no recipe is planned for tonight, the home screen shows `TonightPivotCard` directly — no flip card flash, no skip dialog. When a recipe *is* planned, `TonightMenuCard` shows as before.

- [ ] D1. Audit `HomeCommandCenter`'s loading sequence:
  - SSR passes `todaysRecipe` as a prop. If null, `isLoading` starts true and a client-side `getSchedule()` fires.
  - After the fetch resolves with no recipe, `currentRecipe` stays null and `TonightPivotCard` renders.
  - Confirm there is no intermediate render of `TonightMenuCard` with a null recipe.
- [ ] D2. Ensure `SkipRecoveryDialog` is only reachable from `TonightMenuCard` (planned meal skip flow). It must not be triggered from `TonightPivotCard`. Verify `TonightPivotCard`'s "Order In" button calls `handleRecoveryAction('order_in')` directly (skips the dialog) — this is already the case, confirm it.
- [ ] D3. If a flash of `TonightMenuCard` is observed when no recipe is planned: add a guard so `TonightMenuCard` only renders when `currentRecipe` is non-null AND the recipe has a valid `id` and `name`. A recipe with `name = null` (broken DB state) should not render `TonightMenuCard`.
- [ ] D4. Run `npm run typecheck` — zero type errors.
- [ ] D5. Run `npx playwright test e2e/home-recovery.spec.ts` — all tests pass.

---

### Phase E — Plan Next Week Transition (seam: finalizing this week opens voting for next week)

**Stop condition**: Tapping "Plan next week" locks this week, navigates to next week, opens voting for next week, and the planner shows the correct state (voting open, not locked) for the new week.

- [ ] E1. Reset `isVotingOpen` and `isLocked` in `plannerStore` on every `setWeekOffset` call — stale state from a previous week must never bleed into the new week view.
- [ ] E2. In `loadData` (the `getSchedule` effect in the planner page), sync `isVotingOpen` and `isLocked` from the API response's `status` field:
  - `status === 1` (VotingOpen) → `setVotingOpen(true)`, `setIsLocked(false)`
  - `status === 2` (Locked) → `setIsLocked(true)`, `setVotingOpen(false)`
  - `status === 0` (Draft) → `setVotingOpen(false)`, `setIsLocked(false)`
- [ ] E3. Update `handleFinalize` in the planner page:
  1. Call `lockSchedule(currentWeekOffset)` as before.
  2. Call `openVoting(currentWeekOffset + 1)` to open voting for next week.
  3. Navigate to next week: `setWeekOffset(currentWeekOffset + 1)`.
  4. Show success toast: "This week is locked — voting open for next week!".
  5. On error: still navigate to next week, but show a warning that voting could not be opened automatically.
- [ ] E4. Run `npm run typecheck` — zero type errors.
- [ ] E5. Manual verification: add 4 recipes to this week → tap "Plan next week" → confirm navigation to next week → confirm "Voting live" badge is visible → confirm "Ask the Family" CTA is not shown (voting already open).

---

### Phase F — Final Review

**Stop condition**: `task review` exits clean. All fixes are live.

- [ ] F1. Run `task review` — formatting, linting, type-check, full suite clean.

---

## Notes / Decisions

- **Discovery stack ordering** (Issue 5) was fixed during the Phase 13 session. `DiscoveryService` now orders by `VoteCount DESC, LastCookedDate ASC NULLS FIRST`. No further work needed.
- **"Cooked" as implicit** — removing the explicit button is intentional. The only path to marking a meal cooked is completing Cook's Mode. This is simpler and less confusing. If a user cooked without using Cook's Mode, they can skip the meal instead (which marks it as status 3, not 2 — acceptable for now).
- **Close Voting calls `lockSchedule`** — this is the same API call as "Plan next week". It purges discovery votes server-side. This is intentional: closing voting means the family has decided, votes are no longer relevant.
- **Phase D is mostly a verification task** — the `TonightPivotCard` direct landing should already work in production. D1–D3 are defensive hardening, not new logic.
- **`SkipRecoveryDialog` stays** — it's the right UX for skipping a *planned* meal (Order In → what to do with tonight's recipe). It just shouldn't be reachable from the no-recipe state.
- **`isVotingOpen` / `isLocked` are week-agnostic in the store** — this is the root cause of Issue 6. The fix (E1–E2) makes the API response the source of truth and resets store state on week navigation. The store values become a cache, not the authority.
