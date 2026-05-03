# Design — Live Schedule (Server-Sent Events Push Model)

## Authority order

`specs/openapi.yaml` → this design → tests → implementation

---

## 1. System overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Alex)                  Browser (Jordan)               │
│                                                                  │
│  ┌──────────────┐                ┌──────────────┐               │
│  │ /planner     │                │ /home        │               │
│  │ weekStore    │                │ todayStore   │               │
│  └──────┬───────┘                └──────┬───────┘               │
│         │ subscribe                     │ subscribe             │
│  ┌──────▼───────────────────────────────▼───────┐               │
│  │           useScheduleStream (layout)          │               │
│  │           EventSource → /api/stream           │               │
│  └──────────────────────┬────────────────────────┘               │
│                         │ SSE events                             │
└─────────────────────────┼───────────────────────────────────────┘
                          │ persistent HTTP connection
┌─────────────────────────▼───────────────────────────────────────┐
│  .NET API                                                        │
│                                                                  │
│  ScheduleController ──► ScheduleService ──► CalendarEvent DB    │
│                                    │                             │
│                                    ▼                             │
│                         IScheduleEventPublisher                  │
│                                    │                             │
│                                    ▼                             │
│                         SseConnectionManager                     │
│                         (in-memory, per-process)                 │
│                                    │                             │
│                                    ▼                             │
│                         StreamController.Stream()                │
│                         GET /api/stream                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend design

### 2.1 IScheduleEventPublisher

A scoped service interface injected into `ScheduleService`, `DiscoveryService`, and `RecipeReadyProcessor`. After each write, the service calls the publisher.

```csharp
public interface IScheduleEventPublisher
{
    Task PublishSlotUpdatedAsync(DateOnly date, ScheduleRecipeDto? recipe, int status);
    Task PublishWeekUpdatedAsync(ScheduleDays schedule);
    Task PublishVoteUpdatedAsync(Guid recipeId, int voteCount);
    Task PublishSmartDefaultsUpdatedAsync(int weekOffset, SmartDefaultsDto defaults);
    Task PublishFillTheGapInvalidatedAsync(int weekOffset);
    Task PublishRecipeReadyAsync(Guid recipeId);
}
```

### 2.2 SseConnectionManager

A singleton that holds open response streams for all connected clients. When a publisher method is called, it serialises the event and writes it to all active streams.

```csharp
public class SseConnectionManager
{
    private readonly ConcurrentDictionary<string, HttpResponse> _connections = new();

    public string AddConnection(HttpResponse response)
    {
        var id = Guid.NewGuid().ToString();
        _connections[id] = response;
        return id;
    }

    public void RemoveConnection(string id) => _connections.TryRemove(id, out _);

    public async Task BroadcastAsync(string eventType, object payload)
    {
        var data = JsonSerializer.Serialize(payload);
        var message = $"event: {eventType}\ndata: {data}\n\n";
        var bytes = Encoding.UTF8.GetBytes(message);

        foreach (var (id, response) in _connections)
        {
            try
            {
                await response.Body.WriteAsync(bytes);
                await response.Body.FlushAsync();
            }
            catch
            {
                // Client disconnected — remove on next cleanup
                _connections.TryRemove(id, out _);
            }
        }
    }
}
```

### 2.3 StreamController

A new controller that handles the SSE connection lifecycle.

```csharp
[ApiController]
[Route("api/stream")]
public class StreamController : ControllerBase
{
    private readonly SseConnectionManager _manager;
    private readonly ScheduleService _scheduleService;

    [HttpGet]
    public async Task Stream(CancellationToken cancellationToken)
    {
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        var connectionId = _manager.AddConnection(Response);

        try
        {
            // Send connected event with current schedule snapshot
            var schedule = await _scheduleService.GetScheduleAsync(0);
            var connected = JsonSerializer.Serialize(new { type = "connected", schedule });
            await Response.WriteAsync($"event: connected\ndata: {connected}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            // Heartbeat loop — keeps connection alive through proxies
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            while (!cancellationToken.IsCancellationRequested)
            {
                await timer.WaitForNextTickAsync(cancellationToken);
                await Response.WriteAsync(": ping\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — normal
        }
        finally
        {
            _manager.RemoveConnection(connectionId);
        }
    }
}
```

### 2.4 ScheduleService integration

After each mutation, call the publisher. Example for `AssignRecipeAsync`:

```csharp
public async Task AssignRecipeAsync(AssignScheduleDto dto)
{
    // ... existing write logic ...
    await _dbContext.SaveChangesAsync();

    // Publish push event
    var recipe = await BuildScheduleRecipeDtoAsync(date);
    await _publisher.PublishSlotUpdatedAsync(date, recipe, (int)CalendarEventStatus.Planned);
}
```

For mutations that affect the whole week (lock, voting open, move), publish `week_updated` with a fresh `GetScheduleAsync(weekOffset)` snapshot.

### 2.5 Smart defaults threshold crossing

When a vote causes a recipe to cross (or drop below) the consensus threshold, publish `smart_defaults_updated`. This is checked inside `ScheduleService.RecordVoteAsync()` after saving:

