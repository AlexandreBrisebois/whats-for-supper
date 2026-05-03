# Order-In Flow

**What's for Supper — PWA**
Documents the two paths a user can take to log an "Order In" night, plus how that state persists across a page reload via SSR.

---

## Scenario A — Order In from TonightMenuCard (recipe is planned)

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

    User->>SRD: Taps "Ordering In" (pizza button)
    SRD->>HCC: onAction('order_in')
    SRD->>SRD: setStep(2)

    Note over SRD: Step 2 — "What about tonight's recipe?"<br/>Options: Tomorrow · Next Week · Drop It

    User->>SRD: Picks one option (e.g. "Tomorrow")
    SRD->>HCC: onAction('tomorrow' | 'next_week' | 'drop')

    alt action === 'tomorrow'
        HCC->>API: POST /api/schedule/move { intent: 'push', fromIndex: today, toIndex: today+1 }
    else action === 'next_week'
        HCC->>API: POST /api/schedule/move { intent: 'push', targetWeekOffset: 1 }
    else action === 'drop'
        HCC->>API: DELETE /api/schedule/day/{date}/remove
    end

    HCC->>API: POST /api/schedule/day/{date}/validate { status: 3 }
    API-->>HCC: 200 OK

    HCC->>HCC: setIsSkipped(true), setSessionDone(true)
    HCC->>HCC: setShowRecovery(false)

    Note over HCC: TonightMenuCard unmounts.<br/>TonightPivotCard renders (pivot shown for rest of session).

    Note over HCC: On page reload — see Scenario C
```

> **Note on `status: 3`:** The validate call with `status: 3` (Skipped) is made for the "Order In" branch regardless of which recipe-rescue option the user picks. The recipe-rescue action (tomorrow / next_week / drop) is a separate move/delete call that runs first.

---

## Scenario B — Order In from TonightPivotCard (no recipe planned)

The user has no recipe scheduled tonight. The pivot card is already showing. They tap **Order In** directly.

```mermaid
sequenceDiagram
    actor User
    participant TPC as TonightPivotCard
    participant HCC as HomeCommandCenter
    participant API as POST /api/schedule/day/{date}/validate

    Note over HCC: currentRecipe === null<br/>TonightPivotCard is rendered

    User->>TPC: Taps "Order In"
    TPC->>HCC: onOrderIn() → handleRecoveryAction('order_in')

    Note over HCC: currentRecipe === null<br/>No SkipRecoveryDialog opened.<br/>No recipe to rescue.

    HCC->>API: POST /api/schedule/day/{date}/validate { status: 3 }
    API-->>HCC: 200 OK

    HCC->>HCC: setIsSkipped(true), setSessionDone(true)

    Note over HCC: "Ordered In" success state shown.<br/>TonightPivotCard remains visible<br/>(isSkipped=true, sessionDone=true).

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
        HCC->>HCC: setIsCooked(true), setSessionDone(true)
    else todaysEntry.status === 3 (Skipped / Ordered In)
        HCC->>HCC: setIsSkipped(true), setSessionDone(true)
    else todaysEntry has a recipe
        HCC->>HCC: setCurrentRecipe(recipe)
    else no recipe
        HCC->>HCC: setCurrentRecipe(null)
    end

    Note over HCC: Render decision — see state table below
```

---

## State Decision Table

What `HomeCommandCenter` renders for each `todayStatus` value after the client-side reconcile completes.

| `todaysEntry.status` | `isSkipped` | `isCooked` | `sessionDone` | Card shown |
|---|---|---|---|---|
| `0` — Draft (recipe assigned) | `false` | `false` | `false` | **TonightMenuCard** |
| `0` — Draft (no recipe) | `false` | `false` | `false` | **TonightPivotCard** |
| `2` — Cooked | `false` | `true` | `true` | **CookedSuccessCard** |
| `3` — Skipped / Ordered In | `true` | `false` | `true` | **TonightPivotCard** (done state — pivot visible but session is over) |

> **Why TonightPivotCard for status 3?** The render condition is `(!currentRecipe || isSkipped || sessionDone) && !isCooked`. When `isSkipped=true` and `sessionDone=true`, the pivot card renders but the user has already acted — no further action is expected this session. On reload, the same state is re-derived from the API, so the pivot card is shown in its neutral state (no "Ordered In" toast, just the card).
