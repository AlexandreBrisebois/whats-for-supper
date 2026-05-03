# Design Document — planner-voting-ux (Requirements 1–6)

## Scope

This document covers the design for Requirements 1–6 of the `planner-voting-ux` spec:

1. **PlannerDayCard fixed height** — eliminate layout shift from vote badge toggling and recipe name wrapping.
2. **fill-the-gap deduplication** — exclude recipes already in the target week from Quick Find results.
3. **Rotation sort** — apply `LastCookedDate ASC NULLS FIRST, VoteCount DESC` to both recipe pools in `FillTheGapAsync`.
4. **VotingNudgeCard on Home** — session-dismissible card on HomeCommandCenter that surfaces active next-week voting.
5. **weekStore digital twin** — new `pwa/src/store/weekStore.ts` that seeds status from the API and applies optimistic mutations with background reconciliation.
6. **"Ask the Family" CTA availability** — show when `status === 0` and week is not in the past, removing the `plannedCount > 0` gate.

Requirements 1–4 are covered in the sections below. Requirements 5–6 are added at the end of this document.

---

## Requirement 1: PlannerDayCard Fixed Height

### Problem

`PlannerDayCard` currently has no fixed height. Two sources of layout shift exist:

- The vote badge (`<span data-testid="vote-count">`) is conditionally rendered — when it appears or disappears, the card grows or shrinks, causing adjacent cards to reflow.
- The recipe name uses `line-clamp-2`, allowing two-line names to make the card taller than single-line names.

### Solution

Three targeted CSS changes inside the `PlannerDayCard` function in `pwa/src/app/(app)/planner/page.tsx`:

#### 1a. Lock card height

Add `h-[72px]` to the `<motion.div>` inner wrapper (the `flex items-center p-4` div). The `Reorder.Item` outer wrapper uses `overflow-hidden`, so content cannot escape the boundary.

```tsx
// Before
<motion.div whileTap={{ scale: 0.98 }} className="flex items-center p-4 relative z-10">

// After
<motion.div whileTap={{ scale: 0.98 }} className="flex items-center p-4 relative z-10 h-[72px]">
```

#### 1b. Reserve vote badge slot with `visibility: hidden`

Replace the conditional render of the vote badge with an always-present element that uses `visibility: hidden` when there is no vote count. This preserves the DOM slot and prevents height change.

```tsx
// Before — badge only rendered when count exists
{(day._voteCount != null || day.recipe?.voteCount != null) && (() => {
  const count = day._voteCount ?? day.recipe?.voteCount;
  ...
  return <span data-testid="vote-count" ...>{count} voted</span>;
})()}

// After — always rendered, hidden when no count
{(() => {
  const count = day._voteCount ?? day.recipe?.voteCount ?? null;
  const isUnanimous = day._unanimousVote;
  return (
    <span
      data-testid="vote-count"
      style={{ visibility: count != null ? 'visible' : 'hidden' }}
      className={cn(
        'text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap inline-block mt-1',
        isUnanimous ? 'bg-sage/20 text-sage' : 'bg-ochre/20 text-ochre'
      )}
    >
      {count ?? 0} voted
    </span>
  );
})()}
```

#### 1c. Truncate recipe name to one line

Change `line-clamp-2` → `line-clamp-1` on the recipe name `<h4>`.

```tsx
// Before
<h4 className="text-sm font-bold text-charcoal line-clamp-2" data-testid="recipe-name">

// After
<h4 className="text-sm font-bold text-charcoal line-clamp-1" data-testid="recipe-name">
```

### Files Changed

- `pwa/src/app/(app)/planner/page.tsx` — `PlannerDayCard` function only

---

## Requirement 2: fill-the-gap Deduplication

### Problem

`FillTheGapAsync()` in `ScheduleService.cs` has no awareness of which week is being planned. It returns recipes from `RecipeMatches` and `DiscoveryRecipes` without checking whether those recipes are already assigned to `CalendarEvent` rows for the target week. The controller endpoint `GET /api/schedule/fill-the-gap` accepts no `weekOffset` parameter.

### Solution

#### 2a. Service — add `weekOffset` parameter and exclusion query

