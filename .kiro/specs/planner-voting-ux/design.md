# Design Document — planner-voting-ux (Requirements 1–4)

## Scope

This document covers the design for Requirements 1, 2, 3, and 4 of the `planner-voting-ux` spec:

1. **PlannerDayCard fixed height** — eliminate layout shift from vote badge toggling and recipe name wrapping.
2. **fill-the-gap deduplication** — exclude recipes already in the target week from Quick Find results.
3. **Rotation sort** — apply `LastCookedDate ASC NULLS FIRST, VoteCount DESC` to both recipe pools in `FillTheGapAsync`.
4. **VotingNudgeCard on Home** — session-dismissible card on HomeCommandCenter that surfaces active next-week voting.

Requirements 5–6 (weekStore) are out of scope for this session.

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
