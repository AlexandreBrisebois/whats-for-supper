# Design

## Context and Existing Ownership

The proposal covers motivation and scope. `specs/recipe-discovery/spec.md` and `specs/member-context/spec.md` own the observable requirements. The visual design and end-to-end journeys are documented in Era 3 boards `docs/visual-language/designs/pass-the-phone-handoff-suite.svg` and `docs/visual-language/designs/pass-the-phone-handoff-journeys.svg` (linked in `docs/visual-language-reference.md`).

Observed in source:

- **Member selection.** `useFamilyStore.selectFamilyMember(id)` (`pwa/src/store/familyStore.ts`) awaits `setFamilyMemberCookie` (`pwa/src/lib/auth.ts`), sets the fallback cookie, then updates `selectedFamilyMemberId`. Profile calls this, then `completeOnboarding()` and `router.push(ROUTES.HOME)` (`pwa/src/app/(app)/profile/page.tsx`). Home navigation belongs to Profile, not to the store.
- **Member header.** The shared browser SDK reads the selected ID from the store for `X-Family-Member-Id` when preparing each request (`Carry browser member context on shared SDK requests`). Already-prepared requests keep their member.
- **Scrollable member dropdown.** `ProfileDropdown` (`pwa/src/components/profile/ProfileDropdown.tsx`) already renders a scrollable, safe-area-aware, Escape/outside-dismissible member list (`max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain scroll-py-2`, `min-h-12` rows).
- **Settings sections.** `SettingsPageContent` (`pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`) orders `FamilyManagement` → `UsualPortionsSection` → `SearchIndexSection` → `FailedCapturesSection` → `PreviewFeaturesSection`. `PreviewFeaturesSection` uses an `aria-expanded` `ChevronDown` disclosure to keep Settings compact.
- **App shell & bottom dock.** `AppRouteLayout` (`pwa/src/app/(app)/layout.tsx`) mounts `ToastContainer` (`z-[200]`) and passes `hideNavigation` to `Layout` (`pwa/src/components/common/Layout.tsx`), which renders `Navigation` (`pwa/src/components/common/Navigation.tsx`, `.glass-nav`).
- **Discovery queue, empty state & votes.** `pwa/src/app/(app)/discovery/page.tsx` reloads the stack whenever `selectedFamilyMemberId` changes via `fetchGenerationRef`. `handleSwipeRight/Left` track `pendingVotesRef` and `voteRevisionRef`, and `matchCount` is local `useState`. Currently, `discovery/page.tsx` styles `Nudge family` with Hearth red (`border-hearth-line text-hearth-ink`) and wraps the empty-state card inside `aspect-[3/4]` and outer `overflow-hidden`.

Terminology: a **handoff** chooses a member from the dropdown and confirms the curtain. The **origin member** is the person who started the handoff session on this device. A **locked turn** is the period after confirming a handoff until returning to the origin.

## Decisions and Tradeoffs

1. **Per-device opt-in (`localStorage`) in Settings below `Manage Family`, default `OFF`.** Stored under `wfs.passThePhone.enabled` so personal phones stay uncluttered while a shared parent phone/tablet stays enabled across member switches without backend/OpenAPI changes. Uses an immediate `56 × 32 px` Garden `role="switch"` and a collapsed-by-default **`How it works`** `ChevronDown` flyout with warm, plain-language copy ("Let the kids help pick supper from your phone. After you finish voting, pass your phone along — the rest of the app stays tucked away until they hand it back. Only turns on for this device.").
2. **Exhausted-queue-only entry (`recipes.length === 0`) + Era 3 color alignment.** Keeps the card-swiping view 100% clean for everyone and avoids layout competition with `explore-adaptive-hearth-and-cookbook-primitives`. On `"That's a wrap!"`, `Pass the phone ⌄` uses Garden tonal (`bg-sage-50 border-garden-line text-garden-ink`) and `Nudge family` shifts from Hearth red to Garden outlined (`bg-white border-garden-line text-garden-ink`) so household participation controls never look like red errors or destructive actions.
3. **Extract & reuse `MemberPickerList` (`pwa/src/components/identity/MemberPickerList.tsx`).** Shares the scrollable `ProfileDropdown` list anatomy (`max-h-[min(60dvh,24rem)] overflow-y-auto`, `min-h-12` buttons, Escape/outside dismissal) between `ProfileDropdown` and `PassThePhone`, removing the extra modal sheet layer while scaling cleanly to large families. Accepts optional `selectedMemberId` (for `aria-current="true"` and `Check` on Profile) and `getOptionTestId` (preserving `profile-dropdown-option-${member.id}` for `ProfileDropdown.test.tsx`).
4. **Minimal curtain + pure celebration kid wrap-up (designed for ages 4–12).**
   - **Curtain:** Removes redundant eyebrow and subtitle copy—only the Sunlight Ochre phone medallion, `Hand the phone to {name}`, playful primary CTA `Let's go, {name}!`, and neutral Chrome `Cancel` (`bg-white border-chrome-line text-ink-body`).
   - **Kid's wrap-up:** Removes Planner, Capture, Nudge, Refresh, subtext, member dropdowns, and the duplicate exit button—renders only a celebratory Sunlight star medallion (`#FFF3B0` / `#FFE666` / `#E1AD01` non-text accent) and `Nice picks, {name}!`. Keeping the card purely celebratory makes it Maya's moment of achievement while leaving one consistent exit on the dock below. Passing to a second sibling happens in 1 tap from the parent's screen after returning.
