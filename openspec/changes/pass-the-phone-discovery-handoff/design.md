# Design

## Context and Existing Ownership

The proposal covers motivation and scope. The specs `specs/recipe-discovery/spec.md` and `specs/member-context/spec.md` own the observable requirements.

Observed in source:

- **Member selection.** `useFamilyStore.selectFamilyMember(id)` (`pwa/src/store/familyStore.ts`) awaits `setFamilyMemberCookie` (the server action in `pwa/src/lib/auth.ts`), then sets the readable fallback cookie, then sets `selectedFamilyMemberId`. If the server action throws, the store's selection stays unchanged. Profile calls this, then `completeOnboarding()` and `router.push(ROUTES.HOME)` (`pwa/src/app/(app)/profile/page.tsx`). The Home navigation belongs to Profile, not to the store.
- **Member header.** The shared browser SDK reads the selected ID from the store for `X-Family-Member-Id` when it prepares each request (member-context `Carry browser member context on shared SDK requests`). A request already prepared keeps its member.
- **Discovery queue lifecycle.** `pwa/src/app/(app)/discovery/page.tsx` initializes its queue in an effect gated on `_hasHydrated && selectedFamilyMemberId`. That effect lists `selectedFamilyMemberId` as a dependency, so a selection change already triggers a fresh `getCategories` + `getDiscoveryStack('Supper')`. The stack lives in `useDiscoveryStore.discoveryStack`. Generation refs (`fetchGenerationRef`) discard stale fetches.
- **In-flight votes.** `handleSwipeRight/Left` remove the card optimistically and call `submitVote` in the background. They track `pendingVotesRef` (a `Set` of recipe IDs) and `voteRevisionRef`. A failed vote calls `refreshSession()` and `refetchCurrentCategory()`.
- **Local match counter.** `matchCount` is `useState` local to the mounted page, and is incremented when a liked card had `hasFamilyInterest`.
- **Members list.** `useFamily().familyMembers` / `loadFamily()` come from the same store. Discovery does not load the family list today.
- **Converged state.** When `session.phase === 'converged'`, the page returns early with the celebration `SuccessCard`.

Terminology: a **handoff** is choosing a member in Discovery plus confirming the curtain. A **turn** is the span between handoffs for one member on this mounted page. "Turn" is only a UI term. It isn't persisted and has no server meaning.

## Decisions and Tradeoffs

1. **Reuse `selectFamilyMember`; don't add a "temporary turn" identity.** This was decided with the user. Selection stays switched, which keeps a single source of identity truth (the cookie plus the store). A device-owner identity that reverts would need a second identity slot, with rules for SSE, preferences and the request header, and that's more state than the outcome needs. The handoff UI makes handing back one tap, which covers most of the benefit of reverting.
2. **The Discovery handoff does not call `completeOnboarding()` or navigate.** Discovery sits behind the member page gate, so onboarding is already complete. Leaving this out keeps the Profile-specific behavior with Profile.
3. **Let the existing `selectedFamilyMemberId` effect reload the queue.** Don't add a separate imperative reload. Before calling `selectFamilyMember`, the handoff clears the visible stack (`setStack([])`), resets `matchCount`, and increments `fetchGenerationRef` so a stale fetch for the previous member can't commit. Alternative: an explicit `fetchCategories()` call after selection. Rejected because it would race the effect and fetch twice.
4. **Wait for pending votes before switching.** On confirm, the handoff waits until `pendingVotesRef` is empty (polling via the existing revision ref, or a small promise registry in the page), then selects. This guarantees each vote request was prepared under the previous member. Alternative: capture the member ID per vote and pass it explicitly. Rejected because it changes the SDK call shape and spreads header ownership. A failed vote's `refetchCurrentCategory()` that resolves after the switch is guarded by the generation increment from Decision 3.
5. **One new component, `PassThePhone`,** under `pwa/src/components/discovery/`. It owns the trigger, the chooser and the curtain as a small state machine, and receives `members`, `currentMemberId`, `onConfirm(memberId): Promise<void>` and `disabled`. The page owns the vote settlement, stack and counter effects inside `onConfirm`. This keeps business effects in the page and the presentation in the component. The chooser reuses the dialog shell conventions from `FamilyNudgeDialog` / `Modal` (`pwa/src/components/common/Modal.tsx`) rather than new primitives.
6. **Load the family list lazily in Discovery.** Call `loadFamily()` when it hasn't loaded (`hasLoaded`), using the same pattern as Profile. The control renders only once there are at least two members.

## First Observable Slice

Exhausted-queue handoff, end to end in the mocked browser:

- **Entry:** `/discovery` as Alex, with an empty Supper stack and a non-converged session.
- **Steps:** Pass the phone → choose Maya → curtain → confirm.
- **Observable result:** the stack request repeats with `X-Family-Member-Id` set to Maya, Maya's mocked card is the front card, and the route is still `/discovery`.
- **Seams exercised:** the Discovery page, `PassThePhone`, `familyStore.selectFamilyMember` (with the server-action cookie), the shared SDK header, and the mocked `GET /api/discovery` and family routes in `pwa/e2e/mock-api.ts`.

Later slices add the in-stack entry point, cancel/dismiss, the pending-vote wait, failure retry and the counter reset.

## State, Concurrency and Recovery

The handoff state is local to the page and component: `idle → choosing → curtain(member) → switching(member) → idle`.

- From `choosing`, dismiss returns to `idle`.
- From `curtain`, cancel returns to `idle`.
- While `switching`, the confirm control is disabled, which prevents a double submit.
- If selection fails, the state goes back to `curtain(member)` with an error and retry. The stack was already cleared in Decision 3. On failure the page restores it by re-running the queue fetch for the unchanged current member when the curtain is cancelled.
- If the session becomes `converged` in any state, the page's early return to the celebration card unmounts the handoff UI.

Invariants:

- Each vote's request carries the member who swiped it.
- The previous member's cards are never visible when the curtain is not shown and the incoming member is selected.

## User Experience

- **In-stack control:** a compact pill ("Pass the phone") placed between the card arena and the thumb-zone vote buttons. It must not shrink the 80 px vote buttons or overlap the card. The final placement must also leave room for the collective progress cue from the in-flight `explore-adaptive-hearth-and-cookbook-primitives` change.
- **Exhausted-queue screen:** a secondary-style button in the existing button column, after the primary action and before Refresh Feed.
- **Chooser:** a sheet with named member buttons (≥48 px), focus moved into the sheet, and Escape/outside dismissal returning focus to the trigger. It has no status indicators.
- **Curtain:** full-screen cream surface with a large heading ("Hand the phone to {name}"), a primary "I'm {name} — let's vote" button and a secondary "Cancel". It respects reduced motion and is readable at 320 px and at 200 % text size, in EN and FR.
- **Copy:** new keys live under `discovery.passThePhone.*` in `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json`.

## Risks and Deferrable Questions

- **Language flip at confirm.** The incoming member's `preferredLanguage` may switch the locale through `LocaleProvider` after selection. The curtain shows before selection, so it renders in the previous member's locale. This is acceptable and deferrable: it doesn't change behavior or acceptance.
- **Overlap with the in-flight change in `discovery/page.tsx`.** Mitigation: whichever change applies second rebases its UI placement, and both preserve each other's scenarios.
