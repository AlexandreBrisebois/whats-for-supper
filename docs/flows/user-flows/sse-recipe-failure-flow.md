# Flow: Recipe Processing Failure → Persistent Recovery Banner

**Spec:** `.kiro/specs/00-live-schedule` — Flow 7 / R10
**Trigger:** SSE `recipe_failed` event — fires ONLY when a workflow instance reaches `WorkflowStatus.Failed` (all retries exhausted). Does NOT fire on transient 429s, network hiccups, or individual task retries.
**Reviewed by:** The Mère-Designer

---

## When this fires

The backend `WorkflowWorker` has three failure modes:

| Mode | Action | SSE event? |
|---|---|---|
| Transient error (429, timeout) | Retry with backoff | **No** |
| Max retries reached on a task | Task marked `TaskStatus.Failed`, workflow paused | **No** |
| Workflow instance reaches `WorkflowStatus.Failed` | Final — no more retries | **Yes — `recipe_failed`** |

Only the third mode triggers the SSE event. This is intentional — the parent should never be interrupted by a recoverable hiccup.

---

## SSE payload

```json
{
  "type": "recipe_failed",
  "recipeId": "uuid",
  "errorMessage": "internal-only, not shown to user",
  "failedStep": "ExtractRecipe | GenerateHero | SyncRecipe",
  "partialData": {
    "name": "Spaghetti Bolognese",
    "imageUrl": null
  }
}
```

`partialData` contains whatever the recipe row had at the time of failure — name if extraction succeeded before failure, image URL if hero was generated. May be empty for very early failures.

---

## UI treatment

**Component:** `RecipeFailureBanner` — persistent, non-overlay, NOT a toast.

**Why persistent (Mère-Designer ruling):**
A 5-second toast creates a dead end. A parent holding a baby who misses the flash has no recovery path. The banner sits in the thumb zone, below primary content, and stays until the user acts or dismisses.

### Copy

```
Recipe couldn't be saved — [name if available, else "your recipe"]. Tap to try again.
```

- "couldn't" not "failed" — warm, not technical
- Named recipe when `partialData.name` is present — so the parent knows which one
- "Tap to try again" — active, one step, no ambiguity

### Visual style

```
Background: terracotta/10 (soft, not alarming)
Border: 1px solid terracotta/30
Icon: small circle with ! (not red, not skull)
Text: charcoal, Inter, text-sm
Dismiss: ✕ link (text-charcoal/40, right-aligned)
```

Framer Motion: `slide-in-from-bottom`, spring `stiffness: 300, damping: 30`. No bounce.

### Placement

Below all primary cards in `AppLayout` — above the navigation bar but below page content. Thumb zone. Never overlays a card or blocks the main action.

---

## Recovery flow

```
User taps banner
  → navigate to /capture?recipeId={id}&mode=retry
  → MinimalCapture reads ?recipeId param
  → pre-fills form with partialData.name (if available)
  → user edits and resubmits
  → PATCH /api/recipes/{id} — same ID, no new stub created
  → captureStore.removePending(recipeId)
  → banner dismissed
```

**Dismiss without retry:** banner has a ✕ link. On dismiss:
- `libraryStore.dismissNotification(recipeId)`
- Banner disappears
- Recipe remains in DB in failed state (user chose to ignore)

---

## Multi-failure case

If 2 recipes fail, 2 banners stack vertically. Max 2 visible (oldest dismissed first if a third arrives). A parent who submitted 5 recipes at once will not see 5 error banners — cap at 2, newest on top.

---

## E2E test specification

```typescript
test('recipe_failed SSE → persistent banner appears', async ({ page }) => {
  // 1. mock SSE to emit recipe_failed for a known recipeId
  // 2. navigate to /home
  // 3. assert banner visible with expected copy
  // 4. assert banner NOT dismissed after 5s (persistent)
  // 5. tap banner → assert navigate to /capture?recipeId=...&mode=retry
});

test('recipe_failed banner dismisses on ✕', async ({ page }) => {
  // 1. mock SSE to emit recipe_failed
  // 2. tap ✕
  // 3. assert banner no longer visible
});
```
