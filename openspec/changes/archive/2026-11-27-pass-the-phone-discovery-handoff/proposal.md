# Proposal

## Why

The mission promises that "everyone—kids included—helps choose the week's meals", but Discovery assumes each member has their own device. Observed in source:

- When a member's queue runs out, the screen offers Planner/Capture, Refresh Feed and **Nudge family**. Nudge family shares a voting link, which needs a second device (`pwa/src/app/(app)/discovery/page.tsx`). Also observed: `Nudge family` currently uses Hearth red styling (`border-hearth-line text-hearth-ink`) rather than Era 3 Garden household participation styling.
- Switching the active member is only possible from Profile. Choosing a member there selects them and then requests **Home** (`pwa/src/app/(app)/profile/page.tsx`; member-context `Request member selection and Home from Profile`). Handing one phone to a child therefore takes Profile → open menu → pick → Home → Discover, and the child passes through the parent's Profile and can tap any bottom navigation tab at any time.
- Households where everyone already has their own phone do not need shared-device controls cluttering their Discovery screen, while parents with younger kids (4–12) need a simple per-device opt-in, a frictionless handoff with minimal reading load, and a way to keep a child inside Discovery until handed back.
- No capability spec or user doc mentions shared devices or children.

Households where children vote on a parent's phone, often the main way kids take part, get the most friction at the moment the product most wants to work.

## Outcome and Scope

**Outcome:** On a phone where the parent enables **Pass the phone** in Settings, a household can take turns voting in Discovery while keeping the swiping view completely clean. After finishing their cards, the parent picks the next member from a reusable scrollable dropdown, confirms a minimal handoff curtain (`Hand the phone to {name}` / `Let's go, {name}!`), and hands over the phone. While a kid's turn is active, app navigation is locked to Discovery with a quiet Handoff Dock (`{name}'s turn` + borderless `← Back to {origin}`) until the kid finishes on a pure celebration card (`Nice picks, {name}!` — with the dock returning directly to `{origin}`), ending with a calm confirmation toast that votes are saved.

**In scope (this increment):**

- **Per-device opt-in in Settings (`/profile/settings`):** A compact **Pass the phone** card directly below **Manage Family** (default `OFF`, persisted per-device in `localStorage`) with a `Vote together on this device` switch and a collapsible **`How it works`** inline flyout explaining the flow and honest PWA navigation-lock boundary.
- **Clean swiping view:** Zero extra handoff chrome while recipe cards remain (`recipes.length > 0`).
- **Exhausted-queue entry point:** When enabled on this device, at least two household members are loaded, and the round is not converged, **"That's a wrap!"** offers **Pass the phone** with an inline reusable scrollable member dropdown (supporting large families) listing the other loaded members with no completion or count cues, and aligns **`Nudge family`** to Garden outlined styling (`border-garden-line text-garden-ink`).
- **Minimal full-screen handoff curtain:** Names the incoming member (`Hand the phone to {name}`), offers a short playful confirm button (`Let's go, {name}!`) and a neutral `Cancel` button, and hides the previous turn's cards and bottom dock until confirmed.
- **Locked kid turn & quiet Handoff Dock:** While handed off from an origin member (`handoffOriginMemberId`), bottom navigation hides the 5 app tabs and renders `{name}'s turn` + a quiet borderless `← Back to {origin}` (`text-ink-muted`, opening a confirmation modal when cards remain, and returning directly once the queue is empty), stray routes redirect back to `/discovery`, and the kid's wrap-up card hides Planner/Capture/Nudge/Refresh and renders only a pure celebratory card (Sunlight star medallion + **`Nice picks, {name}!`**, with no subtext or action buttons inside the card).
- **Converged return & calm closure:** If the round converges during a locked turn, the celebration card's action switches back to `{origin}` before opening Planner. Returning to `{origin}` restores the 5-tab dock and displays an auto-dismissing Garden toast confirming whose votes were saved.
- **Selection semantics (decided):** Reuses the existing member selection (`selectFamilyMember`). The incoming member becomes the active member while voting, and the local handoff session (`handoffOriginMemberId` + participant name in `sessionStorage`) tracks who started the handoff so returning restores `{origin}` cleanly. Votes cast before any switch or return stay attributed to the member who swiped them.

**Out of scope / exclusions:**

