# Flow: Capture Async Feedback — Honest Queued → Ready States

**Spec:** `.kiro/specs/00-live-schedule` — Flow 12 / R15
**Triggers:** Recipe submit (immediate queued state), SSE `recipe_ready` / `recipe_failed` (resolution)
**Reviewed by:** The Mère-Designer

---

## The problem with the current success screen

The current `MinimalCapture` success screen says **"Recipe saved!"** and auto-redirects to `/home` in 4 seconds. Both claims are wrong:

1. **"Recipe saved!" is a lie.** The recipe is queued in the workflow system. It may take 30–120 seconds to be fully synthesized and usable. It is not in the library yet.
2. **The 4-second auto-redirect breaks the multi-submit flow.** Parents who want to add 3 recipes in a sitting are thrown back to home after each one. This creates unnecessary navigation friction for a very common behaviour.

---

## New success screen states

### State 1: Queued (immediate, on submit)

```
Icon: solar loader pulse (ochre, 30px, center)
Heading: "Recipe queued"  ← not "saved", not "captured"
Subtext: "We're getting it ready. You'll hear from us when it's done."
Primary CTA: "Add Another" (terracotta, full-width pill)
Secondary CTA: "Done" (ghost/outline)
```

**"Add Another" stays primary.** The parent who wants to batch-submit should not have to hunt for it. "Done" dismisses and navigates to `/home`.

**Mère-Designer ruling on auto-redirect:** Remove the 4-second timer entirely. Auto-redirect violates the Toddler Rule — it takes away control from the parent mid-task. Let them decide when they're done.

### State 2: Ready (on SSE `recipe_ready` if user is still on success screen)

When the SSE event arrives while the user is still on the capture success screen, the screen transitions:

```
Icon: CheckCircle2 (sage green, 40px, brief scale-in animation)
Heading: "Lasagna is ready!"  ← use recipe name from SSE payload
Subtext: "It's in your library."
Primary CTA: "Add to this week" → opens QuickFindModal
Secondary CTA: "Add Another"
Tertiary CTA: "Done"
```

If the user has navigated away before `recipe_ready` fires → `LibraryToast` handles it (see `sse-recipe-ready-notification.md`).

### Path-specific copy

| Submit path | Queued heading | Queued subtext |
|---|---|---|
| Photo upload | "Recipe queued" | "We're processing your photo. You'll get a notification when it's ready." |
| URL capture | "Recipe queued" | "We're fetching the recipe from that link. You'll get a notification when it's ready." |
| Describe (non-GOTO) | "Synthesizing…" | "We're building your recipe. Hang tight — it'll be ready shortly." |
| Describe (GOTO intent) | "Your GOTO is being prepared" | "We'll notify you when it's ready on the home screen." (existing copy, kept) |

---

## Processing indicator on nav icon

A **6px sage-green dot** on the Capture nav icon signals "recipe in flight" as an ambient indicator. Appears when `captureStore.pendingRecipes` is non-empty. Disappears when the last pending recipe resolves (ready or failed).

**Mère-Designer ruling:** Not intrusive. Useful for parents who jump sections. The dot tells the story without demanding attention. Sage green = "something good is processing." No animation on the dot itself (no pulse) — the solar loader on the success screen is the active signal; the dot is ambient.

---

## captureStore responsibility

```typescript
// Called immediately after submit (before navigation or screen transition)
captureStore.addPending({ recipeId, name?: string })

// Called when SSE recipe_ready or recipe_failed fires for this recipeId
captureStore.removePending(recipeId)

// Derived: are there any pending recipes in this session?
captureStore.hasPending  // drives nav dot visibility
```

`captureStore` is session-scoped (not persisted). If the user closes the app and reopens, the `pendingRecipes` array is empty — the `LibraryToast` will not appear for recipes that resolved during the closed session. This is acceptable: the recipe is in the library regardless; the notification is a convenience, not a requirement.

---

## The describe path edge case

The describe path (`/api/recipes/describe`) is synchronous in the sense that the API immediately creates a full recipe stub with `IsSynthesized = false`, then the workflow generates the full recipe. The `recipe_ready` event fires when `RecipeReadyProcessor` confirms it.

For the describe path:
- The success screen shows "Synthesizing…" with a pulse loader
- If the user stays on the screen, the transition to "ready" state happens in-place
- If the user navigates away, `LibraryToast` handles it

The GOTO describe path is unchanged: existing copy and flow.

---

## E2E test specifications

```typescript
test('capture submit → queued state (no auto-redirect)', async ({ page }) => {
  // 1. navigate to /capture
  // 2. submit a describe recipe
  // 3. assert success screen shows "Recipe queued" heading
  // 4. assert no navigation after 5s (auto-redirect removed)
  // 5. assert "Add Another" button visible
});

test('capture success → SSE recipe_ready → screen transitions to ready', async ({ page }) => {
  // 1. navigate to /capture, submit describe recipe (returns recipeId)
  // 2. mock SSE to emit recipe_ready { recipeId, name: 'Lasagna', imageUrl: '' }
  // 3. assert success screen transitions to "Lasagna is ready!" heading
  // 4. assert "Add to this week" button visible
});

test('nav dot appears when recipe pending, disappears on ready', async ({ page }) => {
  // 1. submit recipe → assert capture nav item has pending dot
  // 2. mock SSE recipe_ready → assert dot disappears
});

test('"Add Another" keeps user on capture page', async ({ page }) => {
  // 1. submit recipe → see queued state
  // 2. tap "Add Another" → assert on /capture, form reset
});
```