```csharp
public async Task RecordVoteAsync(Guid recipeId, VoteType vote, Guid familyMemberId)
{
    // ... existing vote logic ...
    await _dbContext.SaveChangesAsync();

    // Publish live vote count
    var voteCount = await _dbContext.RecipeVotes.CountAsync(v => v.RecipeId == recipeId && v.Vote == VoteType.Like);
    await _publisher.PublishVoteUpdatedAsync(recipeId, voteCount);

    // Check if threshold was crossed — if so, push updated smart defaults
    var familySize = await _dbContext.FamilyMembers.CountAsync();
    var threshold = (int)Math.Ceiling((familySize + 1.0) / 2);
    if (voteCount == threshold || voteCount == threshold - 1)
    {
        // Threshold just crossed in either direction — recompute and push
        var defaults = await GetSmartDefaultsAsync(0);
        await _publisher.PublishSmartDefaultsUpdatedAsync(0, defaults);
    }
}
```

### 2.6 Fill-the-gap invalidation

When a recipe is assigned to a slot (via `AssignRecipeAsync`), it must be removed from every open Quick Find list. The backend publishes `fill_the_gap_invalidated` after any slot assignment or removal:

```csharp
public async Task AssignRecipeAsync(AssignScheduleDto dto)
{
    // ... existing write logic ...
    await _dbContext.SaveChangesAsync();

    // Publish slot update
    var recipe = await BuildScheduleRecipeDtoAsync(date);
    await _publisher.PublishSlotUpdatedAsync(date, recipe, (int)CalendarEventStatus.Planned);

    // Invalidate fill-the-gap cache for this week — recipe is now assigned
    await _publisher.PublishFillTheGapInvalidatedAsync(dto.WeekOffset);
}
```

`RemoveRecipeAsync` also publishes `fill_the_gap_invalidated` — when a recipe is removed from a slot, it becomes available again and the Quick Find list should refresh.

### 2.7 Service registration

```csharp
// Program.cs
builder.Services.AddSingleton<SseConnectionManager>();
builder.Services.AddScoped<IScheduleEventPublisher, SseEventPublisher>();
```

`SseEventPublisher` is a scoped wrapper that resolves the singleton `SseConnectionManager` and calls `BroadcastAsync`.

---

## 3. Frontend design

### 3.1 useScheduleStream hook

A singleton hook mounted once at the root layout (`pwa/src/app/layout.tsx` or a dedicated `Providers` component). It establishes the `EventSource` connection and dispatches events to the appropriate stores.

```typescript
// pwa/src/hooks/useScheduleStream.ts

export function useScheduleStream() {
  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/stream`;
    const source = new EventSource(url, { withCredentials: true });

    source.addEventListener('connected', (e) => {
      const { schedule } = JSON.parse(e.data);
      // On connect or reconnect, the server snapshot is authoritative.
      // Clear any stale optimistic guards before applying — a reconnect after
      // a network gap means the server state is ground truth regardless of
      // how recent any local optimistic write was.
      useTodayStore.getState().clearOptimisticGuard();
      // Seed weekStore with authoritative snapshot on connect
      useWeekStore.getState().applySnapshot(schedule);
    });

    source.addEventListener('slot_updated', (e) => {
      const { date, recipe, status } = JSON.parse(e.data);
      const today = getTodayString();

      // Update todayStore if this is today's slot
      if (date === today) {
        useTodayStore.getState().applyServerUpdate({ recipe, status });
      }

      // Update weekStore if this date is in the current week
      useWeekStore.getState().applySlotUpdate({ date, recipe, status });
    });

    source.addEventListener('week_updated', (e) => {
      const { schedule } = JSON.parse(e.data);
      useWeekStore.getState().applySnapshot(schedule);
    });

    source.addEventListener('vote_updated', (e) => {
      const { recipeId, voteCount } = JSON.parse(e.data);
      useWeekStore.getState().applyVoteUpdate({ recipeId, voteCount });
    });

    source.addEventListener('smart_defaults_updated', (e) => {
      const { defaults } = JSON.parse(e.data);
      // Merge updated pre-selected recipes into the schedule.
      // Only affects slots that don't already have a confirmed (non-pending) recipe.
      useWeekStore.getState().applySmartDefaultsUpdate(defaults);
    });

    source.addEventListener('fill_the_gap_invalidated', (e) => {
      const { weekOffset } = JSON.parse(e.data);
      // Notify any open QuickFindModal to refetch its recipe list.
      // The modal subscribes to a lightweight invalidation signal in discoveryStore.
      useDiscoveryStore.getState().invalidateFillTheGap(weekOffset);
    });

    source.addEventListener('recipe_ready', (e) => {
      const { recipeId } = JSON.parse(e.data);
      // Notify GOTO polling — HomeCommandCenter subscribes to this
      useGotoStore.getState().markReady(recipeId);
    });

    source.onerror = () => {
      // EventSource reconnects automatically — no manual handling needed
    };

    return () => source.close();
  }, []);
}
```

### 3.2 todayStore changes

Add `applyServerUpdate()`, `clearOptimisticGuard()`, and `skipCookedCelebration` flag:

```typescript
// New state field:
skipCookedCelebration: false,

