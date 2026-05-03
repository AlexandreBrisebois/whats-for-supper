# Flow: Planner Week Lifecycle

Documents the full lifecycle of a week plan — from empty draft through family voting, smart defaults, locking, and the home page voting nudge. Covers both the current implementation and the target state after `planner-voting-ux` spec is implemented.

Related spec: [`.kiro/specs/planner-voting-ux/requirements.md`](../../.kiro/specs/planner-voting-ux/requirements.md)
Digital twin pattern: [`docs/flows/client-domain-model.md`](../client-domain-model.md)

---

## Week Status State Machine

A week moves through three server-side states stored in `WeeklyPlan.Status`:

```mermaid
stateDiagram-v2
    [*] --> Draft : Week starts (no WeeklyPlan row yet)
    Draft --> VotingOpen : POST /api/schedule/voting/open
    VotingOpen --> Locked : POST /api/schedule/lock
    Locked --> [*] : Week is done

    Draft : 0 — Draft\nRecipes can be assigned/moved/removed.\nNo family voting yet.
    VotingOpen : 1 — VotingOpen\nFamily members vote in Discovery.\nSmart defaults surface consensus picks.\nNew recipes can still be assigned.
    Locked : 2 — Locked\nAll votes purged (Global Purge #1).\nRecipes are fixed.\nNo further changes.

    note right of VotingOpen
        isVotingOpen = true
        Discovery stack shows unvoted recipes
        Smart defaults show consensus picks
        VotingNudgeCard appears on home
    end note

    note right of Locked
        isLocked = true
        "Menu's In!" shown in planner
        Plan next week → navigates to weekOffset+1
    end note
```

---

## Full Week Lifecycle Sequence

```mermaid
sequenceDiagram
    autonumber

    actor Mom
    actor Family as Family Members
    participant Home as HomeCommandCenter
    participant Planner as Planner Page (weekStore)
    participant Discovery as Discovery Stack
    participant API as Schedule API
    participant DB as PostgreSQL

    %% ─── WEEK STARTS: DRAFT ──────────────────────────────────────────────────
    rect rgb(230, 240, 255)
        note over Planner,DB: Week N — Status: 0 (Draft). No WeeklyPlan row yet.
        Mom->>Planner: Opens planner (weekOffset=N)
        Planner->>API: GET /api/schedule?weekOffset=N
        API-->>Planner: { status: 0, days: [7 empty slots] }
        Planner->>Mom: Empty week grid shown
    end

    %% ─── MOM PLANS MEALS ─────────────────────────────────────────────────────
    rect rgb(230, 255, 230)
        note over Planner: Mom assigns recipes via Quick Find or recipe library
        Mom->>Planner: Taps empty slot → Quick Find
        Planner->>API: GET /api/schedule/fill-the-gap?weekOffset=N
        note over API: Rotation sort: LastCookedDate ASC NULLS FIRST\nExcludes recipes already in week N\nFamily favourites pool first, then discovery fallback
        API-->>Planner: [5 recipe suggestions — never/rarely cooked, not in week]
        Mom->>Planner: Selects recipe
        Planner->>Planner: weekStore.assignRecipe(dayIndex, recipe) [optimistic]
        Planner->>API: POST /api/schedule/assign { weekOffset, dayIndex, recipeId }
        API-->>DB: INSERT CalendarEvent
    end

    %% ─── MOM OPENS VOTING ────────────────────────────────────────────────────
    rect rgb(255, 245, 210)
        note over Planner: Mom taps "Ask the Family" CTA in planner header\n(available when status=0, regardless of planned count)
        Mom->>Planner: Taps "Ask the Family"
        Planner->>Planner: weekStore.openVoting() → status=1 [optimistic]
        Planner->>API: POST /api/schedule/voting/open?weekOffset=N
        API-->>DB: UPDATE WeeklyPlan SET Status=VotingOpen
        Planner->>Mom: "Voting live" badge appears, "Ask the Family" CTA hidden
    end

    %% ─── FAMILY VOTES ────────────────────────────────────────────────────────
    rect rgb(240, 240, 255)
        note over Home,Discovery: VotingNudgeCard appears on home for weekOffset=N+1\n(if this is next week's voting)
        Home->>API: GET /api/schedule?weekOffset=N [client-side useEffect]
        API-->>Home: { status: 1 } → VotingNudgeCard shown
        Family->>Home: Taps "Vote Now →" on VotingNudgeCard
        Home->>Discovery: navigate to /discover
        Family->>Discovery: Swipes through recipe stack, votes Like/Dislike
        Discovery->>API: POST /api/discovery/{id}/vote { vote: 1 }
        API-->>DB: INSERT RecipeVote
    end

    %% ─── SMART DEFAULTS SURFACE ──────────────────────────────────────────────
    rect rgb(220, 255, 220)
        note over Planner: Planner polls every 30s for vote count updates
        Planner->>API: GET /api/schedule/{N}/smart-defaults
        note over API: Consensus threshold = ceil((familySize+1)/2)\nRecipes with votes ≥ threshold → PreSelectedRecipes\nAssigned to open day slots
        API-->>Planner: { preSelectedRecipes: [...], openSlots: [...] }
        Planner->>Mom: Ochre vote badges appear on pending recipe slots
        note over Planner: _isPending=true slots show vote count\nMom can confirm or replace them
    end

    %% ─── MOM LOCKS THE WEEK ──────────────────────────────────────────────────
    rect rgb(255, 230, 230)
        note over Planner: Mom taps "Plan next week" (≥4 recipes planned)
        Mom->>Planner: Taps "Plan next week"
        Planner->>Planner: weekStore.lockWeek() → status=2 [optimistic]
        Planner->>API: POST /api/schedule/lock?weekOffset=N
        note over API: Global Purge #1: DELETE all RecipeVotes\nVote counts persisted to CalendarEvent.VoteCount\nWeeklyPlan.Status = Locked
        API-->>DB: Purge votes, lock events
        Planner->>API: POST /api/schedule/voting/open?weekOffset=N+1
        note over API: Opens voting for next week immediately
        API-->>DB: INSERT/UPDATE WeeklyPlan for week N+1
        Planner->>Mom: "Menu's In!" shown, navigates to weekOffset=N+1
    end

    %% ─── NEXT WEEK VOTING NUDGE ──────────────────────────────────────────────
    rect rgb(255, 245, 210)
        note over Home: Next time Mom opens home page
        Home->>API: GET /api/schedule?weekOffset=1 [client-side, after mount]
        API-->>Home: { status: 1 } → VotingNudgeCard shown for next week
        Mom->>Home: Sees "The family is voting on next week"
        Mom->>Home: Taps "Vote Now →" → navigates to /discover
    end
```

