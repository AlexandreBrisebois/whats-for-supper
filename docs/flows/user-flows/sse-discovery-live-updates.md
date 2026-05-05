# Flow: Discovery Stack — Live SSE Updates

**Spec:** `.kiro/specs/00-live-schedule` — Flows 9, 10 / R12, R13
**Triggers:** SSE `fill_the_gap_invalidated` (recipe planned → remove from stack), SSE `vote_updated` (family vote → surface recipe)
**Reviewed by:** The Mère-Designer

---

## Flow 9: Silent de-duplication when a recipe hits the meal plan

### What happens

```
Jordan is swiping in Discovery
Alex assigns Recipe X to the weekly plan
  → POST /api/schedule/assign fires
  → .NET API publishes fill_the_gap_invalidated

Jordan's browser:
  ← fill_the_gap_invalidated → discoveryStore.invalidateFillTheGap()
  ← Discovery page watches fillTheGapVersion → silent refetch
  ← server returns stack WITHOUT Recipe X (filtered server-side — already planned)
  ← ID diff: Recipe X identified as absent from new stack
  ← Recipe X card exits with fade animation (200ms)
  ← micro-badge appears briefly: "Just planned ✓" (sage green, 2s auto-fade)
```

### Card removal animation

**Fade exit, 200ms.** Not instant disappear. Not a full swipe animation.

**Mère-Designer ruling:** Instant disappearance is jarring and unexplained. A soft fade signals "that card was claimed" — intentional, not a bug. Glassmorphism + fade feels natural within the Solar Earth aesthetic.

```typescript
// Framer Motion exit variant on DiscoveryCard
exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
```

### Micro-feedback badge

A small inline badge "Just planned ✓" (sage green, `text-xs`, pill shape) appears at the top of the card stack for 2 seconds when a card exits via the planned-route (not via swipe). It does NOT appear for every `fill_the_gap_invalidated` event — only when the diff actually removes a card from the visible top 4.

**Why:** Jordan deserves to know why a card vanished. One line, 2 seconds, sage green = success. Not alarming. Not noisy.

### The front card edge case

If Recipe X is the current top card (the one Jordan is looking at) and it gets planned by someone else:

- The card exits with the same fade (200ms)
- The badge appears
- The next card slides up naturally
- Jordan is not in mid-swipe-gesture during a background refetch — the refetch is debounced 500ms after `fillTheGapVersion` changes

**Mère-Designer ruling:** This is a WIN state, not a problem. The family made a decision. The card vanishing IS the feedback that consensus happened. Soft fade + badge = clarity.

### Server-side filter requirement

The API endpoint `GET /api/discovery/items?category={cat}` MUST filter out recipes that are assigned to any slot in the current week (`weekOffset=0`). The client triggers a refetch; the server is responsible for the authoritative exclusion. The client only does an ID diff to determine which cards to animate out.

---

## Flow 10: Vote bubbling — family interest surfacing

### Constraint

**Do NOT change the top card (position 0) in front of a user.** Re-ranking applies only to cards at positions 1, 2, 3 in the visible stack.

**Mère-Designer ruling confirmed:** Moving the front card while a user is looking at it is disorienting and breaks the spatial model they've built. Stability of the top card is a hard rule.

### What happens

```
Jordan votes ♥ on Recipe X in Discovery (on her device)
  → POST /api/discovery/{id}/vote
  → .NET API publishes vote_updated { recipeId, voteCount }

Alex's browser (on /discovery):
  ← vote_updated → discoveryStore.applyVoteUpdate({ recipeId, voteCount })
  ← if recipe is in positions 1-3 of discoveryStack:
     ← hasFamilyInterest flips to true
     ← recipe moves up by at most 2 positions (not past position 1)
     ← slide + scale animation (non-top cards only)
  ← family interest indicator appears on card
```

### Re-rank rules

```
Position 0: LOCKED — never moved by vote_updated
Position 1: Can move to position 1 (no change if already there)
Position 2: Can move up to position 1
Position 3: Can move up to position 2 (max 1 step for position 3)
Position 4+: Not in visible stack — no re-rank until swiped into top 4
```

Max movement: **2 positions up, never to position 0, never for cards outside the visible 4**.

If a recipe receives votes but is at position 8 in the stack, it stays at position 8. It will naturally enter the top 4 as the user swipes. The vote indicator will be visible on it when it surfaces.

### Family interest indicator

**A pulsing sage-green ring on the card border.**

```
Border: 2px solid sage
Pulse: Framer Motion scale variant [1, 1.03, 1], duration 1.5s, repeat Infinity
Ring: visible when hasFamilyInterest === true
```

**Mère-Designer ruling:** A heart badge is too cheerful for ambient feedback and clutters the card face. A ring is structural — part of the card's identity, not an overlay. It reads as "this card is alive." Sage green (calm, success-adjacent) not ochre (alert) and not terracotta (veto).

### Re-rank animation (non-top cards)

```typescript
// Framer Motion layout animation for re-ranked card
transition: { type: 'spring', stiffness: 300, damping: 30 }
// y-translation handled by layoutId
```

Use `AnimatePresence` with `layoutId` on each card. When a card moves up, Framer Motion handles the smooth positional interpolation. No custom translate needed — `layout` prop does the work.

### `hasFamilyInterest` mapping

Currently `hasFamilyInterest` in `DiscoveryRecipe` is always `false` (hardcoded in `mapToDiscoveryRecipe`). The `vote_updated` handler must update this field in-place on the stored recipe object. The DiscoveryCard component already receives this prop; it just needs the visual ring.

---

## State ownership: why discoveryStore owns the stack

Both flows require the Discovery page to react to SSE events. The current Discovery page owns its recipe stack as local React state (`useState`), which is invisible to `useScheduleStream`. The fix is to lift the `recipes` array into `discoveryStore.discoveryStack`.

This is a **lift-and-shift only** — no fetch logic changes, no component logic changes. The Discovery page reads from the store instead of local state. `useScheduleStream` can then write to the store.

---

## E2E test specifications

```typescript
// Flow 9
test('fill_the_gap_invalidated → recipe card fades out of Discovery stack', async ({ page }) => {
  // 1. mock SSE to emit fill_the_gap_invalidated
  // 2. mock /api/discovery/items to return stack WITHOUT recipeId
  // 3. navigate to /discovery (stack pre-seeded with recipe)
  // 4. assert recipe card not present after refetch
  // 5. assert "Just planned ✓" badge visible briefly
});

// Flow 10
test('vote_updated → family interest ring appears on card', async ({ page }) => {
  // 1. navigate to /discovery with a recipe at position 2
  // 2. mock SSE to emit vote_updated for that recipeId
  // 3. assert card border ring appears (family interest indicator)
});

test('vote_updated does NOT move position-0 card', async ({ page }) => {
  // 1. navigate to /discovery with recipe at position 0
  // 2. mock SSE to emit vote_updated for that recipeId (high voteCount)
  // 3. assert card remains at position 0
  // 4. assert ring indicator appears but position unchanged
});
```
