# Session 5: State Preservation (Activity)

**Artifact:** Verified "Keep Alive" navigation for the Planner.

**Context needed:**
- `pwa/src/app/(app)/planner/page.tsx`
- `pwa/next.config.js` (to verify `cacheComponents` is active)

**What to build:**
- Ensure the **Planner** page correctly leverages React's `<Activity>` component (enabled via `cacheComponents`).
- Verify state preservation across navigations.

**Success:**
- Expanding a recipe card in the Planner, navigating to another page, and clicking "Back" returns the user to the exact same UI state (card still expanded, same scroll position).

---

## Prompt

```
Task: Verify and tune state preservation using React <Activity>.

With `cacheComponents` enabled, Next.js uses React's `<Activity>` to preserve component state. We need to verify this works for our most complex page: the Planner.

Requirements:
1. Ensure the Planner component is not accidentally opting out of state preservation (e.g., by using unique keys on every render).
2. Test the following flow:
   - Open Planner.
   - Expand a few recipe cards.
   - Scroll to the bottom.
   - Click on a recipe to go to its detail page.
   - Click the browser's back button.
3. If the state is lost, investigate if `useEffect` or local state initialization is resetting on "re-activation".

Deliverables:
1. Fixes for any components that lose state during navigation.
2. A brief summary of the state preservation behavior for future reference.

Testing:
- Manual verification of the "Back" button behavior.
```

---

## What to Expect

After this session:
- ✅ The Planner feels like a native app with instant, stateful navigation.
- ✅ The "Caching Phase" is complete.

## Next Steps

1. Run full E2E test suite: `npm run test:e2e`.
2. Commit: `git commit -m "caching: final verify of state preservation and activity"`
3. Phase Complete! 🏁