```csharp
// Before
public async Task<List<ScheduleRecipeDto>> FillTheGapAsync()

// After
public async Task<List<ScheduleRecipeDto>> FillTheGapAsync(int weekOffset = 0)
```

Inside the method, before querying `RecipeMatches`, compute the week bounds and load the set of recipe IDs already assigned to that week:

```csharp
var (monday, sunday) = GetWeekBounds(weekOffset);

var assignedIds = await _dbContext.CalendarEvents
    .Where(e => e.Date >= monday && e.Date <= sunday && e.RecipeId != null)
    .Select(e => e.RecipeId!.Value)
    .ToHashSetAsync();
```

Then filter both pools:

```csharp
// RecipeMatches pool
var results = await _dbContext.RecipeMatches
    .Join(_dbContext.Recipes, m => m.RecipeId, r => r.Id, (m, r) => new { Match = m, Recipe = r })
    .Where(x => !assignedIds.Contains(x.Recipe.Id))   // ← deduplication
    .OrderBy(x => x.Recipe.LastCookedDate == null ? 0 : 1)
    .ThenBy(x => x.Recipe.LastCookedDate)
    .Take(5)
    .ToListAsync();

// DiscoveryRecipes fallback pool
var fallback = await _dbContext.DiscoveryRecipes
    .Where(r => !usedIds.Contains(r.Id) && !assignedIds.Contains(r.Id))  // ← deduplication
    ...
```

#### 2b. Controller — expose `weekOffset` query param

```csharp
// Before
[HttpGet("fill-the-gap")]
public async Task<IActionResult> FillTheGap()
{
    var recipes = await _scheduleService.FillTheGapAsync();
    return Ok(recipes);
}

// After
[HttpGet("fill-the-gap")]
public async Task<IActionResult> FillTheGap([FromQuery] int weekOffset = 0)
{
    var recipes = await _scheduleService.FillTheGapAsync(weekOffset);
    return Ok(recipes);
}
```

#### 2c. OpenAPI contract — add `weekOffset` query parameter

Add to the `GET /api/schedule/fill-the-gap` operation in `specs/openapi.yaml`:

```yaml
parameters:
  - name: weekOffset
    in: query
    required: false
    schema:
      type: integer
      default: 0
    description: >
      Week offset from the current week (0 = this week, 1 = next week, -1 = last week).
      Recipes already assigned to CalendarEvents in the target week are excluded from results.
```

Also update the operation description to document rotation sort behaviour (see Req 3 below).

#### 2d. PWA — pass `weekOffset` from QuickFindModal

`QuickFindModal` currently calls `getFillTheGap()` with no arguments. It needs to receive the current `weekOffset` from its caller and forward it.

**`QuickFindModal` props change:**

```tsx
interface QuickFindModalProps {
  onClose: () => void;
  onSelect: (recipe: any) => void;
  weekOffset?: number;   // ← new, defaults to 0
}
```

**`getFillTheGap` API lib change** (`pwa/src/lib/api/planner.ts`):

```ts
export const getFillTheGap = async (weekOffset = 0) => {
  const result = await apiClient.api.schedule.fillTheGap.get({
    queryParameters: { weekOffset },
  });
  const data = result?.data || result;
  return Array.isArray(data) ? data : [];
};
```

**Callers that pass `weekOffset`:**

- `pwa/src/app/(app)/planner/page.tsx` — already has `currentWeekOffset` from `usePlannerStore()`; pass it as `weekOffset={currentWeekOffset}` to `<QuickFindModal>`.
- `pwa/src/components/home/HomeCommandCenter.tsx` — home page always operates on the current week (offset 0); no prop needed (default applies).
- `pwa/src/components/profile/FamilyGOTOSettings.tsx` — not week-context-aware; default 0 is correct.

### Files Changed

- `api/src/RecipeApi/Services/ScheduleService.cs`
- `api/src/RecipeApi/Controllers/ScheduleController.cs`
- `specs/openapi.yaml`
- `pwa/src/lib/api/planner.ts`
- `pwa/src/components/planner/QuickFindModal.tsx`
- `pwa/src/app/(app)/planner/page.tsx` (QuickFindModal usage only)

---

## Requirement 3: Rotation Sort

### Problem

`FillTheGapAsync` currently uses two different sort orders:

- **RecipeMatches pool**: `LastCookedDate == null ? 0 : 1` (nulls first), then `LastCookedDate ASC` — missing `VoteCount DESC` tiebreaker.
- **DiscoveryRecipes fallback pool**: `VoteCount DESC` first, then `LastCookedDate` — inverted priority; most-voted surfaces first rather than least-recently-cooked.

The target rotation sort (matching Discovery) is: `LastCookedDate ASC NULLS FIRST`, then `VoteCount DESC`.

### Solution

Apply the same sort to both pools in `FillTheGapAsync`:

```csharp
// RecipeMatches pool — add VoteCount tiebreaker
.OrderBy(x => x.Recipe.LastCookedDate == null ? 0 : 1)
.ThenBy(x => x.Recipe.LastCookedDate)
.ThenByDescending(x => x.Match.LikeCount)   // ← VoteCount tiebreaker

// DiscoveryRecipes fallback pool — fix sort order
.OrderBy(r => r.LastCookedDate == null ? 0 : 1)   // ← NULLS FIRST (was missing)
.ThenBy(r => r.LastCookedDate)                      // ← ASC (was missing)
.ThenByDescending(r => r.VoteCount)                 // ← tiebreaker (was primary)
```

Pool priority is preserved: `RecipeMatches` results are always returned before `DiscoveryRecipes` results (the existing `dtos.AddRange(fallback...)` pattern is unchanged).

### Files Changed

- `api/src/RecipeApi/Services/ScheduleService.cs` (same method as Req 2)

---

## Post-Change Tooling

After OpenAPI changes (`specs/openapi.yaml`):

1. Run `task agent:reconcile` — regenerates the Kiota PWA client from the updated spec.
2. Run `task agent:drift` — validates no schema drift between contract, DTOs, and generated models.
3. Run `task review` — final review gate.

---

## Correctness Properties

### P1 — Card height invariant
For any `PlannerDayCard` rendered with or without a recipe, with or without a vote count, the rendered height must equal 72px.

### P2 — Deduplication invariant
For any call to `FillTheGapAsync(weekOffset)`, no recipe ID in the returned list shall appear in `CalendarEvents` for the target week.

### P3 — Sort order invariant
For any two adjacent recipes `A` and `B` in the returned list from the same pool:
- If `A.LastCookedDate == null` and `B.LastCookedDate != null`, then `A` comes before `B`.
- If both have the same `LastCookedDate` (or both null), then the one with higher `VoteCount` comes first.
- All `RecipeMatches` results appear before any `DiscoveryRecipes` result.

### P4 — weekOffset passthrough
The `weekOffset` value passed to `QuickFindModal` must equal the `weekOffset` query parameter sent to `GET /api/schedule/fill-the-gap`.

---

## Requirement 4: VotingNudgeCard on Home

### Problem

Family members have no signal on the home screen that next week's voting is open. They must navigate into the planner to discover it. This breaks the social voting loop — voting participation drops when the entry point is buried.

### Solution

Add a `VotingNudgeCard` component to `HomeSections.tsx` and integrate it into `HomeCommandCenter.tsx` via a non-blocking `useEffect` fetch.

#### 4a. VotingNudgeCard component — `pwa/src/components/home/HomeSections.tsx`

New exported component added to the existing `HomeSections.tsx` file. Uses ochre accent (voting = discovery = ochre), consistent with `QuickFindModal` and `Navigation` ochre usage.

```tsx
interface VotingNudgeCardProps {
  plannedCount: number;
  onVote: () => void;
  onDismiss: () => void;
}

export function VotingNudgeCard({ plannedCount, onVote, onDismiss }: VotingNudgeCardProps) {
  return (
    <div
      data-testid="voting-nudge-card"
      className="relative w-full bg-ochre/10 border border-ochre/20 rounded-[2.5rem] p-6 flex flex-col gap-4 overflow-hidden"
    >
      {/* dismiss button */}
      <button
        data-testid="voting-nudge-dismiss"
        onClick={onDismiss}
        className="absolute top-4 right-4 h-8 w-8 rounded-full bg-ochre/10 flex items-center justify-center text-ochre/60 hover:bg-ochre/20 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ochre/20 text-ochre flex-shrink-0">
          <Vote size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black text-charcoal leading-tight">
            The family is voting on next week
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ochre/70 mt-0.5">
            {plannedCount} {plannedCount === 1 ? 'recipe' : 'recipes'} to vote on
          </span>
        </div>
      </div>

      <button
        data-testid="voting-nudge-vote-now"
        onClick={onVote}
        className="w-full h-12 rounded-2xl bg-ochre text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-ochre/90 shadow-lg shadow-ochre/20"
      >
        Vote Now →
      </button>
    </div>
  );
}
```

