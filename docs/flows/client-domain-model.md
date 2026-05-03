# Client Domain Model — Digital Twin Architecture

The `todayStore` is a Zustand store that acts as a **digital twin** of the server's "today" schedule day. It is the single source of truth for both `HomeCommandCenter` and the planner page. It accepts optimistic writes immediately (zero UI lag) and reconciles with the server silently in the background.

This is not a service worker, not an offline cache, and not related to `pwa-caching`. It is a Zustand store with optimistic-first mutations and background reconciliation.

Related spec: [`.kiro/specs/home-command-center-hardening/requirements.md`](../../.kiro/specs/home-command-center-hardening/requirements.md)

---

## Architecture Overview

```mermaid
graph TB
    subgraph SERVER["Server Domain"]
        SSR["home/page.tsx<br/>(Server Component)"]
        API["Schedule API<br/>GET /api/schedule<br/>POST /api/schedule/assign<br/>POST /api/schedule/day/{date}/validate"]
        DB[("PostgreSQL<br/>schedule_days")]
    end

    subgraph CLIENT["Client Domain — Digital Twin"]
        STORE["todayStore (Zustand)<br/>─────────────────<br/>currentRecipe: ScheduleRecipeDto | null<br/>status: 0 | 2 | 3<br/>isLoading: boolean<br/>optimisticWriteAt: number | null<br/>lastSyncedAt: number<br/>─────────────────<br/>init(recipe, status)<br/>assignRecipe(recipe)<br/>markCooked()<br/>markOrderedIn()<br/>sync()"]

        HCC["HomeCommandCenter<br/>(pure consumer)"]
        PLANNER["Planner Page<br/>(writer for today's slot)"]
        PIVOT["TonightPivotCard"]
        MENU["TonightMenuCard"]
    end

    %% SSR seeds the store on first load
    SSR -->|"todaysRecipe + todayStatus props"| HCC
    HCC -->|"init(recipe, status) on mount"| STORE

    %% Components read from store
    STORE -->|"currentRecipe, status, isLoading"| HCC
    HCC --> PIVOT
    HCC --> MENU

    %% Planner writes to store
    PLANNER -->|"assignRecipe(recipe)"| STORE

    %% Optimistic writes — immediate, no network wait
    STORE -->|"setCurrentRecipe immediately"| HCC

    %% Background sync — silent, non-blocking
    STORE -.->|"POST /assign (background)"| API
    STORE -.->|"POST /validate (background)"| API
    STORE -.->|"GET /schedule (background sync)"| API

    %% API talks to DB
    API --- DB

    %% SSR also reads from API
    SSR -->|"serverFetch on page load"| API

    style STORE fill:#E1AD01,color:#000,stroke:#c49a00
    style SERVER fill:#f0f4ff,stroke:#c0c8e0
    style CLIENT fill:#f0fff4,stroke:#a0d0b0
```

---

## Optimistic Write Flow

```mermaid
sequenceDiagram
    actor User
    participant HCC as HomeCommandCenter
    participant Store as todayStore
    participant API as Schedule API

    User->>HCC: Taps "Make This Tonight"
    HCC->>Store: assignRecipe(recipe)

    Note over Store: ① setCurrentRecipe(recipe) immediately<br/>② setOptimisticWriteAt(now)

    Store-->>HCC: currentRecipe updated ✅
    HCC-->>User: TonightMenuCard renders instantly (0ms lag)

    Store->>API: POST /api/schedule/assign (background)
    API-->>Store: 200 OK

    Note over Store: optimisticWriteAt cleared<br/>lastSyncedAt updated

    Note over HCC: No router.refresh() — UI already correct
```

---

## Background Sync Flow

```mermaid
sequenceDiagram
    participant Store as todayStore
    participant API as Schedule API

    Note over Store: sync() called on mount<br/>or on 60s interval

    Store->>API: GET /api/schedule?weekOffset=0
    API-->>Store: ScheduleDays { days[] }

    alt optimisticWriteAt is null
        Note over Store: No in-flight write<br/>→ update currentRecipe from server
    else optimisticWriteAt < 10s ago
        Note over Store: Optimistic write in-flight<br/>→ SKIP currentRecipe update<br/>→ protect optimistic state
    else optimisticWriteAt > 10s ago
        Note over Store: Write confirmed or timed out<br/>→ update currentRecipe from server
    end

    Note over Store: Always update status (2/3)<br/>from server — these are authoritative
```

---

## State Initialisation from SSR

```mermaid
sequenceDiagram
    participant Browser
    participant SSR as home/page.tsx
    participant API as Schedule API
    participant HCC as HomeCommandCenter
    participant Store as todayStore

    Browser->>SSR: GET /home
    SSR->>API: serverFetch('/api/schedule?weekOffset=0')
    API-->>SSR: ScheduleDays

    SSR->>SSR: todayStatus = todaysEntry.status (0 | 2 | 3)<br/>todaysRecipe = status ∈ {2,3} ? null : entry.recipe

    SSR->>HCC: <HomeCommandCenter todaysRecipe={...} todayStatus={...} />

    HCC->>Store: init(todaysRecipe, todayStatus)

    Note over Store: status=2 → isCooked=true, sessionDone=true<br/>status=3 → isSkipped=true, sessionDone=true<br/>status=0 → normal, currentRecipe from prop

    Store-->>HCC: state hydrated from SSR ✅

    HCC->>Store: sync() [background, non-blocking]
    Note over Store: Reconciles silently<br/>Protects any optimistic writes
```

---

## Client vs Server Domain Boundary

| Concern | Owner | Notes |
|---------|-------|-------|
| Today's recipe | `todayStore` (client) | Optimistic-first; server is the authority after sync |
| Today's status (0/2/3) | `todayStore` (client) | Seeded from SSR; server is always authoritative for 2/3 |
| GOTO recipe readiness | `HomeCommandCenter` (local state) | Polled from `GET /api/recipes/{id}/status`; not in todayStore |
| Week schedule (planner) | Planner page (local state) | todayStore only owns today's slot |
| Family settings | `familyStore` (Zustand) | Unchanged |
| Voting / lock state | `plannerStore` (Zustand) | Unchanged |
| SSR cache | Next.js / `serverFetch` | Initial page load only; not in critical path after mount |

---

## What Changed vs Previous Architecture

| Before | After |
|--------|-------|
| `HomeCommandCenter` had 6+ `useState` for today's state | `HomeCommandCenter` reads from `todayStore` |
| `router.refresh()` in every action handler (300–800ms lag) | `router.refresh()` removed from critical path |
| `syncRecipe()` could override optimistic state (Bug 1) | `sync()` protects writes < 10s old |
| Planner and home page had no shared state | Both read/write `todayStore` |
| `isSkipped`/`sessionDone` reset on reload (Bug 5) | `todayStatus` prop seeds store from SSR |
| `isScheduleRecipe()` passed `{ id: null }` (Bug 2) | Guard requires non-empty string `id` |