5. **Lock WFS navigation in `Navigation` (`.glass-nav`) + `AppRouteLayout` via `sessionStorage`.** Store `{ originMemberId, participantName, pendingTargetMemberId? }` in `sessionStorage` (exposed via `pwa/src/lib/discovery/passThePhone.ts`) as soon as the parent selects a target member into Screen 2B (handoff curtain) so Screen 2B is already locked and survives reload until either cancelled (`clearHandoffLock`) or confirmed (`pendingTargetMemberId` cleared into the active turn):
   - `Navigation.tsx` swaps the 5 tabs for the quiet **Handoff Dock**: left `{activeName}'s turn` (`text-ink-body font-bold`), right borderless `← Back to {originName}` (`text-ink-muted`, `min-h-12`, zero red border so young thumbs aren't drawn to it below `♥`).
   - Tapping `← Back to {originName}` while cards remain (`hasPendingCards`) opens a compact `Modal.tsx` confirmation (`Return to {originName}?` → Hearth `[Back to {originName}]` / neutral Chrome `[Keep voting]`); once the queue is empty (`!hasPendingCards`), tapping `← Back to {originName}` returns directly without an extra prompt.
   - `AppRouteLayout` redirects any non-`/discovery` path back to `/discovery` while locked, and self-heals (clears lock) if `originMemberId` is missing from loaded `familyMembers`.
6. **Reuse `selectFamilyMember`, settle in-flight votes across components, and let `selectedFamilyMemberId` reload.** Track in-flight vote promises in a shared waiter (`waitForPendingVotes()` in `pwa/src/lib/discovery/passThePhone.ts` or `useDiscoveryStore`) so both `discovery/page.tsx` (curtain confirm / converged return) and `Navigation.tsx` (Handoff Dock exit) wait until all pending votes settle under the outgoing member before clearing the stack (`setStack([])`), resetting `matchCount` to `0`, bumping `fetchGenerationRef`, and calling `selectFamilyMember`. Never call `completeOnboarding()` or push Home.
7. **Calm welcome-back closure via `useUiStore` + `ToastContainer`.** On returning to `originMemberId` (from Handoff Dock `← Back to {origin}` or converged `Back to {origin} & see matches`), call `useUiStore.getState().addToast({ type: 'success', message })` (`Welcome back, {origin} — {participant}'s votes are saved.`), rendered by the existing `ToastContainer` (`pwa/src/components/ui/ToastContainer.tsx`, 5 s auto-dismiss, Garden `CheckCircle2` icon).
8. **Normal-flow empty-state container.** Only apply `aspect-[3/4]` when `recipes.length > 0`, and allow vertical scrolling on `discovery/page.tsx` when `recipes.length === 0` so the dropdown, wrap-up buttons, and French `200%` text reflow cleanly at `320 px`.

## First Observable Slice

Exhausted-queue opt-in handoff → locked turn → celebration wrap-up & dock return to origin:

- **Entry:** `/profile/settings` toggles `Pass the phone` ON; `/discovery` as Alex with an empty Supper stack and Maya in the household.
- **Steps:** `Pass the phone` → choose Maya → minimal curtain (`Hand the phone to Maya` / `Let's go, Maya!`).
- **Observable result:** `X-Family-Member-Id` switches to Maya on `/discovery`, Maya's card loads with a clean voting screen, bottom tabs swap to the quiet Handoff Dock (`Maya's turn` | `← Back to Alex`), Maya finishes on the pure celebration card (`Nice picks, Maya!`), and tapping `← Back to Alex` on the dock restores Alex, the 5-tab dock, and the `Welcome back, Alex — Maya's votes are saved.` toast.

## State, Concurrency and Recovery

- **Handoff UI state:** `idle → choosing → curtain(member) → switching(member) → idle`.
- **Lock session state (`sessionStorage`):** `null | { originMemberId: string; participantName: string }`.
- **Busy & double-submit guard:** Confirming handoff or return enters `switching` (`disabled`, `aria-busy="true"`, stable dimensions) until `pendingVotesRef` drains and `selectFamilyMember` resolves.
- **Selection/return failure:** Stays on the current curtain or confirmation dialog with an Era 3 Hearth inline error (`bg-terracotta-50 border-hearth-line text-hearth-ink`: `Couldn't switch to {name} just now. {current} is still selected.`), primary `Try again`, and neutral Chrome `Cancel` (cancelling curtain restores the current member's queue).
- **Converged mid-handoff:** Early return in `discovery/page.tsx` unmounts the curtain; while locked, `SuccessCard` action renders `Back to {origin} & see matches`, which settles votes, unlocks back to `originMemberId`, triggers the closure toast, and navigates to `/planner`.

## User Experience (Era 3 Tokens & Copy)

Canonical reference: `docs/visual-language/designs/pass-the-phone-handoff-suite.svg` and `docs/visual-language/designs/pass-the-phone-handoff-journeys.svg`.

- **Settings card:** Tier 2 `bg-white rounded-3xl border border-chrome-line p-6 shadow-card`, `56 × 32 px` Garden `role="switch"`, `ChevronDown` disclosure (`text-garden-ink`, `min-h-12`), expanded body in Tier 3 `bg-cream rounded-2xl p-4`.
- **Parent wrap-up actions:** Primary Hearth (`Go to Planner` or `Capture a New Recipe`) → Garden tonal `Pass the phone ⌄` (`bg-sage-50 border-garden-line text-garden-ink`) → Garden outlined `Nudge family` (`bg-white border-garden-line text-garden-ink`), with `Refresh recipe suggestions` kept in the thumb zone below.
- **Curtain:** `fixed inset-0 z-[70] bg-cream` (covering `.glass-nav`) with centered Tier 1 white card (`rounded-[2.5rem] border-chrome-line shadow-card`), Sunlight Ochre phone medallion (`bg-ochre-100 border-sunlight-line text-sunlight-ink`), Outfit `text-3xl` heading (`Hand the phone to {name}`), Hearth primary CTA (`Let's go, {name}!`, `min-h-14`), neutral Chrome `Cancel` (`bg-white border-chrome-line text-ink-body`, `min-h-12`).
- **Kid's wrap-up:** Centered card with Sunlight star medallion (`bg-ochre-100 border-sunlight-line` + `#E1AD01` non-text star) and `Nice picks, {name}!` (zero subtext or buttons inside the card).
- **Handoff Dock:** Uses `.glass-nav` (translucent cream in AA, opaque `#FDFCF0` with `#6E645B` border in High Contrast AAA), left `{name}'s turn` (`text-ink-body`), right borderless `← Back to {origin}` (`min-h-12 text-ink-muted`).
- **Copy:** New EN/FR keys under `settings.passThePhone.*` and `discovery.passThePhone.*` in `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json`, verified at `320 px` and `200%` text scaling with `assertCookbookVisualA11y` (AA and AAA).

## Risks and Deferrable Questions

- **PWA lock boundary:** Web apps cannot block OS home/app switching. Mitigated honestly in the Settings `How it works` flyout (recommends iOS Guided Access / Android App Pinning for OS-level lock).
- **Language/contrast flip on switch:** Preferences follow the active member via `LocaleProvider` and `ContrastProvider`. The curtain renders in the outgoing member's locale/contrast until switch resolves, which is expected.
- **Overlap with `explore-adaptive-hearth-and-cookbook-primitives`:** Keeping the voting screen untouched avoids conflict during swiping; rebase empty-state/converged touches if applied second.
