# Proposal

## Why

The mission promises that "everyone—kids included—helps choose the week's meals", but Discovery assumes each member has their own device. Observed in source:

- When a member's queue runs out, the screen offers Planner/Capture, Refresh Feed and **Nudge family**. Nudge family shares a voting link, which needs a second device (`pwa/src/app/(app)/discovery/page.tsx`).
- Switching the active member is only possible from Profile. Choosing a member there selects them and then requests **Home** (`pwa/src/app/(app)/profile/page.tsx`; member-context `Request member selection and Home from Profile`). Handing one phone to a child therefore takes Profile → open menu → pick → Home → Discover, and the child passes through the parent's Profile on the way.
- No capability spec or user doc mentions shared devices or children.

Households where children vote on a parent's phone, often the main way kids take part, get the most friction at the moment the product most wants to work.

## Outcome and Scope

**Outcome:** On a single device, a household can take turns voting in Discovery. The current voter picks the next member from inside Discovery and sees a short handoff screen. The next member then votes on their own queue without leaving `/discovery`.

**In scope (this increment):**

- A **Pass the phone** control in Discovery, shown two ways:
  - as an action on the exhausted-queue ("That's a wrap!") screen;
  - as an unobtrusive control above the card stack while cards remain, so a turn can end early.
- A member chooser that lists the loaded household members, excluding the current voter.
- A full-screen **handoff curtain** naming the incoming member. Their queue is revealed only when they confirm.
- **Selection semantics (decided):** the switch reuses the existing member selection and **stays switched**. The new member becomes the device's active member until someone switches again. There is no temporary-turn or revert-to-owner state.
- Votes made before the handoff stay attributed to the member who made them.

**Out of scope / exclusions:**

- Tracking who has or hasn't voted, completion badges, or ordering the chooser by completion. This keeps the existing rule `Keep personal completion distinct from family completion`.
- Any change to the API contract, vote storage, consensus or convergence rules.
- Offering a handoff while the round is converged. The celebration card stays as it is.
- PIN/lock protection between members. The household passphrase remains the only trust boundary.
- Changes to the Profile switch flow, which still requests Home.

**Assumptions (recorded):**

- After a handoff, member preferences (language, contrast, view modes) follow the incoming member through the existing `LocaleProvider` and preference behavior. So the curtain and the queue may change language.
- Live-update (SSE) delivery is household-scoped and needs no change when the selected member changes.

## What Changes

- **Discovery** gains a Pass the phone entry point, both while cards remain and on the exhausted-queue screen, when there are at least two loaded household members and the round is not converged.
- **Discovery** gains a member chooser and a handoff curtain. Confirming the curtain selects the incoming member, clears the previous member's visible cards, and loads the incoming member's Supper queue in place.
- **Discovery** resets its local match counter, which decides whether the primary empty-state action goes to Planner or Capture, on each handoff. The counter now reflects the current member's likes only.
- **Member context** gains a second selection entry point (Discovery handoff). It reuses the same identity-cookie selection, but it stays on Discovery and does not request Home.
- No breaking changes.

## Capabilities

### New Capabilities

_None._ The handoff is part of Discovery behavior, and member selection semantics stay with member-context.

### Modified Capabilities

- `recipe-discovery`: adds the shared-device handoff (entry points, chooser, curtain, in-place queue reload, in-flight vote attribution). Modifies `Offer empty-state navigation and feed refresh` so it offers Pass the phone and scopes the local match counter to the current member's turn.
- `member-context`: adds a requirement to select a member from the Discovery handoff without requesting Home, while keeping the existing cookie and header semantics.

## Impact

- **PWA:** `pwa/src/app/(app)/discovery/page.tsx` and a new Discovery handoff component under `pwa/src/components/discovery/`. Reuses `useFamily().selectFamilyMember` (`pwa/src/store/familyStore.ts`) and `useDiscoveryStore`. New locale keys in the EN/FR locale files.
- **Tests:** Discovery unit tests (`pwa/src/app/(app)/discovery/page.test.tsx`) and a new Playwright scenario under `pwa/e2e/`.
- **API / OpenAPI / database:** none. Votes already key on the recipe–member pair, and the browser client already sends the selected member as `X-Family-Member-Id`.
- **Coordination:** the in-flight change `explore-adaptive-hearth-and-cookbook-primitives` also adds Discovery requirements (a collective progress cue and the celebration-to-Planner bridge). The requirements don't conflict, but both edit `pwa/src/app/(app)/discovery/page.tsx`. Whichever change applies second must rebase its UI placement. Pass the phone must not list or imply which members are still to vote, which matches that change's non-shaming rule.