**Icon choice:** `Vote` from `lucide-react` (ballot/voting icon). Falls back to `Sparkles` if `Vote` is unavailable in the installed version.

**Planned count:** The number of days in the `weekOffset=1` schedule that have a recipe assigned (`days.filter(d => d.recipe != null).length`).

#### 4b. HomeCommandCenter integration

Two additions to `HomeCommandCenter.tsx`:

**State:**
```tsx
const [votingNudge, setVotingNudge] = useState<{ plannedCount: number } | null>(null);
const [votingNudgeDismissed, setVotingNudgeDismissed] = useState(false);
```

**useEffect — fetch after mount, non-blocking:**
```tsx
useEffect(() => {
  let isMounted = true;
  const fetchVotingStatus = async () => {
    try {
      const result = await apiClient.api.schedule.get({ queryParameters: { weekOffset: 1 } });
      const data = result?.data;
      if (!isMounted) return;
      if (data?.status === 1 && data.days) {
        const plannedCount = data.days.filter((d: any) => d.recipe != null).length;
        setVotingNudge({ plannedCount });
      }
    } catch {
      // Req 4 AC8: fetch failure → no card, no error surfaced
    }
  };
  fetchVotingStatus();
  return () => { isMounted = false; };
}, []);
```

**Render — below tonight card, above QuickCaptureTrigger:**

The `VotingNudgeCard` is rendered inside the `!isLoading` block, after the tonight card section and before `<QuickCaptureTrigger />`:

```tsx
{votingNudge && !votingNudgeDismissed && (
  <VotingNudgeCard
    plannedCount={votingNudge.plannedCount}
    onVote={() => router.push('/discover')}
    onDismiss={() => setVotingNudgeDismissed(true)}
  />
)}

<QuickCaptureTrigger />
```

The `router` instance is already available in `HomeCommandCenter` (`useRouter()`).

#### 4c. Render position

The full render order inside the `!isLoading` block becomes:

1. `TonightPivotCard` (when no recipe and not done)
2. `CookedSuccessCard` (when cooked and not dismissed)
3. Compact cooked badge (when cooked and dismissed)
4. `TonightMenuCard` (when recipe assigned and not done)
5. **`VotingNudgeCard`** ← new, session-dismissible
6. `QuickCaptureTrigger`

### Files Changed

- `pwa/src/components/home/HomeSections.tsx` — add `VotingNudgeCard` component
- `pwa/src/components/home/HomeCommandCenter.tsx` — add state, useEffect, render

---

## Post-Change Tooling

After OpenAPI changes (`specs/openapi.yaml`):

1. Run `task agent:reconcile` — regenerates the Kiota PWA client from the updated spec.
2. Run `task agent:drift` — validates no schema drift between contract, DTOs, and generated models.
3. Run `task review` — final review gate.

---

## Correctness Properties

### P1 — Card height invariant
For any `PlannerDayCard` rendered with or without a recipe, with or without a vote count, the rendered height must equal 72px.

### P2 — Deduplication invariant
For any call to `FillTheGapAsync(weekOffset)`, no recipe ID in the returned list shall appear in `CalendarEvents` for the target week.

### P3 — Sort order invariant
For any two adjacent recipes `A` and `B` in the returned list from the same pool:
- If `A.LastCookedDate == null` and `B.LastCookedDate != null`, then `A` comes before `B`.
- If both have the same `LastCookedDate` (or both null), then the one with higher `VoteCount` comes first.
- All `RecipeMatches` results appear before any `DiscoveryRecipes` result.

### P4 — weekOffset passthrough
The `weekOffset` value passed to `QuickFindModal` must equal the `weekOffset` query parameter sent to `GET /api/schedule/fill-the-gap`.