applyServerUpdate({ recipe, status }: { recipe: ScheduleRecipeDto | null; status: number }) {
  // Server push is authoritative — always apply, even if optimistic write is recent.
  // Exception: if optimisticWriteAt is within 2 seconds, the push may be echoing
  // our own write back to us — skip to avoid flicker.
  const { optimisticWriteAt } = get();
  const isEcho = optimisticWriteAt !== null && Date.now() - optimisticWriteAt < 2_000;
  if (isEcho) return;

  set({
    currentRecipe: recipe,
    status: status as 0 | 2 | 3,
    optimisticWriteAt: null, // clear optimistic guard — server is now authoritative
    // For status:2 pushed from another family member's Cook's Mode completion,
    // skip the CookedSuccessCard celebration — show compact badge directly.
    // The person who cooked sees the card optimistically before this echo arrives.
    skipCookedCelebration: status === 2,
  });
},

clearOptimisticGuard() {
  // Called on SSE reconnect — server snapshot is authoritative regardless of age.
  set({ optimisticWriteAt: null });
},
```

`HomeCommandCenter` reads `skipCookedCelebration` from the store and initialises `cookedDismissed` to `true` when it's set, so the compact badge renders immediately for family members who didn't do the cooking.

### 3.3 weekStore changes

Add `applySnapshot()` and `applySlotUpdate()`:

```typescript
applySnapshot(schedule: ScheduleDays) {
  const mergedDays = buildScheduleDays(schedule);
  set({
    schedule: mergedDays,
    status: (schedule.status ?? 0) as 0 | 1 | 2,
    lastSyncedAt: Date.now(),
    optimisticWriteAt: null,
  });
},

applySlotUpdate({ date, recipe, status }: { date: string; recipe: any; status: number }) {
  const prev = get().schedule;
  // Only apply if this date is within the currently-loaded week.
  // If the date is outside the current week, it will be fetched fresh on next init().
  const inCurrentWeek = prev.some((d) => d.date === date);
  if (!inCurrentWeek) return;
  const next = prev.map((d) =>
    d.date === date
      ? { ...d, recipe: recipe ?? undefined, status }
      : d
  );
  set({ schedule: next });
},

applyVoteUpdate({ recipeId, voteCount }: { recipeId: string; voteCount: number }) {
  const prev = get().schedule;
  const next = prev.map((d) =>
    d.recipe?.id === recipeId
      ? { ...d, recipe: { ...d.recipe, voteCount } }
      : d
  );
  set({ schedule: next });
},

applySmartDefaultsUpdate(defaults: SmartDefaultsDto) {
  // Only update slots that are still pending (no confirmed recipe assigned by a user).
  // Confirmed slots (_isPending === false and recipe present) are left untouched.
  const prev = get().schedule;
  const defaultsByDayIndex = new Map(
    defaults.preSelectedRecipes?.map((r) => [r.dayIndex, r]) ?? []
  );

  const next = prev.map((d, index) => {
    // Never overwrite a user-confirmed slot
    if (d.recipe && !d._isPending) return d;

    const smartDefault = defaultsByDayIndex.get(index);
    if (smartDefault) {
      return {
        ...d,
        recipe: {
          id: smartDefault.recipeId ?? '',
          name: smartDefault.name ?? '',
          image: smartDefault.heroImageUrl ?? '',
          voteCount: smartDefault.voteCount ?? 0,
        },
        _isPending: true,
        _voteCount: smartDefault.voteCount,
        _unanimousVote: smartDefault.unanimousVote,
        _isLocked: smartDefault.isLocked,
      };
    }

    // Recipe dropped below threshold — clear the pending slot
    if (d._isPending) {
      return { ...d, recipe: undefined, _isPending: false, _voteCount: null, _unanimousVote: null };
    }

    return d;
  });

  set({ schedule: next });
},
```

### 3.4 discoveryStore — fill-the-gap invalidation signal

`QuickFindModal` currently fetches `fill-the-gap` once on open. With SSE, it needs to refetch when the assigned recipes change. Rather than coupling the modal directly to the SSE hook, a lightweight invalidation counter in `discoveryStore` acts as the signal:

```typescript
// In discoveryStore — add:
fillTheGapVersion: 0,
invalidateFillTheGap(weekOffset: number) {
  // Increment version — QuickFindModal watches this and refetches when it changes
  set((s) => ({ fillTheGapVersion: s.fillTheGapVersion + 1 }));
},
```

`QuickFindModal` adds a `useEffect` that watches `fillTheGapVersion`:

```typescript
const fillTheGapVersion = useDiscoveryStore((s) => s.fillTheGapVersion);

useEffect(() => {
  // Refetch when another client assigns a recipe (version incremented by SSE)
  fetchSuggestions();
}, [fillTheGapVersion]);
```

This means: Alex opens Quick Find → sees 5 recipes → Jordan assigns Lasagna from their device → SSE fires `fill_the_gap_invalidated` → Alex's Quick Find silently refetches → Lasagna disappears from the list.

### 3.5 Layout mounting

```typescript
// pwa/src/app/(app)/layout.tsx
'use client';