---

## Quick Find Rotation Sort

```mermaid
flowchart TD
    A["GET /api/schedule/fill-the-gap?weekOffset=N"] --> B["Load current week's CalendarEvents\n(to build exclusion set)"]
    B --> C["Query RecipeMatches\n(family favourites)"]
    C --> D["Exclude recipes already in week N"]
    D --> E["Sort: LastCookedDate ASC NULLS FIRST\nthen VoteCount DESC"]
    E --> F{5 results?}
    F -->|Yes| G["Return 5 results"]
    F -->|No — need more| H["Query DiscoveryRecipes fallback\n(exclude week N + already used IDs)"]
    H --> I["Sort: LastCookedDate ASC NULLS FIRST\nthen VoteCount DESC"]
    I --> J["Append to fill up to 5"]
    J --> G

    style A fill:#E1AD01,color:#000
    style G fill:#8A9A5B,color:#fff
```

---

## weekStore Digital Twin — State Transitions

```mermaid
stateDiagram-v2
    [*] --> Loading : init(weekOffset) called
    Loading --> Hydrated : API response received
    Hydrated --> OptimisticWrite : assignRecipe / removeRecipe / moveRecipe
    OptimisticWrite --> Hydrated : Background POST/DELETE resolves
    OptimisticWrite --> Hydrated : Background POST/DELETE fails (revert)
    Hydrated --> VotingOptimistic : openVoting()
    VotingOptimistic --> Hydrated : POST /voting/open resolves
    VotingOptimistic --> Hydrated : POST /voting/open fails (revert to status=0)
    Hydrated --> LockOptimistic : lockWeek()
    LockOptimistic --> Hydrated : POST /lock resolves
    LockOptimistic --> Hydrated : POST /lock fails (revert to status=1)

    Loading : isLoading=true\nshows cached state if available
    Hydrated : isLoading=false\nstatus seeded from API\nschedule = 7 days
    OptimisticWrite : optimisticWriteAt = now\nsync() skips currentRecipe update\nfor 10s window
    VotingOptimistic : status=1 locally\nAPI call in-flight
    LockOptimistic : status=2 locally\nAPI call in-flight
```

---

## VotingNudgeCard — Home Page Decision

```mermaid
flowchart LR
    A["HomeCommandCenter mounts"] --> B["useEffect: GET /api/schedule?weekOffset=1"]
    B --> C{status === 1?}
    C -->|Yes| D["Show VotingNudgeCard\n(ochre, below tonight card)"]
    C -->|No| E["No card shown"]
    D --> F{User taps?}
    F -->|"Vote Now →"| G["navigate('/discover')"]
    F -->|Dismiss| H["Hide for session\n(no storage write)"]
    B --> I{Fetch fails?}
    I -->|Yes| E

    style D fill:#E1AD01,color:#000
    style G fill:#8A9A5B,color:#fff
```

---

## State Decision Table — Planner Header CTAs

| `status` | `isVotingOpen` | `isLocked` | "Ask the Family" CTA | "Voting live" badge | "Close Voting" btn | "Plan next week" btn |
|----------|---------------|------------|---------------------|--------------------|--------------------|---------------------|
| 0 (Draft) | false | false | ✅ Always shown | ❌ | ❌ | ✅ if ≥4 planned |
| 1 (VotingOpen) | true | false | ❌ | ✅ | ✅ | ✅ if ≥4 planned |
| 2 (Locked) | false | true | ❌ | ❌ | ❌ | ❌ ("Menu's In!") |

> **Current bug:** "Ask the Family" only shows when `plannedCount > 0`. After fix (Req 6): shows whenever `status === 0` and week is not in the past.

---

## Contract Gaps (to fix in spec)

| Gap | Current state | Required fix |
|-----|--------------|--------------|
| `GET /api/schedule` response missing `status` field in OpenAPI schema | `ScheduleDays` schema has `locked` and `weekOffset` but no `status` | Add `status: integer (0\|1\|2)` to `ScheduleDays` schema |
| `GET /api/schedule/fill-the-gap` has no `weekOffset` param | No query param in contract | Add optional `weekOffset: integer` query param |
| `fill-the-gap` sort order not documented | No sort description | Document rotation sort in OpenAPI description |