### P5 — VotingNudgeCard visibility invariant
The `VotingNudgeCard` SHALL be rendered if and only if: the `GET /api/schedule?weekOffset=1` fetch succeeded AND `status === 1` AND the card has not been dismissed in the current session.

### P6 — VotingNudgeCard non-persistence invariant
Dismissing the `VotingNudgeCard` SHALL NOT write to `localStorage`, `sessionStorage`, cookies, or any other persistent store. The dismissed state is held only in React component state.

---

## Requirement 5: weekStore Digital Twin

### Problem

The planner page currently manages voting/lock state through `plannerStore` boolean flags (`isVotingOpen`, `isLocked`) that are set imperatively after each API call. This creates several issues:

- `setWeekOffset` in `plannerStore` resets both flags to `false` on every week navigation, causing a flash of incorrect state before the next `loadData` completes.
- `isVotingOpen` and `isLocked` are stored as independent booleans rather than derived from the authoritative `status` integer, so they can drift out of sync.
- There is no optimistic-write guard: a background `sync()` can overwrite local schedule state while a user-initiated mutation is still in-flight.
- The planner page mixes schedule data (`useState<UILocalScheduleDay[]>`) with status flags from `plannerStore`, making the data flow hard to follow.

### Solution

Create `pwa/src/store/weekStore.ts` following the same digital-twin pattern as `todayStore`. The planner page consumes `weekStore` for `schedule`, `status`, `isVotingOpen`, and `isLocked`, and removes its local `useState` for schedule and its reads of `isVotingOpen`/`isLocked` from `plannerStore`.

#### 5a. weekStore shape

```ts
export interface WeekState {
  weekOffset: number;
  schedule: UILocalScheduleDay[];
  /** 0 = Draft, 1 = VotingOpen, 2 = Locked — seeded from WeeklyPlan.Status */
  status: 0 | 1 | 2;
  isLoading: boolean;
  lastSyncedAt: number | null;
  /**
   * Timestamp (ms) of the most recent optimistic write.
   * sync() will not overwrite schedule while this is within the 10-second window.
   */
  optimisticWriteAt: number | null;

  // Derived (not stored)
  // isVotingOpen = status === 1
  // isLocked     = status === 2

  // Actions
  init: (weekOffset: number) => Promise<void>;
  assignRecipe: (dayIndex: number, recipe: { id: string; name: string | null; image: string }) => void;
  removeRecipe: (dayIndex: number, date: string) => void;
  moveRecipe: (from: number, to: number) => void;
  openVoting: () => Promise<void>;
  closeVoting: () => Promise<void>;
  lockWeek: () => Promise<void>;
  sync: () => Promise<void>;
}
```

`isVotingOpen` and `isLocked` are **not stored** — they are computed inline wherever needed:

```ts
const isVotingOpen = useWeekStore((s) => s.status === 1);
const isLocked     = useWeekStore((s) => s.status === 2);
```

#### 5b. init(weekOffset)

`init` is the entry point called whenever the planner navigates to a new week. It:

1. Sets `isLoading = true` and `weekOffset = weekOffset`.
2. Immediately exposes any previously cached state (the store retains the last loaded schedule in memory; if `weekOffset` matches, it is shown while the fetch runs).
3. Fetches `GET /api/schedule?weekOffset={n}` in the background.
4. On success: sets `schedule`, `status`, `lastSyncedAt`, `isLoading = false`.
5. On failure: sets `isLoading = false`, retains any previously cached state (does not clear schedule).

```ts
init: async (weekOffset) => {
  set({ weekOffset, isLoading: true });
  try {
    const data = await getSchedule(weekOffset);
    if (!data) { set({ isLoading: false }); return; }
    const mergedDays = buildScheduleDays(data);
    const status = (data as any).status ?? 0;
    set({ schedule: mergedDays, status, lastSyncedAt: Date.now(), isLoading: false });
  } catch {
    set({ isLoading: false });
  }
},
```

#### 5c. Optimistic mutations

All three schedule mutations follow the same pattern: update local state immediately, fire the API call in the background, revert on failure.

**assignRecipe(dayIndex, recipe)**