import { useScheduleStream } from '@/hooks/useScheduleStream';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useScheduleStream(); // mounted once, survives page navigation
  return <>{children}</>;
}
```

This is the key architectural change. The hook lives at the layout level, not inside individual page components. When the user navigates from `/planner` to `/home`, the `EventSource` connection stays open. The stores are already populated. The home page renders immediately with current state.

### 3.6 todayStore layout mounting

`todayStore` must also be initialised at the layout level, not inside `HomeCommandCenter`. A `TodayStoreInitializer` component handles this:

```typescript
// pwa/src/components/TodayStoreInitializer.tsx
'use client';

import { useEffect } from 'react';
import { useTodayStore } from '@/store/todayStore';

export function TodayStoreInitializer({
  todaysRecipe,
  todayStatus,
}: {
  todaysRecipe: any;
  todayStatus: 0 | 2 | 3;
}) {
  useEffect(() => {
    useTodayStore.getState().init(todaysRecipe, todayStatus);
  }, []); // only on mount — SSE keeps it current after that
  return null;
}
```

This is rendered in the home page's server component, passing SSR props down. After the initial `init()`, the SSE stream takes over.

---

## 4. Data flow diagrams

### 4.1 Assign recipe (happy path with SSE)

```
User clicks Quick Find → selects recipe
  │
  ▼
weekStore.assignRecipe(dayIndex, recipe)        [optimistic write]
  │  sets optimisticWriteAt = now
  │  updates schedule[dayIndex].recipe
  │
  ▼
assignRecipeToDay(weekOffset, dayIndex, recipe) [REST POST]
  │
  ▼
.NET API: AssignRecipeAsync()
  │  writes CalendarEvent to DB
  │
  ▼
IScheduleEventPublisher.PublishSlotUpdatedAsync(date, recipe, status)
  │
  ▼
SseConnectionManager.BroadcastAsync("slot_updated", { date, recipe, status })
  │
  ▼ (all connected browsers receive this)
useScheduleStream: slot_updated handler
  │
  ├─► todayStore.applyServerUpdate() if date === today
  │     sets currentRecipe, clears optimisticWriteAt
  │
  └─► weekStore.applySlotUpdate() if date in current week
        updates schedule[date].recipe
```

### 4.2 Order In — pushed to all family members

```
Alex taps "Order In" (no recipe planned)
  │
  ▼
todayStore.markOrderedIn()                     [optimistic — home hides pivot card immediately]
  │  sets status = 3, currentRecipe = null
  │  sets optimisticWriteAt = now
  │
  ▼
POST /api/schedule/day/{today}/validate { status: 3 }
  │
  ▼
.NET API: ValidateDayAsync(today, status=3)
  │  creates CalendarEvent { RecipeId: Guid.Empty, Status: Skipped }
  │
  ▼
IScheduleEventPublisher.PublishSlotUpdatedAsync(today, recipe: null, status: 3)
  │
  ▼ (all connected browsers receive this)
useScheduleStream: slot_updated handler
  │
  ├─► todayStore.applyServerUpdate({ recipe: null, status: 3 })
  │     Jordan's /home: pivot card hides, "Ordered In" state shown
  │     (HomeCommandCenter renders isSkipped=true → no pivot card, no menu card)
  │
  └─► weekStore.applySlotUpdate({ date: today, recipe: null, status: 3 })
        Jordan's /planner: today's card shows 🥡 ordered-in-indicator
        Alex's /planner: same (echo suppressed for Alex via optimisticWriteAt guard)
```

**Rendering contract for `status: 3, recipe: null`:**

| Surface | Component | Renders |
|---|---|---|
| `/home` | `HomeCommandCenter` | `isSkipped = true` → neither pivot card nor menu card |
| `/planner` | `PlannerDayCard` | `ordered-in-indicator` (🥡 Ordered In) |
| Any other family member's `/home` | Same | Same — pushed via SSE |

---

### 4.3 GOTO confirmed ("Make This Tonight") — pushed to all family members

```
Alex taps "Make This Tonight"
  │
  ▼
todayStore.assignRecipe({ id, name, image })    [optimistic — home shows TonightMenuCard immediately]
  │  sets currentRecipe = { id, name, image }
  │  sets optimisticWriteAt = now
  │
  ▼
POST /api/schedule/assign { recipeId, dayIndex: today, weekOffset: 0 }
  │
  ▼
.NET API: AssignRecipeAsync()
  │  upserts CalendarEvent { RecipeId: gotoRecipeId, Status: Planned }
  │
  ▼
IScheduleEventPublisher.PublishSlotUpdatedAsync(today, recipe: { id, name, image, totalTime }, status: 0)
IScheduleEventPublisher.PublishFillTheGapInvalidatedAsync(weekOffset: 0)
  │
  ▼ (all connected browsers receive slot_updated)
