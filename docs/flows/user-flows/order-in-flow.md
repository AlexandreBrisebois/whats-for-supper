# Take Out Flow

**What's for Supper — PWA**
Documents the two paths a user can take to log a "Take Out" night, plus how that state persists across a page reload via SSR.

---

## Scenario A — Take Out from TonightMenuCard (recipe is planned)

The user has a recipe scheduled for tonight. They open the ingredient flip-side of the card and tap **Skip**.

```mermaid
sequenceDiagram
    actor User
    participant TMC as TonightMenuCard
    participant HCC as HomeCommandCenter
    participant SRD as SkipRecoveryDialog
    participant API as POST /api/schedule/day/{date}/validate

    User->>TMC: Taps "Skip" (back of card)
    TMC->>HCC: onSkip(recipeId) → handleSkipTrigger()
    HCC->>HCC: setShowRecovery(true)
    HCC->>SRD: renders <SkipRecoveryDialog isOpen={true} />

    Note over SRD: Step 1 — "What's the backup plan?"

    User->>SRD: Taps "Take Out" (pizza button)
    SRD->>HCC: onAction('order_in')
    SRD->>SRD: setStep(2)

    Note over SRD: Step 2 — "What about tonight's recipe?"<br/>Options: Tomorrow · Next Week · Drop It

    User->>SRD: Picks one option (e.g. "Tomorrow")
    SRD->>HCC: onAction('tomorrow' | 'next_week' | 'drop')

    alt action === 'tomorrow'
        HCC->>API: POST /api/schedule/move { intent: 'tomorrow', fromIndex: today, toIndex: today+1 }
    else action === 'next_week'
        HCC->>API: POST /api/schedule/move { intent: 'defer', sourceDate: today, recipeId }
        API-->>HCC: final scheduled date and message
    else action === 'drop'
        HCC->>API: DELETE /api/schedule/day/{date}/remove
    end

    HCC->>API: POST /api/schedule/day/{date}/validate { status: 3, nonCookingKind: 'order_in' }
    API-->>HCC: 200 OK

    Note over HCC: todayStore updates status=3 + nonCooking.<br/>TonightMenuCard renders the saved Take Out plan.

    Note over HCC: On page reload — see Scenario C
```

> **Note on `status: 3`:** The validate call with `status: 3` (Skipped) is made for the "Take Out" branch regardless of which recipe-rescue option the user picks. The recipe-rescue action (tomorrow / next_week / drop) runs first. For **Next Week**, the server starts on the following Monday and chooses the first date without a calendar entry; when that week is full, it continues into later weeks and returns the final destination message.

---

## Scenario B — Take Out from TonightPivotCard (no recipe planned)

The user has no recipe scheduled tonight. The pivot card is already showing. They tap **Take Out** directly.

```mermaid
sequenceDiagram
    actor User
    participant TPC as TonightPivotCard
    participant HCC as HomeCommandCenter
    participant API as POST /api/schedule/day/{date}/validate

    Note over HCC: currentRecipe === null<br/>TonightPivotCard is rendered

    User->>TPC: Taps "Take Out"
    TPC->>HCC: onOrderIn() → handleRecoveryAction('order_in')

    Note over HCC: currentRecipe === null<br/>No SkipRecoveryDialog opened.<br/>No recipe to rescue.

    HCC->>API: POST /api/schedule/day/{date}/validate { status: 3, nonCookingKind: 'order_in' }
    API-->>HCC: 200 OK

    Note over HCC: todayStore updates status=3 + nonCooking.<br/>Saved Take Out state renders on TonightMenuCard.

    Note over HCC: On page reload — see Scenario C
```

> **Key difference from Scenario A:** Because `currentRecipe === null`, the `if (currentRecipe)` guard in `handleRecoveryAction` is false — the validate call still fires (status 3 is always written), but no recipe-rescue dialog or move call is made.

---

## Scenario C — State Persistence via SSR

Shows how `home/page.tsx` reads today's schedule status on the server and how `HomeCommandCenter` initialises its local state from that on mount.

```mermaid
sequenceDiagram
    participant Browser
    participant NextSSR as home/page.tsx (Server Component)
    participant ScheduleAPI as GET /api/schedule?weekOffset=0
    participant HCC as HomeCommandCenter (Client)

    Browser->>NextSSR: GET /home (page reload)
    NextSSR->>ScheduleAPI: serverFetch('/api/schedule?weekOffset=0')
    ScheduleAPI-->>NextSSR: ScheduleDays { days: [...] }

    NextSSR->>NextSSR: todaysEntry = days.find(d => d.date === todayStr)
    NextSSR->>NextSSR: isDone = (status === 2 || status === 3)
    NextSSR->>NextSSR: todaysRecipe = isDone ? null : todaysEntry.recipe

    NextSSR->>HCC: <HomeCommandCenter todaysRecipe={todaysRecipe} />

    Note over HCC: Mount — useEffect fires

    HCC->>ScheduleAPI: getSchedule(0)  [client-side reconcile]
    ScheduleAPI-->>HCC: ScheduleDays

    alt todaysEntry.status === 2 (Cooked)
        HCC->>Store: init(..., status=2)
    else todaysEntry.status === 3 (Non-cooking / Take Out)
        HCC->>Store: init(..., status=3, nonCooking)
    else todaysEntry has a recipe
        HCC->>Store: init(recipe, status=0)
    else no recipe
        HCC->>Store: init(null, status=0)
    end

    Note over HCC: Render decision — see state table below
```

---

## State Decision Table

What `HomeCommandCenter` renders for each `todayStatus` value via `todayStore`:

| `todaysEntry.status`          | `nonCooking`        | Card shown                                                         |
| ----------------------------- | ------------------- | ------------------------------------------------------------------ |
| `0` — Draft (recipe assigned) | `null`              | **TonightMenuCard** (planned recipe)                               |
| `0` — Draft (no recipe)       | `null`              | **TonightPivotCard** (empty / Go-To prompt)                        |
| `2` — Cooked                  | `null`              | **CookedSuccessCard**                                              |
| `3` — Non-cooking plan        | `order_in` / etc.   | **TonightMenuCard** (saved non-cooking plan + `Edit supper plan`)  |
| `3` — Mystery night (empty)   | `mystery`           | **TonightPivotCard** (saved Mystery night without ready suggestion)|