- Tracking who has or hasn't voted, completion badges, or ordering the chooser by completion. This keeps the existing rule `Keep personal completion distinct from family completion`.
- Any change to the API contract, vote storage, consensus or convergence rules.
- PIN/lock protection or OS-level Guided Access / App Pinning. The household passphrase remains the only auth boundary, and the lock scopes WFS in-app navigation only.
- Multi-kid relay directly from the kid's wrap-up card (passing to a second child happens in 1 tap after returning to the parent, keeping the kid screen 1-button simple for ages 4–12).
- Changes to the Profile switch flow, which still requests Home.

**Assumptions (recorded):**

- After a handoff or return, member preferences (language, contrast, view modes) follow the active member through `LocaleProvider` and `ContrastProvider`.
- Live-update (SSE) delivery is household-scoped and needs no change when the selected member changes.

## What Changes

- **Settings (`/profile/settings`):** Gains a compact **Pass the phone** card directly below **Manage Family** with a per-device switch (`OFF` by default) and collapsible **`How it works`** flyout.
- **Shared Identity Picker:** Extracts a shared scrollable `MemberPickerList` reused by both `ProfileDropdown` and Discovery handoff so large families scroll cleanly.
- **Discovery & App Shell:**
  - Keeps the card-swiping view 100% clean.
  - On **"That's a wrap!"** (when opted in, `>= 2` members, non-converged), adds **Pass the phone** + scrollable member dropdown, aligns `Nudge family` to Era 3 Garden outlined styling, and lets the empty-state card grow naturally without clipping.
  - Adds the minimal full-screen **handoff curtain**, quiet locked **Handoff Dock** in `Navigation` (single return path `← Back to {origin}`: confirmed mid-stack, instant once finished), pure celebration kid wrap-up (`Nice picks, {name}!`), converged return (`Back to {origin} & see matches`), and the welcome-back closure toast.
  - Resets Discovery's local `matchCount` on every handoff or return.
- **Member context:** Gains Discovery handoff and return-to-origin selection paths that reuse the identity-cookie selection without requesting Home (except converged return opening Planner).
- No breaking changes.

## Capabilities

### New Capabilities

_None._ The handoff and per-device opt-in live within Discovery and member-context behavior.

### Modified Capabilities

- `recipe-discovery`: adds Settings per-device opt-in (`Pass the phone` switch + `How it works` flyout), exhausted-queue-only trigger with reusable scrollable chooser, minimal handoff curtain, locked Discovery Handoff Dock, 1-button kid wrap-up, converged return to origin, welcome-back closure confirmation, and in-flight vote attribution; modifies `Offer empty-state navigation and feed refresh` for the opt-in trigger and per-turn `matchCount`.
- `member-context`: adds selecting a member from the Discovery handoff and returning to the origin member on exit without requesting Home, while keeping existing cookie, header, and Profile semantics intact.

## Impact

- **PWA:** `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`, new `pwa/src/components/profile/PassThePhoneSettingsSection.tsx`, shared `pwa/src/components/identity/MemberPickerList.tsx` (reused by `pwa/src/components/profile/ProfileDropdown.tsx`), `pwa/src/components/common/Navigation.tsx`, `pwa/src/app/(app)/layout.tsx`, `pwa/src/app/(app)/discovery/page.tsx`, new `pwa/src/components/discovery/PassThePhone.tsx`, new `pwa/src/lib/discovery/passThePhone.ts` (device opt-in + lock session helpers), and EN/FR locale keys in `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json`.
- **Visual Design Reference:** `docs/visual-language/designs/pass-the-phone-handoff-suite.svg`, `docs/visual-language/designs/pass-the-phone-handoff-journeys.svg`, and `docs/visual-language-reference.md`.
- **Tests:** Unit tests for Settings, `MemberPickerList`, `PassThePhone`, `Navigation`, and `discovery/page.test.tsx`, plus Playwright E2E and `assertCookbookVisualA11y` scenarios under `pwa/e2e/`.
- **API / OpenAPI / database:** none.
- **Coordination:** `explore-adaptive-hearth-and-cookbook-primitives` also touches `discovery/page.tsx`. Keeping the swiping view completely clean eliminates visual placement competition during swiping; rebase empty-state/converged touches if applied second.