useScheduleStream: slot_updated handler
  │
  ├─► todayStore.applyServerUpdate({ recipe: { id, name, image, totalTime }, status: 0 })
  │     Jordan's /home: pivot card → TonightMenuCard with GOTO recipe
  │     (recipe name, image, and real prep time all present from ScheduleRecipeDto)
  │
  └─► weekStore.applySlotUpdate({ date: today, recipe, status: 0 })
        Jordan's /planner: today's card shows recipe name + image
        Alex's /planner: same (echo suppressed)

  ▼ (all connected browsers receive fill_the_gap_invalidated)
useScheduleStream: fill_the_gap_invalidated handler
  │
  └─► discoveryStore.invalidateFillTheGap(0)
        Any open QuickFindModal refetches — GOTO recipe no longer appears in the list
```

**Rendering contract for `status: 0, recipe: { id, name, image, totalTime }`:**

| Surface | Component | Renders |
|---|---|---|
| `/home` | `HomeCommandCenter` | `TonightMenuCard` with recipe name, image, real prep time |
| `/planner` | `PlannerDayCard` | Recipe name + image, cook mode button if today |
| Any other family member's `/home` | Same | Same — pushed via SSE |

---

### 4.4 Cook's Mode completed — pushed to all family members

```
Alex completes Cook's Mode (steps through all steps, taps "Done")
  │
  ▼
todayStore.markCooked()                        [optimistic — Alex sees CookedSuccessCard immediately]
  │  sets status = 2
  │  sets optimisticWriteAt = now
  │
  ▼
POST /api/schedule/day/{today}/validate { status: 2 }
  │
  ▼
.NET API: ValidateDayAsync(today, status=2)
  │  sets CalendarEvent.Status = Cooked
  │  sets Recipe.LastCookedDate = now
  │
  ▼
IScheduleEventPublisher.PublishSlotUpdatedAsync(today, recipe, status: 2)
  │
  ▼ (all connected browsers receive this)
useScheduleStream: slot_updated handler
  │
  ├─► todayStore.applyServerUpdate({ recipe, status: 2 })
  │     Alex: echo suppressed (optimisticWriteAt within 2s) — CookedSuccessCard stays
  │     Jordan: skipCookedCelebration = true → compact cooked badge renders directly
  │     (no CookedSuccessCard for Jordan — Alex cooked, not Jordan)
  │
  └─► weekStore.applySlotUpdate({ date: today, recipe, status: 2 })
        Planner: today's card reflects cooked state, cook mode button hidden
```

**Rendering contract for `status: 2` (Cooked):**

| Surface | Who | Component | Renders |
|---|---|---|---|
| `/home` | Person who cooked | `HomeCommandCenter` | `CookedSuccessCard` → compact badge on dismiss |
| `/home` | Everyone else | `HomeCommandCenter` | Compact cooked badge directly (no celebration card) |
| `/planner` | All | `PlannerDayCard` | Cooked state, no cook mode button |

---

### 4.5 Recipe dropped from plan — slot cleared for all family members

```
Alex opens recovery dialog → taps "Drop" (remove from week plan)
  │
  ▼
DELETE /api/schedule/day/{date}/remove
  │
  ▼
.NET API: RemoveRecipeAsync(date)
  │  deletes CalendarEvent — recipe returns to discoverable pool
  │
  ▼
IScheduleEventPublisher.PublishSlotUpdatedAsync(date, recipe: null, status: 0)
IScheduleEventPublisher.PublishFillTheGapInvalidatedAsync(weekOffset: 0)
  │
  ▼ (all connected browsers receive slot_updated)
useScheduleStream: slot_updated handler
  │
  ├─► todayStore.applyServerUpdate({ recipe: null, status: 0 })
  │     Jordan's /home: TonightMenuCard → TonightPivotCard (slot empty again)
  │
  └─► weekStore.applySlotUpdate({ date, recipe: null, status: 0 })
        Planner: day card shows "Plan a meal" button

  ▼ (all connected browsers receive fill_the_gap_invalidated)
  └─► discoveryStore.invalidateFillTheGap(0)
        Any open QuickFindModal refetches — dropped recipe reappears in the list
```

---

### 4.6 Voting opened — pushed to all family members

```
Mom taps "Ask the Family" on the planner
  │
  ▼
POST /api/schedule/voting/open?weekOffset=0
  │
  ▼
.NET API: OpenVotingAsync(0)
  │  sets WeeklyPlan.Status = VotingOpen (1)
  │
  ▼
IScheduleEventPublisher.PublishWeekUpdatedAsync(schedule)
  │  schedule.status = 1 (VotingOpen)
  │
  ▼ (all connected browsers receive week_updated)
useScheduleStream: week_updated handler
  │
  ├─► weekStore.applySnapshot(schedule)
  │     status = 1 → isVotingOpen = true
  │     planner: voting-status-badge appears, ask-family-cta hides
  │
  └─► todayStore reads weekStore.status (or receives status via event)
        home: VotingNudgeCard appears
        home: discover-btn begins pulsing (isVotingOpen = true)
