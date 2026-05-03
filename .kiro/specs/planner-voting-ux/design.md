# Design Document — planner-voting-ux (Requirements 1–3)

## Scope

This document covers the design for Requirements 1, 2, and 3 of the `planner-voting-ux` spec:

1. **PlannerDayCard fixed height** — eliminate layout shift from vote badge toggling and recipe name wrapping.
2. **fill-the-gap deduplication** — exclude recipes already in the target week from Quick Find results.
3. **Rotation sort** — apply `LastCookedDate ASC NULLS FIRST, VoteCount DESC` to both recipe pools in `FillTheGapAsync`.

Requirements 4–6 (VotingNudgeCard, weekStore) are out of scope for this session.

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
