# Tasks

No API, OpenAPI, generated-client or database change. Every slice is PWA-only and exercises the real `familyStore.selectFamilyMember` → shared SDK header seam. The mocked Playwright API (`pwa/e2e/mock-api.ts`) is the external-boundary double, with Alex and Jordan as the members. Unit tests use Vitest. Commands run through `Taskfile.yml`.

## 1. Tracer bullet: hand off from the exhausted queue

**Outcome and scenarios:** From an empty queue, Alex passes the phone to Jordan. Jordan's queue loads on `/discovery` with Jordan's member header. Covers recipe-discovery `Offer Pass the phone while Discovery is collecting` (Queue exhausted in a multi-member household; Single-member household; Converged round), `Show a handoff curtain before revealing the next queue` (Curtain hides the previous turn), `Switch to the confirmed member and load their queue in place` (Confirm the handoff; Incoming member has nothing left), and member-context `Select a member from the Discovery handoff without requesting Home` (Handoff stays on Discovery; Handoff selection persists).
**Owners and boundaries:** `pwa/src/app/(app)/discovery/page.tsx` (effects: clear stack, bump `fetchGenerationRef`, call `selectFamilyMember`), and a new `pwa/src/components/discovery/PassThePhone.tsx` (trigger, chooser, curtain). This slice includes only the exhausted-queue entry point.
**Dependencies and prerequisites:** design Decisions 1–3, 5 and 6. Mock family route with Alex and Jordan (`pwa/e2e/mock-api.ts`).
**Acceptance boundary:** the Playwright scenario runs the real page, store, server-action cookie and SDK header against the mocked API. Vitest mocks `useFamily` and the discovery API.

- [ ] 1.1 Red: add Vitest cases in `pwa/src/components/discovery/PassThePhone.test.tsx` and `pwa/src/app/(app)/discovery/page.test.tsx`. Cover: exhausted queue with members [Alex, Jordan] shows `discovery-pass-the-phone`; one member shows nothing; converged shows nothing; choose Jordan → curtain `discovery-handoff-curtain` naming Jordan with no `discovery-card`; confirm → `selectFamilyMember('…Jordan')` called once and `push` not called. Run `task test:unit -- src/components/discovery/PassThePhone.test.tsx src/app/(app)/discovery/page.test.tsx` and record the failures caused by the missing control or curtain.
- [ ] 1.2 Green: implement `PassThePhone` and wire it into the exhausted-queue button column. Lazily `loadFamily()` when `!hasLoaded`. On confirm, `setStack([])`, increment `fetchGenerationRef`, then await `selectFamilyMember`, letting the existing `selectedFamilyMemberId` effect reload. Add EN/FR keys under `discovery.passThePhone.*` in `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json`. Rerun the 1.1 command green, plus `task test:unit -- src/locales/locale-integrity.test.ts`.
- [ ] 1.3 Acceptance: add a Playwright scenario `Pass the phone from an exhausted queue` to `pwa/e2e/discovery.spec.ts`. Alex has an empty stack, and Jordan's stack has one mocked recipe. Pass → Jordan → confirm. Assert that the stack request carries `x-family-member-id` = Jordan, Jordan's card is the front card, the URL is still `/discovery`, and after `page.reload()` Jordan is still selected. Run `task test:e2e -- e2e/discovery.spec.ts`. Update `docs/user-guide.md` with a short "Voting on one phone" paragraph.

## 2. Hand off mid-stack, dismiss and cancel

**Outcome and scenarios:** A turn can end early from the card view. Dismissing the chooser or cancelling the curtain changes nothing. Covers `Offer Pass the phone while Discovery is collecting` (Cards remain in a multi-member household), `Choose the next member without completion cues` (Open the chooser; Dismiss the chooser), and `Show a handoff curtain before revealing the next queue` (Cancel the handoff).
**Owners and boundaries:** in `pwa/src/app/(app)/discovery/page.tsx`, the in-stack pill placement between the card arena and the thumb-zone controls. In `PassThePhone`, the dismiss/cancel transitions and focus return. On cancel, restore the current member's queue by re-running the existing fetch for the unchanged member.
**Dependencies and prerequisites:** group 1.
**Acceptance boundary:** Vitest covers the state transitions. Playwright covers focus, the keyboard and layout at 320 px and at 200 % text.

