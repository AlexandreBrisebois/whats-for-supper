# Fix FamilyGOTOSettings Reactivity Bug

## Context
The `FamilyGOTOSettings` component is responsible for displaying the "Family GOTO" configuration list. When the app is waiting for a GOTO recipe to finish synthesizing, it shows a "Synthesizing GOTO..." spinner. When the synthesis completes, an SSE event (`recipe_ready`) is fired. The `useScheduleStream` hook catches this event and calls `useGotoStore.getState().markReady(recipeId)`.

The UI is expected to automatically switch from the pending spinner to the actual recipe name without needing a manual refresh.

## The Bug
The UI is permanently stuck on the spinner and fails to re-fetch the completed GOTO data.

The component uses a `useEffect` hook to detect when a pending recipe becomes ready, so it can call `loadGoTo()` to fetch the updated recipe details from the server:

```tsx
  const { isReady } = useGotoStore();
  useEffect(() => {
    const hasAnyPendingNowReady = currentGotos.some(
      (g: GoToItem) => g.status === 'pending' && isReady(g.recipeId!)
    );

    if (hasAnyPendingNowReady) {
      loadGoTo().then(() => {
        setShowReadyFlash(true);
        setTimeout(() => setShowReadyFlash(false), 2000);
      });
    }
  }, [isReady, currentGotos, loadGoTo]);
```

Because `isReady` is a stable function reference initialized once when the Zustand store is created, the dependency array `[isReady, currentGotos, loadGoTo]` never evaluates as "changed". When `markReady(recipeId)` updates the store's `readyRecipeIds` set, the component re-renders (because `useGotoStore()` without a selector subscribes to the full state object), but the `useEffect` is skipped. Thus, `loadGoTo()` is never called.

## Resolution Plan
1. Update `FamilyGOTOSettings.tsx` to explicitly select and depend on `readyRecipeIds` from the `gotoStore` instead of the stable `isReady` function.
2. Modify the `useEffect` dependency array to include `readyRecipeIds`, ensuring the effect fires when the set is mutated.
3. Verify that the UI smoothly transitions from the spinner to the recipe name when `markReady` is triggered.

Example fix:
```tsx
  const readyRecipeIds = useGotoStore((state) => state.readyRecipeIds);
  
  useEffect(() => {
    const hasAnyPendingNowReady = currentGotos.some(
      (g: GoToItem) => g.status === 'pending' && readyRecipeIds.has(g.recipeId!)
    );
    // ...
  }, [readyRecipeIds, currentGotos, loadGoTo]);
```