```ts
assignRecipe: (dayIndex, recipe) => {
  const prev = get().schedule;
  const next = prev.map((d, i) =>
    i === dayIndex ? { ...d, recipe: { id: recipe.id, name: recipe.name ?? '', image: recipe.image } } : d
  );
  set({ schedule: next, optimisticWriteAt: Date.now() });
  assignRecipeToDay(get().weekOffset, dayIndex, recipe).catch(() => set({ schedule: prev }));
},
```

**removeRecipe(dayIndex, date)**

```ts
removeRecipe: (dayIndex, date) => {
  const prev = get().schedule;
  const next = prev.map((d, i) =>
    i === dayIndex ? { ...d, recipe: undefined, _isPending: false, _userCleared: true } : d
  );
  set({ schedule: next, optimisticWriteAt: Date.now() });
  removeRecipeFromDay(date).catch(() => set({ schedule: prev }));
},
```

**moveRecipe(from, to)**

```ts
moveRecipe: (from, to) => {
  const prev = get().schedule;
  const next = [...prev];
  // Swap recipes, keep day/date fixed at their indices
  const fromRecipe = next[from].recipe;
  next[from] = { ...next[from], recipe: next[to].recipe };
  next[to]   = { ...next[to],   recipe: fromRecipe };
  set({ schedule: next, optimisticWriteAt: Date.now() });
  moveRecipeApi(get().weekOffset, from, to).catch(() => set({ schedule: prev }));
},
```

#### 5d. Status mutations — openVoting() and lockWeek()

Both follow the optimistic-revert pattern on the `status` field.

**openVoting()**

```ts
openVoting: async () => {
  const prev = get().status;
  set({ status: 1 });
  try {
    await openVotingApi(get().weekOffset);
  } catch {
    set({ status: prev });
  }
},
```

**closeVoting() / lockWeek()**

`closeVoting` maps to `POST /api/schedule/lock` (same endpoint as `handleFinalize`). `lockWeek` is the optimistic version:

```ts
lockWeek: async () => {
  const prev = get().status;
  set({ status: 2 });
  try {
    await lockSchedule(get().weekOffset);
  } catch {
    set({ status: prev });
  }
},
```

#### 5e. sync() — 10-second optimistic write guard

Identical guard to `todayStore`:

```ts
sync: async () => {
  set({ isLoading: true });
  try {
    const data = await getSchedule(get().weekOffset);
    if (!data) return;
    const { optimisticWriteAt } = get();
    const optimisticIsRecent =
      optimisticWriteAt !== null && Date.now() - optimisticWriteAt < 10_000;
    const status = (data as any).status ?? 0;
    if (!optimisticIsRecent) {
      set({ schedule: buildScheduleDays(data), status, lastSyncedAt: Date.now() });
    } else {
      // Protect optimistic schedule; still update status (authoritative)
      set({ status, lastSyncedAt: Date.now() });
    }
  } catch {
    // silent
  } finally {
    set({ isLoading: false });
  }
},
```

#### 5f. Planner page refactor

The planner page changes are surgical — the goal is to replace the local `useState<UILocalScheduleDay[]>` and the `isVotingOpen`/`isLocked` reads from `plannerStore` with reads from `weekStore`, while keeping all other logic (smart defaults merge, poll interval, drag-reorder, cook mode, etc.) intact.

**Reads replaced:**

| Before | After |
|--------|-------|
| `const [schedule, setSchedule] = useState<UILocalScheduleDay[]>([])` | `const schedule = useWeekStore(s => s.schedule)` |
| `const [isLoading, setIsLoading] = useState(true)` | `const isLoading = useWeekStore(s => s.isLoading)` |
| `const { isVotingOpen, isLocked, setVotingOpen, setIsLocked } = usePlannerStore()` | `const status = useWeekStore(s => s.status)` + derived `isVotingOpen = status === 1`, `isLocked = status === 2` |

**Writes replaced:**