- [ ] 2.1 Red: add Vitest cases. With cards remaining, the pill is present and the like/dislike buttons remain enabled. The chooser lists Jordan but not Alex, with no voted/done/count text. Escape/close returns focus to the trigger without calling `selectFamilyMember`. Cancelling the curtain restores Alex's front card without calling `submitVote` or `selectFamilyMember`. Run the 1.1 command and record the intended failures.
- [ ] 2.2 Green: implement the in-stack pill and the dismiss/cancel paths, using the `Modal` dialog conventions (`pwa/src/components/common/Modal.tsx`) for the chooser. Rerun the 1.1 command green.
- [ ] 2.3 Acceptance: extend `pwa/e2e/discovery.spec.ts` with `Pass the phone mid-stack`. Keyboard: open the chooser, Escape, and focus returns. Open → Jordan → Cancel, and Alex's front card is unchanged. Open → Jordan → confirm, and Jordan's queue shows. Run `assertCookbookVisualA11y` (`pwa/e2e/visual-a11y-contract.ts`) on the chooser and curtain at 320 px EN/FR. Run `task test:e2e -- e2e/discovery.spec.ts`.

## 3. Vote attribution, failure recovery and per-turn match counter

**Outcome and scenarios:** Votes stay with whoever swiped. Selection failure is recoverable. Local match copy is per member. Covers `Attribute in-flight votes to the member who cast them` (Swipe then immediately pass the phone; Earlier vote fails), `Switch to the confirmed member and load their queue in place` (Selection fails; Round converges during the handoff), and modified `Offer empty-state navigation and feed refresh` (Local matches belong to the previous member).
**Owners and boundaries:** in `pwa/src/app/(app)/discovery/page.tsx`, confirm waits until `pendingVotesRef` is empty before selecting (design Decision 4), `matchCount` resets on a successful handoff, and the curtain shows an error and retry when `selectFamilyMember` rejects.
**Dependencies and prerequisites:** group 2.
**Acceptance boundary:** Vitest uses deferred `submitVote` and `selectFamilyMember` promises to control the ordering. Playwright delays the mocked vote route to check the header on the real request.

- [ ] 3.1 Red: add Vitest cases.
  - With a deferred `submitVote`, confirming the handoff does not call `selectFamilyMember` until the vote resolves.
  - A rejected vote is never resubmitted after the switch.
  - A rejected `selectFamilyMember` keeps the curtain open with retry, and Alex stays selected.
  - Alex's family-interest like followed by a handoff and Jordan's empty queue gives the primary action "Capture a New Recipe".
  - Setting the session to `converged` during the curtain renders `discovery-celebration-card`.

  Run the 1.1 command and record the intended failures.
- [ ] 3.2 Green: implement the pending-vote wait, the failure/retry state and the counter reset. Rerun the 1.1 command green, plus `task test:unit -- src/app/(app)/discovery/page.test.tsx` for existing Discovery regressions.
- [ ] 3.3 Acceptance: extend `pwa/e2e/discovery.spec.ts` with `Pass the phone right after a swipe`. Delay the `POST` vote route by 500 ms, like as Alex, then immediately hand off to Jordan. Assert the vote request header is Alex, and Jordan's stack request follows that vote's response. Run `task test:e2e -- e2e/discovery.spec.ts`.

## 4. Final Integration and Verification

- [ ] 4.1 Reconcile every scenario in `specs/recipe-discovery/spec.md` and `specs/member-context/spec.md` against the evidence from tasks 1.x–3.x. Confirm that the Profile selection test (`pwa/src/app/(app)/profile/page.test.tsx`, "Profile selection unchanged") still passes. Check for placement conflicts with `explore-adaptive-hearth-and-cookbook-primitives` if it has been applied. Run `task prepare -- <task paths>`, review the task-owned diff, then run `task verify -- <complete reviewed changed-path set>`. Report actual statuses and the record path. Run `openspec validate pass-the-phone-discovery-handoff --strict` and record the result.

## Workflow follow-up

- Sync the specs and archive the change once review is complete.