```

**Rendering contract for `week.status = 1` (VotingOpen):**

| Surface | Component | Renders |
|---|---|---|
| `/home` | `HomeCommandCenter` | `VotingNudgeCard` visible |
| `/home` | `TonightPivotCard` discover-btn | Pulsing animation active |
| `/planner` | Header | `voting-status-badge` visible, close-voting-btn visible |
| `/planner` | `PlannerDayCard` | Vote count badges visible |
| All family members | Same | Same — pushed via SSE |

**`VotingNudgeCard` trigger:** `HomeCommandCenter` currently fetches next-week status on mount via a one-time `useEffect`. With SSE, this is replaced by subscribing to `weekStore.status`. When `status === 1`, the nudge card renders. No polling needed.

**Discover button pulse:** `TonightPivotCard` receives `isVotingOpen` as a prop from `HomeCommandCenter`. When true, the discover-btn gets a pulse ring:

```tsx
<button
  data-testid="discover-btn"
  className={cn(
    'relative flex items-center justify-center h-12 rounded-[1.5rem] ...',
  )}
>
  {isVotingOpen && (
    <span className="absolute inset-0 rounded-[1.5rem] animate-ping bg-indigo/20 pointer-events-none" />
  )}
  Quick Find
</button>
```

---

### 4.7 Voting closed — pushed to all family members

```
Mom taps "Close Voting" on the planner
  │
  ▼
POST /api/schedule/lock?weekOffset=0
  │
  ▼
.NET API: LockScheduleAsync(0)
  │  sets WeeklyPlan.Status = Locked (2)
  │  purges all votes (Global Purge #1)
  │
  ▼
IScheduleEventPublisher.PublishWeekUpdatedAsync(schedule)
  │  schedule.status = 2 (Locked)
  │  schedule.locked = true
  │  all days have status = Locked (1)
  │
  ▼ (all connected browsers receive week_updated)
useScheduleStream: week_updated handler
  │
  ├─► weekStore.applySnapshot(schedule)
  │     status = 2 → isLocked = true, isVotingOpen = false
  │     planner: voting-status-badge hides, finalized-status appears
  │     planner: vote count badges hide (votes purged)
  │
  └─► home: VotingNudgeCard disappears
        home: discover-btn pulse stops
```

**Rendering contract for `week.status = 2` (Locked):**

| Surface | Component | Renders |
|---|---|---|
| `/home` | `HomeCommandCenter` | `VotingNudgeCard` hidden |
| `/home` | `TonightPivotCard` discover-btn | No pulse |
| `/planner` | Header | `finalized-status` ("Menu's In!") visible |
| `/planner` | `PlannerDayCard` | Cook mode button visible on today's card |
| All family members | Same | Same — pushed via SSE |

---

### 4.8 Navigation: planner → home (with SSE)

```
User navigates /planner → /home
  │
  ▼
AppLayout stays mounted (useScheduleStream still connected)
  │
  ▼
/home Server Component renders
  │  SSR fetches real backend (may be stale or fresh)
  │  passes todaysRecipe prop to HomeCommandCenter
  │
  ▼
TodayStoreInitializer.init(ssrRecipe, ssrStatus)
  │  if optimisticWriteAt is recent → skip (SSE already updated store)
  │  if not recent → seed from SSR props
  │
  ▼
HomeCommandCenter subscribes to todayStore
  │  currentRecipe is already set (from SSE event received before navigation)
  │
  ▼
TonightMenuCard renders immediately ✓
```

---

## 5. OpenAPI contract additions

Add to `specs/openapi.yaml`:

```yaml
# In components/schemas:
ScheduleStreamEvent:
  type: object
  required: [type]
  properties:
    type:
      type: string
      enum: [connected, slot_updated, week_updated, vote_updated, smart_defaults_updated, fill_the_gap_invalidated, recipe_ready]

SlotUpdatedEvent:
  type: object
  required: [type, date, status]
  description: >
    Fired after any slot mutation: assign, validate (order-in, cooked, skipped), remove.
    recipe is null when status is 3 (ordered-in with no recipe) or when the slot is cleared.
    Clients use status to determine rendering: 0=planned, 2=cooked, 3=ordered-in.
  properties:
    type: { type: string, enum: [slot_updated] }
    date: { type: string, format: date }
    recipe:
      oneOf:
        - $ref: '#/components/schemas/ScheduleRecipeDto'
        - type: 'null'
    status: { type: integer, description: '0: Planned, 2: Cooked, 3: Skipped/OrderedIn' }

WeekUpdatedEvent:
  type: object
  required: [type, schedule]
  description: Fired after week-level mutations (lock, voting open, move). Full snapshot.
  properties:
    type: { type: string, enum: [week_updated] }
    schedule: { $ref: '#/components/schemas/ScheduleDays' }

VoteUpdatedEvent:
  type: object
  required: [type, recipeId, voteCount]
  description: Fired after every vote. Clients update the vote count badge on the planner card.
  properties:
    type: { type: string, enum: [vote_updated] }
    recipeId: { type: string, format: uuid }
    voteCount: { type: integer }

SmartDefaultsUpdatedEvent:
  type: object
  required: [type, weekOffset, defaults]
  description: >
    Fired when a vote causes a recipe to cross (or drop below) the consensus threshold.
    Clients merge the new pre-selected recipes into pending planner slots.
  properties:
    type: { type: string, enum: [smart_defaults_updated] }
    weekOffset: { type: integer }
    defaults: { $ref: '#/components/schemas/SmartDefaultsDto' }

FillTheGapInvalidatedEvent:
  type: object
  required: [type, weekOffset]
  description: >
    Fired after any slot assignment or removal. Signals open QuickFindModal instances
    to refetch their recipe list so newly-assigned recipes are excluded.
  properties:
    type: { type: string, enum: [fill_the_gap_invalidated] }
    weekOffset: { type: integer }

RecipeReadyEvent:
  type: object
  required: [type, recipeId]
  description: Fired when GOTO synthesis completes. Replaces the polling loop in HomeCommandCenter.
  properties:
    type: { type: string, enum: [recipe_ready] }
    recipeId: { type: string, format: uuid }

# In paths:
/api/stream:
  get:
    summary: Server-Sent Events stream for real-time schedule updates
    description: >
      Establishes a persistent SSE connection. On connect, sends a 'connected'
      event with the current ScheduleDays snapshot for weekOffset=0. Subsequently
      pushes events for all schedule mutations. Heartbeat comments (': ping')
      sent every 15 seconds to prevent proxy timeouts. Connect directly from
      the browser using NEXT_PUBLIC_API_BASE_URL — do not proxy through /backend.
      Requires X-Family-Member-Id header for auth.
    security: [{ FamilyMemberId: [] }]
    responses:
      '200':
        description: SSE stream (text/event-stream)
        content:
          text/event-stream:
            schema:
              type: string
              description: >
                Stream of SSE events. Each event has an 'event' field (event type)
                and a 'data' field (JSON payload). Event types: connected,
                slot_updated, week_updated, vote_updated, smart_defaults_updated,
                fill_the_gap_invalidated, recipe_ready.
```
    recipeId: { type: string, format: uuid }

# In paths:
/api/stream:
  get:
    summary: Server-Sent Events stream for real-time schedule updates
    description: >
      Establishes a persistent SSE connection. On connect, sends a 'connected'
      event with the current ScheduleDays snapshot for weekOffset=0. Subsequently
      pushes events for all schedule mutations. Heartbeat comments (': ping')
      sent every 15 seconds to prevent proxy timeouts. Connect directly from
      the browser — do not proxy through /backend.
    security: [{ FamilyMemberId: [] }]
    responses:
      '200':
        description: SSE stream (text/event-stream)
        content:
          text/event-stream:
            schema:
              type: string
              description: >
                Stream of SSE events. Each event has an 'event' field (event type)
                and a 'data' field (JSON payload). See ScheduleStreamEvent schemas.
```

---

## 6. Mock API additions

`pwa/e2e/mock-api.ts` — add to `setupCommonRoutes()`:

```typescript
// SSE stream — default mock returns connected event with empty schedule then stays open.
// Individual tests override this route to emit specific push events.
await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
  const emptySchedule = {
    weekOffset: 0, locked: false, status: 0,
    days: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday());
      d.setUTCDate(d.getUTCDate() + i);
      return {
        day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
        date: toDateStr(d),
        recipe: null,
        status: 0,
      };
    }),
  };
  await route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    headers: {
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
    body: `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: emptySchedule })}\n\n`,
  });
});
```

