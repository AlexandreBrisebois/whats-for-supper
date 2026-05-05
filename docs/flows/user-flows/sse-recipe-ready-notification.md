# Flow: Recipe Synthesis Complete → Library Notification

**Spec:** `.kiro/specs/00-live-schedule` — Flow 8 / R11
**Trigger:** SSE `recipe_ready` event — fires when `RecipeReadyProcessor` confirms recipe is fully synthesized and ready for use.
**Reviewed by:** The Mère-Designer

---

## SSE payload (enriched from original spec)

```json
{
  "type": "recipe_ready",
  "recipeId": "uuid",
  "name": "Spaghetti Bolognese",
  "imageUrl": "/api/recipes/{id}/hero"
}
```

`imageUrl` may be null if hero generation failed but the recipe is otherwise ready (describe-only path without an image).

---

## Why the recipe name is required

A parent who submits 3 recipes in one sitting (a URL import, a photo, and a describe) will receive 3 notifications. Without naming the recipe, "Recipe is ready!" means nothing. The name is the identity anchor. The enriched payload makes each notification scannable.

---

## Notification queue behaviour (multi-submit case)

When multiple `recipe_ready` events arrive:

1. Each is pushed to `libraryStore.notifications` independently
2. The `LibraryToast` component renders ONE notification at a time (most recent on top)
3. A count badge below shows "+2 more" if >1 is queued
4. Tapping "more" opens a bottom drawer listing all pending notifications
5. Each can be dismissed individually or "Add to this week" from the drawer

**Mère-Designer ruling:** No toast shower. No replace. One visible + count badge + expandable drawer. Keeps the UI calm while not hiding information.

---

## UI treatment

**Component:** `LibraryToast` — auto-dismisses after 5 seconds, NOT persistent.

**Why toast (not banner) here:**
This is a success event. The user still has the recipe ID in `captureStore.pendingRecipes` — if the toast is missed, the recipe is still available in the library. There is no dead end. Auto-dismiss is appropriate.

### Copy

```
✓ [Recipe Name] is ready!
```

- Checkmark + name + "ready" — specific, warm, celebratory
- Avoid "added to your library" (jargon)
- No technical language

### Visual style

```
Background: sage/10 (calm success)
Border: 1px solid sage/30
Left accent: 4px solid sage (vertical bar)
Thumbnail: 40×40px rounded-xl, shows imageUrl (or utensils icon fallback)
Text: charcoal, Inter, text-sm
Name: font-bold
Auto-dismiss: 5s progress bar (sage, thin, bottom of toast)
```

Framer Motion: `slide-in-from-bottom`, spring `stiffness: 300, damping: 30`. Exit: fade-out 200ms.

### "Add to this week" placement

**Not in the toast itself.** The toast is confirmational, not transactional.

On toast tap → open a bottom drawer with:
- Recipe name + image (larger view)
- Primary CTA: "Add to this week" → opens `QuickFindModal` filtered to this recipe
- Secondary: "View recipe" → navigates to `/recipes/{id}`
- Tertiary: "Dismiss"

**Mère-Designer ruling:** Toasts should confirm, not transact. Tap opens the action surface.

---

## Interaction with GOTO flow

The `recipe_ready` event also drives the GOTO flow (existing R requirement). Both paths receive the same event. The hook dispatches to two targets:

1. `useGotoStore.getState().markReady(recipeId)` — unlocks "Make This Tonight" button on /home
2. `libraryStore.pushNotification(...)` — shows toast (unless user is already on /home watching the GOTO button appear — in that case the toast is redundant but harmless; it auto-dismisses)

---

## Capture success screen integration

The success screen now shows TWO states depending on submit path:

| Path | Immediate state | After recipe_ready |
|---|---|---|
| Photo upload | "Recipe queued — we'll notify you when it's ready" + solar loader pulse | Toast appears, success screen (if still open) transitions to checkmark |
| URL capture | Same as photo | Same |
| Describe (non-GOTO) | "Synthesizing your recipe…" + solar loader | Same |
| Describe (GOTO intent) | "Your GOTO is being prepared" | GOTO button appears on /home |

**Auto-redirect removed (Mère-Designer ruling):** The 4-second auto-redirect to /home is removed. The user stays on the success screen and chooses: "Add another" (secondary) or "Done" (primary). This enables the multi-recipe batch submission flow without fighting the redirect.

---

## E2E test specification

```typescript
test('recipe_ready SSE → library toast with recipe name', async ({ page }) => {
  // 1. mock captureStore with a pending recipe { recipeId, name: 'Lasagna' }
  // 2. mock SSE to emit recipe_ready { recipeId, name: 'Lasagna', imageUrl: '' }
  // 3. navigate to /home
  // 4. assert toast visible with text 'Lasagna is ready!'
  // 5. assert toast auto-dismisses after 5s
});

test('recipe_ready toast → tap opens action drawer', async ({ page }) => {
  // 1-3. same setup
  // 4. tap toast
  // 5. assert drawer open with 'Add to this week' button visible
});

test('multiple recipe_ready events → count badge shown', async ({ page }) => {
  // 1. mock SSE to emit 3 recipe_ready events
  // 2. assert only 1 toast visible + '+2 more' badge
});
```
