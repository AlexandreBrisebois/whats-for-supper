# Flow: Recipe Selection → Home Page (Tonight's Supper)

This diagram traces the complete sequence of events when a user selects a recipe for today's supper and how it (should) appear on the home page as tonight's card.

Two execution paths are shown:
- **Happy path** — the selection completes before the mount reconciliation interferes
- **Race path** — the mount `getSchedule()` call resolves with stale data inside the gap between `assignRecipeToDay` and `router.refresh()`, causing the grey empty card to flash

---

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant PivotCard as TonightPivotCard
    participant HCC as HomeCommandCenter
    participant QFM as QuickFindModal
    participant Planner as planner.ts (API)
    participant Router as Next.js Router / SSR
    participant Backend as Backend API

    %% ─── HOME PAGE LOAD ───────────────────────────────────────────────────────
    rect rgb(230, 240, 255)
        note over Router,Backend: SSR — home/page.tsx executes on server
        Router->>Backend: GET /api/schedule?weekOffset=0
        Backend-->>Router: ScheduleDays { days[] }
        Router->>Router: find day where date === today
        Router->>HCC: render with todaysRecipe prop (null if nothing planned)
    end

    %% ─── CLIENT MOUNT ─────────────────────────────────────────────────────────
    rect rgb(230, 255, 230)
        note over HCC: useEffect fires on mount (HomeCommandCenter.tsx ~line 49)
        HCC->>HCC: setIsLoading(true) if no SSR recipe
        HCC->>Planner: getSchedule(0)  ← async, runs concurrently
        note over HCC,Planner: ⚠️ This call is in-flight for the entire mount phase
        Planner->>Backend: GET /api/schedule?weekOffset=0
    end

    %% ─── NO RECIPE PLANNED: PIVOT CARD SHOWN ──────────────────────────────────
    HCC->>PivotCard: render TonightPivotCard (currentRecipe === null)
    User->>PivotCard: taps "Quick Find"
    PivotCard->>HCC: onDiscover()
    HCC->>QFM: open QuickFindModal

    QFM->>Planner: getFillTheGap()
    Planner->>Backend: GET /api/schedule/fillTheGap
    Backend-->>Planner: RecipeDto[5]
    Planner-->>QFM: recipes
    QFM->>User: show recipe carousel

    User->>QFM: taps "Select" on a recipe
    QFM->>HCC: onSelect(recipe)

    %% ─── FIXED PATH (OPTIMISTIC) ──────────────────────────────────────────────
    rect rgb(230, 255, 230)
        note over HCC: handleQuickFindSelect() — HomeCommandCenter.tsx ~line 180
        note over HCC: ✅ FIXED: setCurrentRecipe(recipe)  ← optimistic update added
        HCC->>HCC: setCurrentRecipe(recipe)
        HCC->>User: TonightMenuCard renders immediately ✅
        HCC->>Planner: assignRecipeToDay(0, dayIndex, recipe)
        Planner->>Backend: POST /api/schedule/assign
        Backend-->>Planner: 200 OK
        Planner-->>HCC: resolved
        HCC->>HCC: setShowQuickFind(false)
        HCC->>Router: router.refresh()
        Router->>Backend: GET /api/schedule?weekOffset=0
        Backend-->>Router: ScheduleDays populated
        Router->>HCC: todaysRecipe hydrated
        HCC->>HCC: setCurrentRecipe(todaysRecipe)
    end

    %% ─── GOTO CONFIRM PATH (OPTIMISTIC) ───────────────────────────────────────
    rect rgb(255, 245, 210)
        note over HCC: onConfirmGoto() — HomeCommandCenter.tsx ~line 207
        User->>PivotCard: taps "Confirm GOTO"
        PivotCard->>HCC: onConfirmGoto()
        note over HCC: ✅ FIXED: setCurrentRecipe({ id: gotoRecipeId, ... })
        HCC->>HCC: setCurrentRecipe({ id: gotoRecipeId, ... })
        HCC->>User: TonightMenuCard renders immediately ✅
        HCC->>Planner: assignRecipeToDay(0, dayIndex, ...)
        Planner->>Backend: POST /api/schedule/assign
        Backend-->>Planner: 200 OK
        HCC->>Router: router.refresh()
    end
```

---

## Optimistic Fix Summary

| Step | Actor | State after |
|------|-------|-------------|
| User selects recipe | User | — |
| `setCurrentRecipe(recipe)` | HCC | `currentRecipe` populated — Menu Card shown immediately ✅ |
| `assignRecipeToDay` starts | HCC | Request in flight |
| `assignRecipeToDay` completes | HCC | `router.refresh()` fires |
| SSR re-hydrates props | Router → HCC | `currentRecipe` updated with final SSR data ✅ |

## Resolution

The race condition was resolved by adding optimistic `setCurrentRecipe(recipe)` calls in `handleQuickFindSelect` and `onConfirmGoto` immediately before the asynchronous `assignRecipeToDay` call. This ensures that the `TonightMenuCard` renders instantly upon user action, providing a snappy experience and bridging the gap before the Next.js `router.refresh()` cycle completes.

Verified via E2E tests in [`pwa/e2e/home-race.spec.ts`](../../pwa/e2e/home-race.spec.ts).
Build prompt: [`specs/05_BUILD_PROMPTS/home-recipe-selection-race-fix.md`](../../specs/05_BUILD_PROMPTS/home-recipe-selection-race-fix.md).