**Test helpers for push events — export from `mock-api.ts`:**

```typescript
/** Mocks the SSE stream to emit a connected event followed by a slot_updated event.
 *  Use this to test cross-page state propagation without relying on sync() timing. */
export async function mockSseWithSlotUpdate(
  page: Page,
  slotUpdate: { date: string; recipe: ScheduleRecipeDto | null; status: number }
) {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    const connected = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { weekOffset: 0, locked: false, status: 0, days: [] } })}\n\n`;
    const update = `event: slot_updated\ndata: ${JSON.stringify({ type: 'slot_updated', ...slotUpdate })}\n\n`;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
      body: connected + update,
    });
  });
}

/** Mocks the SSE stream to emit a slot_updated with status:3 (Order In, no recipe).
 *  Simulates Alex tapping "Order In" — all family members see the ordered-in state. */
export async function mockSseWithOrderIn(page: Page, date: string) {
  await mockSseWithSlotUpdate(page, { date, recipe: null, status: 3 });
}

/** Mocks the SSE stream to emit a fill_the_gap_invalidated event.
 *  Use this to test that open QuickFindModal instances refetch after an assignment. */
export async function mockSseWithFillTheGapInvalidated(page: Page, weekOffset = 0) {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    const connected = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { weekOffset: 0, locked: false, status: 0, days: [] } })}\n\n`;
    const invalidated = `event: fill_the_gap_invalidated\ndata: ${JSON.stringify({ type: 'fill_the_gap_invalidated', weekOffset })}\n\n`;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
      body: connected + invalidated,
    });
  });
}

/** Mocks the SSE stream to emit a smart_defaults_updated event.
 *  Use this to test that pending planner slots update when votes cross the threshold. */
export async function mockSseWithSmartDefaultsUpdated(
  page: Page,
  defaults: SmartDefaultsDto
) {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    const connected = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { weekOffset: 0, locked: false, status: 0, days: [] } })}\n\n`;
    const update = `event: smart_defaults_updated\ndata: ${JSON.stringify({ type: 'smart_defaults_updated', weekOffset: 0, defaults })}\n\n`;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
      body: connected + update,
    });
  });
}
```

**How the skipped test becomes trivial with SSE:**

```typescript
// Re-enabled once SSE is implemented:
test("Planner Quick Find for today's slot → navigating to home shows TonightMenuCard", async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];

  // SSE pushes slot_updated after assign — home page updates without sync() race
  await mockSseWithSlotUpdate(page, {
    date: today,
    recipe: { id: MOCK_IDS.RECIPE_LASAGNA, name: 'Test Lasagna', image: '' },
    status: 0,
  });

  // Navigate to planner, assign via Quick Find, navigate to home
  // TonightMenuCard appears because SSE event was received before navigation
  // No dependency on sync() timing or SSR
});
```

---

## 7. Traefik configuration

`docker/compose/traefik_dynamic.yml` — add SSE middleware:

```yaml
http:
  middlewares:
    sse-headers:
      headers:
        customResponseHeaders:
          X-Accel-Buffering: "no"
          Cache-Control: "no-cache"

  routers:
    api-stream:
      rule: "Host(`api.wfs.localhost`) && Path(`/api/stream`)"
      entryPoints: [web]
      middlewares: [sse-headers]
      service: api