| Before | After |
|--------|-------|
| `setSchedule(mergedDays)` | `useWeekStore.getState().init(currentWeekOffset)` (init handles the fetch and merge) |
| `setVotingOpen(status === 1)` | removed — status is set inside `weekStore.init` |
| `setIsLocked(status === 2)` | removed — status is set inside `weekStore.init` |
| `handleAskFamily` → `openVoting(offset)` then `setVotingOpen(true)` | `weekStore.openVoting()` |
| `handleCloseVoting` → `lockSchedule(offset)` then `setVotingOpen(false); setIsLocked(true)` | `weekStore.lockWeek()` |
| `handleQuickFindSelect` → `setSchedule(...)` then `assignRecipeToDay(...)` | `weekStore.assignRecipe(dayIndex, recipe)` |
| `handleRemoveRecipe` → `removeRecipeFromDay(date)` then `setSchedule(...)` | `weekStore.removeRecipe(dayIndex, date)` |
| `handleReorder` → `setSchedule(updatedSchedule)` then `moveRecipe(...)` | `weekStore.moveRecipe(from, to)` (reorder handler calls this) |

**`setWeekOffset` in plannerStore** still exists for navigation (it owns `currentWeekOffset`, `activeTab`). The planner page calls `weekStore.init(newOffset)` inside a `useEffect` that watches `currentWeekOffset`:

```ts
useEffect(() => {
  useWeekStore.getState().init(currentWeekOffset);
}, [currentWeekOffset]);
```

This replaces the existing `loadData` effect.

**Smart defaults merge** moves inside `weekStore.init` (or a helper `buildScheduleDays`). The poll interval (`updateVoteCounts`) is replaced by `weekStore.sync()` on the same 30-second interval.

### Files Changed

- `pwa/src/store/weekStore.ts` — new file
- `pwa/src/app/(app)/planner/page.tsx` — consume weekStore, remove local schedule state and plannerStore boolean reads

---

## Requirement 6: "Ask the Family" CTA Availability

### Problem

The current condition for showing the "Ask the Family" CTA is:

```tsx
{!isVotingOpen && !isLocked && plannedCount > 0 && (
  <Button onClick={handleAskFamily} ...>Ask the Family</Button>
)}
```

The `plannedCount > 0` guard prevents the CTA from appearing on empty weeks. Per Req 6, the CTA should appear whenever `status === 0` and the week is not in the past — regardless of how many recipes are planned.

### Solution

Replace the condition with a `status`-based check plus a past-week guard:

```tsx
// Derived from weekStore
const isVotingOpen = status === 1;
const isLocked     = status === 2;

// Past-week guard: week is in the past if the Sunday of that week is before today
const weekIsPast = useMemo(() => {
  if (schedule.length < 7) return false;
  const sunday = new Date(schedule[6].date ?? '');
  const today  = new Date(getTodayString());
  return sunday < today;
}, [schedule]);

// CTA condition (Req 6)
{status === 0 && !weekIsPast && (
  <Button onClick={handleAskFamily} data-testid="ask-family-cta" ...>
    Ask the Family
  </Button>
)}
```

The `plannedCount > 0` requirement is removed entirely. The past-week guard uses the Sunday date from the loaded schedule (index 6), comparing it to today's date string — consistent with how `getTodayString()` is used elsewhere in the planner.

### Files Changed

- `pwa/src/app/(app)/planner/page.tsx` — update CTA condition

---

## Correctness Properties (Requirements 5–6)

### P7 — status seeding invariant
After `weekStore.init(n)` completes, `status` must equal `WeeklyPlan.Status` from the API response for `weekOffset=n`. It must never be derived from local boolean flags.

### P8 — isVotingOpen derivation invariant
`isVotingOpen` must always equal `status === 1`. There must be no independent boolean `isVotingOpen` stored in `weekStore` or `plannerStore` that can diverge from `status`.

### P9 — isLocked derivation invariant
`isLocked` must always equal `status === 2`. Same constraint as P8.

### P10 — openVoting optimistic revert
If `POST /api/schedule/voting/open` fails, `status` must revert to its value before `openVoting()` was called.

### P11 — lockWeek optimistic revert
If `POST /api/schedule/lock` fails, `status` must revert to its value before `lockWeek()` was called.

### P12 — sync guard invariant
If `optimisticWriteAt` is set and `Date.now() - optimisticWriteAt < 10_000`, then `sync()` must not overwrite `schedule` with server data.

### P13 — CTA availability invariant
The "Ask the Family" CTA must be visible if and only if `status === 0` AND the week's Sunday date is not before today's date. The `plannedCount` must have no effect on CTA visibility.
