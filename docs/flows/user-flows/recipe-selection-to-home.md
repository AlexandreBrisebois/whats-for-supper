# Flow: Recipe Selection → Home Page (Tonight's Supper)

> ✅ **Updated for `home-command-center-hardening`.**
>
> This document reflects the corrected implementation:
> - `todayStore` owns all today-scoped recipe and status state — `HomeCommandCenter` holds no local state for these.
> - Optimistic writes go through `todayStore.assignRecipe()`, which sets `currentRecipe` and `optimisticWriteAt` synchronously before firing the network call.
> - `router.refresh()` is **not** called from any action handler. Re-hydration happens via background `sync()` with a 10-second optimistic write protection window.
> - The "Race path" (grey card flash) is historical — it was resolved in `863451d` and is now fully superseded by the todayStore architecture.
>
> Historical context (pre-fix race condition) is preserved in the [Historical Race Path](#historical-race-path) section below.

Related specs: [home-command-center-hardening](../../.kiro/specs/home-command-center-hardening/)  
ADR: [033-recipe-readiness-as-recipe-domain-concern.md](../../specs/decisions/033-recipe-readiness-as-recipe-domain-concern.md)

---

## Sequence Diagram — Current Implementation

Two selection paths are shown: Quick Find (from pivot card) and "Make This Tonight" (GOTO confirm).

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant PivotCard as TonightPivotCard
    participant HCC as HomeCommandCenter
    participant Store as todayStore
    participant QFM as QuickFindModal
    participant Planner as planner/page.tsx
    participant MenuCard as TonightMenuCard
    participant Backend as Backend API

    %% ─── HOME PAGE LOAD ───────────────────────────────────────────────────────
    rect rgb(230, 240, 255)
        note over HCC,Backend: SSR — home/page.tsx executes on server
        HCC->>Backend: GET /api/schedule?weekOffset=0
        Backend-->>HCC: ScheduleDays
        HCC->>Store: init(todaysRecipe, todayStatus)
        note over Store: sets currentRecipe + status; clears optimisticWriteAt
        HCC->>Store: sync()  ← background, non-blocking
    end

    HCC->>PivotCard: render — no recipe tonight

    %% ─── PATH A: QUICK FIND ───────────────────────────────────────────────────
    rect rgb(230, 255, 230)
        note over User,QFM: Path A — Quick Find from pivot card
        User->>PivotCard: taps "Quick Find"
        PivotCard->>HCC: onDiscover()
        HCC->>QFM: open QuickFindModal
        QFM->>Backend: GET /api/schedule/fillTheGap
        Backend-->>QFM: RecipeDto[5]
        QFM->>User: show recipe carousel
        User->>QFM: taps "Select" on a recipe
        QFM->>HCC: onSelect(recipe)
        HCC->>Store: assignRecipe({ id, name, image })
        note over Store: currentRecipe set + optimisticWriteAt = Date.now() synchronously
        Store->>HCC: (subscription) currentRecipe populated
        HCC->>MenuCard: TonightMenuCard renders immediately ✅
        Store->>Backend: POST /api/schedule/assign  ← background
        Backend-->>Store: 200 OK
    end

    %% ─── PATH B: MAKE THIS TONIGHT (GOTO) ─────────────────────────────────────
    rect rgb(255, 245, 210)
        note over User,PivotCard: Path B — "Make This Tonight" from pivot card
        User->>PivotCard: taps "Make This Tonight"
        PivotCard->>HCC: onConfirmGoto()
        HCC->>Store: assignRecipe({ id: gotoRecipeId, name: gotoDescription, image: gotoImageUrl })
        note over Store: currentRecipe set + optimisticWriteAt = Date.now() synchronously
        Store->>HCC: (subscription) currentRecipe populated
        HCC->>MenuCard: TonightMenuCard renders immediately ✅
        Store->>Backend: POST /api/schedule/assign  ← background
        Backend-->>Store: 200 OK
    end

    %% ─── PATH C: PLANNER ASSIGNMENT FOR TODAY ─────────────────────────────────
    rect rgb(240, 230, 255)
        note over Planner,Store: Path C — recipe assigned from planner for today's slot
        User->>Planner: selects recipe for today in planner
        Planner->>Planner: optimistic local state update
        Planner->>Store: useTodayStore.getState().assignRecipe({ id, name, image })
        note over Store: currentRecipe set + optimisticWriteAt = Date.now() synchronously
        Store->>HCC: (subscription) currentRecipe populated — no navigation needed ✅
        Planner->>Backend: POST /api/schedule/assign  ← background
        Backend-->>Planner: 200 OK
    end
```

---

## Optimistic Write Summary

| Step | Actor | State after |
|------|-------|-------------|
| User selects recipe | User | — |
| `todayStore.assignRecipe(recipe)` | HCC / Planner | `currentRecipe` populated, `optimisticWriteAt` set — Menu Card shown immediately ✅ |
| `POST /api/schedule/assign` fires | Store (background) | Request in flight |
| `POST /api/schedule/assign` completes | Store | `optimisticWriteAt` remains set for 10-second protection window |
| `sync()` runs (background) | Store | Skips `currentRecipe` update if within 10-second window; updates after window expires |

---

## Background Sync — Optimistic Write Protection

`todayStore.sync()` reconciles local state with the server schedule. It is called on mount (non-blocking) and does not block the UI.

| `optimisticWriteAt` | Elapsed since write | Sync behaviour |
|---|---|---|
| `null` | — | Always update `currentRecipe` from server |
| set | < 10 000 ms | Skip update — protect the optimistic write |
| set | ≥ 10 000 ms | Update `currentRecipe` from server |

This replaces the old `router.refresh()` + `pendingConfirmRef` pattern. There is no longer a gap between the optimistic write and the server confirmation during which a background fetch could clobber the recipe.

---

## E2E Verification

| Scenario | Test file |
|----------|-----------|
| Quick Find → menu card immediately (no network wait) | `home-goto.spec.ts` |
| "Make This Tonight" → menu card immediately | `home-goto.spec.ts` |
| Page reload after "Make This Tonight" → menu card still shown | `home-goto.spec.ts` |
| Planner assignment for today → home reflects without navigation | `home-recipe.spec.ts` |
| Page reload after "Order In" → pivot card not shown | `home-recipe.spec.ts` |
| Optimistic recipe survives background sync within 10-second window | `home-race.spec.ts` |

---

## Historical Race Path

> This section is preserved for archaeological context only. It describes the broken pre-fix behaviour.

Before `home-command-center-hardening`, the flow used `router.refresh()` as the re-hydration mechanism:

1. `handleQuickFindSelect` / `onConfirmGoto` called `setCurrentRecipe(recipe)` optimistically.
2. After `assignRecipeToDay` resolved, `router.refresh()` was called.
3. Next.js re-ran SSR, fetched the schedule, and re-hydrated `todaysRecipe` as a prop.
4. A mount `useEffect` called `getSchedule()` concurrently — if this resolved with stale data inside the gap between `assignRecipeToDay` and `router.refresh()`, the grey empty card flashed briefly.

The `pendingConfirmRef` was introduced as a guard to suppress the stale-data flash, but it was fragile and did not cover all race paths.

This entire mechanism is replaced by `todayStore`. `router.refresh()` no longer appears in any action handler. The `pendingConfirmRef` has been removed.

Build prompt (historical): [`specs/05_BUILD_PROMPTS/home-recipe-selection-race-fix.md`](../../specs/05_BUILD_PROMPTS/home-recipe-selection-race-fix.md).