```

---

## 8. Testing strategy

### Backend (dotnet test)

- `StreamController` integration test: connect, receive `connected` event, verify schedule snapshot
- `SseConnectionManager` unit test: broadcast to multiple connections, verify all receive
- `ScheduleService` integration test: assign recipe → verify `slot_updated` event published
- `ScheduleService` integration test: validate day → verify `slot_updated` event published

### Frontend (Playwright E2E)

- `useScheduleStream` unit test (Vitest): mock `EventSource`, verify store updates on each event type
- E2E: SSE `slot_updated` → `TonightMenuCard` appears on home without navigation
- E2E: SSE `slot_updated` → planner day card updates without poll
- E2E: SSE `week_updated` → planner reflects locked state
- E2E: SSE `recipe_ready` → GOTO confirm button appears (replaces polling test)
- E2E: Re-enable skipped test `Planner Quick Find for today → home shows TonightMenuCard`

### Property-based correctness properties

1. **Idempotency**: applying the same `slot_updated` event twice produces the same store state as applying it once
2. **Ordering**: a `week_updated` event always supersedes any pending `slot_updated` events for the same week
3. **Echo suppression**: a `slot_updated` event received within 2 seconds of an optimistic write for the same date is ignored
4. **Reconnect consistency**: after reconnect, the `connected` event snapshot matches the state that would have been produced by replaying all missed events

---

## 9. Migration path

This is a non-breaking addition. The existing REST endpoints are unchanged. The existing polling in `useWeekStore` and `HomeCommandCenter` remains as a fallback while SSE is being built. Once SSE is stable and tested, the polling intervals are removed.

The `today-slot-persistence` spec's skipped test is re-enabled as part of this spec's task list.

---

## 10. Known constraints and upgrade paths

### 10.1 Single-process SSE (no horizontal scaling)

`SseConnectionManager` uses an in-memory `ConcurrentDictionary`. All connected clients must be on the same API process instance. For a household deployment (one API container), this is sufficient and correct.

**If horizontal scaling is ever needed:** Replace `SseConnectionManager` with a Redis pub/sub adapter. `SseEventPublisher` publishes to a Redis channel; each API instance subscribes and forwards to its local connections. The `IScheduleEventPublisher` interface is designed to make this swap transparent to `ScheduleService` — no service layer changes required.

### 10.2 SSE auth via cookies only

The browser's native `EventSource` API cannot set custom headers. The `X-Family-Member-Id` header used by all other API endpoints cannot be sent with an SSE connection.

**Solution:** The `/api/stream` endpoint reads auth from cookies exclusively:
- `x-family-member-id` — identifies the family member
- `h_access` — Hearth session token, validates the session

The `EventSource` is created with `withCredentials: true` to ensure cookies are sent cross-origin. Both cookies are set during onboarding and are already present in the browser when the SSE connection is established.

All other REST endpoints continue using the `X-Family-Member-Id` header as before. This is SSE-specific behaviour, not a general auth change.

### 10.3 Reconnect state gap

`EventSource` reconnects automatically after a drop. On reconnect, the `StreamController` sends a fresh `connected` event with the current schedule snapshot. Events that fired during the disconnection window are not replayed — they are superseded by the snapshot.

The `connected` handler clears `optimisticWriteAt` on both `todayStore` and `weekStore` before applying the snapshot, ensuring the server state is applied unconditionally regardless of any pending local optimistic writes.

### 10.4 Next-week slot updates while viewing next week

The `connected` event snapshot covers `weekOffset=0` (current week) only. If a user is viewing next week on the planner and a mutation occurs on a next-week slot, `applySlotUpdate` checks whether the incoming date falls within the currently-loaded week range. If it does, the update is applied live. If it doesn't (e.g. the user is on week 0 and a week 1 slot changes), the update is silently ignored — the correct data will be fetched on `weekStore.init(1)` when the user navigates to next week.
