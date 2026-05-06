# Tasks: Grocery Reclassification & Quantity Rollup

## How to use this file

Work **one task at a time** in order. Each task is a complete vertical slice: it touches the contract, the test, and the implementation together so nothing is left half-wired.

Before marking any task done, run the completion workflow:
```
task agent:drift        # zero drift confirmed
task agent:test:impact  # targeted tests pass
task review             # lint + typecheck + tests pass
```

Mark a task complete by changing `[ ]` to `[x]`.

Authority order: `specs/openapi.yaml` → this spec → tests → implementation.

---

## Slice 1 — Fix: PWA uses server-computed section (no new endpoint needed)

> **Why first?** The bug where well-categorized items land in the wrong aisle exists independently of reclassification. Fixing it now means Slice 2 (reclassify) starts from a correct baseline, and the test fixtures established here carry through.

### Task 1.1 [x] — Update GroceryList to accept DTOs

**File:** `pwa/src/components/planner/GroceryList.tsx`

Change the component props interface and the `grouped` memo. The component currently derives the section from the ingredient name via `mapIngredientToSection`; it must instead read `item.section` from the DTO.

Replace:
```tsx
interface GroceryListProps {
  weekOffset: number;
  ingredients: string[];
  onClose?: () => void;
}
```

With:
```tsx
import type { GroceryLineItemDto } from '@/lib/api/generated/models';

interface GroceryListProps {
  weekOffset: number;
  items: GroceryLineItemDto[];
  onClose?: () => void;
}
```

Replace the `grouped` memo (currently iterates `ingredients` and calls `mapIngredientToSection`):
```tsx
const grouped = useMemo(() => {
  const result: Partial<Record<GrocerySection, GroceryLineItemDto[]>> = {};
  for (const item of items) {
    const section = (item.section ?? 'Grocery') as GrocerySection;
    const bucket = AISLE_ORDER.includes(section) ? section : 'Grocery';
    if (!result[bucket]) result[bucket] = [];
    result[bucket]!.push(item);
  }
  return result;
}, [items]);
```

In the `useEffect` that initialises `groceryState`, replace `ingredients` with `items.map(i => i.displayName ?? '')`:
```tsx
useEffect(() => {
  if (items.length > 0 && Object.keys(groceryState).length === 0) {
    const initialState = items.reduce(
      (acc, item) => {
        const key = item.displayName ?? '';
        acc[key] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );
    setGroceryState(initialState);
  }
}, [items, groceryState, setGroceryState]);
```

In the render section, replace `aisleItems.map((item) => ...)` — `item` is now a `GroceryLineItemDto`, so use `item.displayName` as the display string and the `groceryState`/`handleToggle` key:
```tsx
{aisleItems.map((item) => {
  const key = item.displayName ?? '';
  const isChecked = groceryState[key] ?? false;
  const hasError = errorItems.has(key);
  return (
    <motion.button
      key={key}
      onClick={() => handleToggle(key)}
      ...
    >
      ...
      <span ...>{key}</span>
      ...
    </motion.button>
  );
})}
```

Remove the `mapIngredientToSection` import — it is no longer used here.

**Definition of done:** TypeScript compiles with no errors on this file (`task gate`).

---

### Task 1.2 [x] — Update planner page to pass items

**File:** `pwa/src/app/(app)/planner/page.tsx`

Find the existing derivation (around line 49):
```tsx
const memoizedIngredients = useMemo(
  () => [...new Set(schedule.flatMap((day) => day.recipe?.ingredients ?? []))],
  [schedule]
);
```

Delete this memo entirely. It will no longer be used.

Find the `<GroceryList ... />` usage (around line 410) and change the prop:
```tsx
// Before
<GroceryList weekOffset={weekOffset} ingredients={memoizedIngredients} onClose={...} />

// After — groceryItems comes from weekStore (already loaded from the API)
<GroceryList weekOffset={weekOffset} items={weekStore.groceryItems ?? []} onClose={...} />
```

Import `useWeekStore` if not already imported:
```tsx
import { useWeekStore } from '@/store/weekStore';
```

And destructure `groceryItems` from it:
```tsx
const { groceryItems } = useWeekStore();
```

**Definition of done:** `task gate` passes. Open the planner in a browser — grocery items appear under the correct aisles (matching the server-assigned section, not the keyword matcher).

---

### Task 1.3 [x] — Update GroceryList tests

**File:** `pwa/src/components/planner/GroceryList.test.tsx`

The existing tests mock `mapIngredientToSection` and pass `ingredients: string[]`. Both need to change.

1. Remove the `vi.mock('@/lib/grocery/aisleMapper', ...)` block — the component no longer calls it.

2. Add a helper to build `GroceryLineItemDto` test fixtures at the top of the file (after imports):
```tsx
import type { GroceryLineItemDto } from '@/lib/api/generated/models';

function makeItem(displayName: string, section: string, normalizedKey?: string): GroceryLineItemDto {
  return {
    displayName,
    normalizedKey: normalizedKey ?? displayName.toLowerCase().replace(/\s+/g, '_'),
    section,
    quantity: null,
    unitText: null,
    recipeIds: [],
    additionalData: {},
  };
}
```

3. Replace every `ingredients={['Tomato', 'Milk']}` prop with `items={[makeItem('Tomato', 'Produce'), makeItem('Milk', 'Dairy & Eggs')]}` (adjust to match the existing test scenarios).

4. Add a new test verifying that items are grouped by `item.section`, not by keyword:
```tsx
it('groups items by section from the DTO, not by keyword matching', () => {
  // "xyzzy" would fall to Grocery by keyword but we explicitly assign it to Pantry
  render(
    <GroceryList
      weekOffset={0}
      items={[makeItem('xyzzy', 'Pantry')]}
    />
  );
  expect(screen.getByTestId('aisle-section-Pantry')).toBeInTheDocument();
  expect(screen.queryByTestId('aisle-section-Grocery')).not.toBeInTheDocument();
});
```

**Run:** `task agent:test:impact`

**Definition of done:** All existing and new tests pass with no `aisleMapper` mock required.

---

## Slice 2 — Unit normalisation rollup in GroceryRecomputeService

> **Why before the endpoint?** The endpoint triggers `RecomputeForIngredientAsync` (added in Slice 3). That method calls `RecomputeForWeekAsync`. If rollup is broken at that point, fixing it later would silently corrupt recomputed lists. Get the rollup right first.

### Task 2.1 — Add UnitNormalizer

**File:** `api/src/RecipeApi/Utils/UnitNormalizer.cs` (new file)

```csharp
namespace RecipeApi.Utils;

public static class UnitNormalizer
{
    public sealed record NormalizedUnit(string CanonicalUnit, double Factor);

    private static readonly Dictionary<string, NormalizedUnit> Map =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // Weight → g
            ["g"]           = new("g", 1),
            ["gram"]        = new("g", 1),
            ["grams"]       = new("g", 1),
            ["mg"]          = new("g", 0.001),
            ["milligram"]   = new("g", 0.001),
            ["milligrams"]  = new("g", 0.001),
            ["kg"]          = new("g", 1000),
            ["kilogram"]    = new("g", 1000),
            ["kilograms"]   = new("g", 1000),
            // Volume → ml
            ["ml"]          = new("ml", 1),
            ["milliliter"]  = new("ml", 1),
            ["millilitre"]  = new("ml", 1),
            ["dl"]          = new("ml", 100),
            ["deciliter"]   = new("ml", 100),
            ["decilitre"]   = new("ml", 100),
            ["l"]           = new("ml", 1000),
            ["liter"]       = new("ml", 1000),
            ["litre"]       = new("ml", 1000),
            // Culinary → tbsp
            ["tsp"]         = new("tbsp", 1.0 / 3.0),
            ["teaspoon"]    = new("tbsp", 1.0 / 3.0),
            ["teaspoons"]   = new("tbsp", 1.0 / 3.0),
            ["tbsp"]        = new("tbsp", 1),
            ["tablespoon"]  = new("tbsp", 1),
            ["tablespoons"] = new("tbsp", 1),
            ["cup"]         = new("tbsp", 16),
            ["cups"]        = new("tbsp", 16),
            // Count → piece (null/blank handled in Normalize)
            ["piece"]       = new("piece", 1),
            ["pieces"]      = new("piece", 1),
            ["whole"]       = new("piece", 1),
            ["unit"]        = new("piece", 1),
            ["units"]       = new("piece", 1),
        };

    /// <summary>
    /// Returns the canonical unit and conversion factor for <paramref name="unitText"/>.
    /// Null or blank input maps to the "piece" family (count).
    /// Returns null if <paramref name="unitText"/> is not in any known family.
    /// </summary>
    public static NormalizedUnit? Normalize(string? unitText)
    {
        if (string.IsNullOrWhiteSpace(unitText))
            return new NormalizedUnit("piece", 1);

        return Map.TryGetValue(unitText.Trim(), out var result) ? result : null;
    }
}
```

**Definition of done:** File compiles with `task gate` (API side).

---

### Task 2.2 — Write UnitNormalizer tests first

**File:** `api/src/RecipeApi.Tests/Utils/UnitNormalizerTests.cs` (new file)

Write these tests **before** wiring UnitNormalizer into GroceryRecomputeService:

```csharp
using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Utils;

public class UnitNormalizerTests
{
    [Theory]
    [InlineData("g",    "g",    1)]
    [InlineData("kg",   "g",    1000)]
    [InlineData("mg",   "g",    0.001)]
    [InlineData("Kg",   "g",    1000)]   // case-insensitive
    [InlineData("ml",   "ml",   1)]
    [InlineData("l",    "ml",   1000)]
    [InlineData("dl",   "ml",   100)]
    [InlineData("tsp",  "tbsp", 1.0 / 3.0)]
    [InlineData("cup",  "tbsp", 16)]
    [InlineData("tbsp", "tbsp", 1)]
    [InlineData("piece","piece",1)]
    [InlineData("whole","piece",1)]
    public void Normalize_KnownUnit_ReturnsCorrectCanonicalAndFactor(
        string input, string expectedCanonical, double expectedFactor)
    {
        var result = UnitNormalizer.Normalize(input);
        Assert.NotNull(result);
        Assert.Equal(expectedCanonical, result.CanonicalUnit);
        Assert.Equal(expectedFactor, result.Factor, precision: 6);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalize_NullOrBlank_ReturnsPiece(string? input)
    {
        var result = UnitNormalizer.Normalize(input);
        Assert.NotNull(result);
        Assert.Equal("piece", result.CanonicalUnit);
        Assert.Equal(1, result.Factor);
    }

    [Theory]
    [InlineData("handful")]
    [InlineData("pinch")]
    [InlineData("oz")]
    public void Normalize_UnknownUnit_ReturnsNull(string input)
    {
        Assert.Null(UnitNormalizer.Normalize(input));
    }
}
```

**Run:** `task agent:test:impact`

**Definition of done:** All tests pass.

---

### Task 2.3 — Wire UnitNormalizer into GroceryRecomputeService

**File:** `api/src/RecipeApi/Services/GroceryRecomputeService.cs`

This changes step 5 of `RecomputeForWeekAsync`. The current grouping key is `(normalizedKey, unitText)`. Replace with a key that uses the canonical unit family.

Add a using at the top:
```csharp
using RecipeApi.Utils;
```

Replace the current step 5 block (the `.GroupBy(item => (item.NormalizedKey, item.UnitText))` chain) with:

```csharp
// 5. Group by (normalizedKey, canonicalUnit): sum quantities after unit conversion.
//    Entries with unknown units stay in their own bucket keyed by the raw unitText.
var grouped = intermediate
    .GroupBy(item =>
    {
        var nu = UnitNormalizer.Normalize(item.UnitText);
        var bucketUnit = nu?.CanonicalUnit ?? item.UnitText ?? string.Empty;
        return (item.NormalizedKey, BucketUnit: bucketUnit);
    })
    .Select(g =>
    {
        var first = g.First();
        var nu = UnitNormalizer.Normalize(first.UnitText);

        double? totalQuantity = null;
        bool hasAnyQuantity = g.Any(x => x.Quantity.HasValue);
        if (hasAnyQuantity)
        {
            totalQuantity = g
                .Where(x => x.Quantity.HasValue)
                .Sum(x =>
                {
                    var entryNu = UnitNormalizer.Normalize(x.UnitText);
                    return x.Quantity!.Value * (entryNu?.Factor ?? 1.0);
                });
        }

        // Emit the canonical unit; fall back to the raw unit for unknowns.
        var emittedUnit = nu?.CanonicalUnit ?? first.UnitText;

        var recipeIds = g.Select(x => x.RecipeId).Distinct().ToList();

        return new GroceryLineItemDto(
            DisplayName: first.DisplayName,
            NormalizedKey: first.NormalizedKey,
            Section: first.Section,
            Quantity: totalQuantity,
            UnitText: emittedUnit,
            RecipeIds: recipeIds);
    })
    .ToList();
```

**Definition of done:** `task gate` passes (API). Existing recompute tests still pass.

---

### Task 2.4 — Add rollup tests to GroceryRecomputeServiceTests

**File:** `api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs`

Add the following test methods to the existing class. Use the existing `SeedRecipeWithSupplyAsync` and `BuildRawMetadata` helpers already in the file.

```csharp
[Fact]
public async Task RecomputeForWeekAsync_SameUnitSameIngredient_SumsQuantity()
{
    // Two recipes each contribute 200g of flour → expect 1 line item with 400g
    await SeedRecipeWithSupplyAsync(TestMonday,
        [("flour", 200.0, "g")]);
    await SeedRecipeWithSupplyAsync(TestMonday.AddDays(1),
        [("flour", 200.0, "g")]);

    await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

    var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
    var items = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(
        plan.GroceryItems!, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

    var flour = items.Single(i => i.NormalizedKey!.Contains("flour"));
    Assert.Equal(400.0, flour.Quantity);
    Assert.Equal("g", flour.UnitText);
}

[Fact]
public async Task RecomputeForWeekAsync_CrossUnitSameFamily_ConvertsAndSums()
{
    // 500g + 1kg = 1500g
    await SeedRecipeWithSupplyAsync(TestMonday,
        [("potato", 500.0, "g")]);
    await SeedRecipeWithSupplyAsync(TestMonday.AddDays(1),
        [("potato", 1.0, "kg")]);

    await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

    var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
    var items = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(
        plan.GroceryItems!, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

    var potato = items.Single(i => i.NormalizedKey!.Contains("potato"));
    Assert.Equal(1500.0, potato.Quantity!.Value, precision: 3);
    Assert.Equal("g", potato.UnitText);
}

[Fact]
public async Task RecomputeForWeekAsync_UnknownUnit_KeptAsSeparateBucket()
{
    // "pinch" is not in any known family — stays as its own entry
    await SeedRecipeWithSupplyAsync(TestMonday,
        [("salt", 1.0, "pinch"), ("salt", 1.0, "pinch")]);

    await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

    var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
    var items = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(
        plan.GroceryItems!, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

    var salt = items.Single(i => i.NormalizedKey!.Contains("salt"));
    Assert.Equal("pinch", salt.UnitText);
    Assert.Equal(2.0, salt.Quantity);  // still summed within the same raw-unit bucket
}

[Fact]
public async Task RecomputeForWeekAsync_NullUnit_GroupedUnderPiece()
{
    // Three recipes contribute "onion" with no unit → one "piece" line item with qty 3
    for (int i = 0; i < 3; i++)
        await SeedRecipeWithSupplyAsync(TestMonday.AddDays(i),
            [("onion", 1.0, null)]);

    await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

    var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
    var items = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(
        plan.GroceryItems!, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

    var onion = items.Single(i => i.NormalizedKey!.Contains("onion"));
    Assert.Equal("piece", onion.UnitText);
    Assert.Equal(3.0, onion.Quantity);
}
```

**Run:** `task agent:test:impact`

**Definition of done:** All four new tests and all pre-existing recompute tests pass.

---

## Slice 3 — API: reclassify endpoint

### Task 3.1 — Add PATCH path to openapi.yaml

**File:** `specs/openapi.yaml`

Add a new path at the bottom of the `paths:` section (before `components:`):

```yaml
  /api/ingredients/{normalizedKey}/category:
    patch:
      summary: Reclassify an ingredient to a different grocery section
      description: >
        Upserts the ingredient_categories row for the given normalizedKey,
        setting grocery_section to the supplied value and source to "human".
        After persisting the change, recomputes all affected weekly grocery lists.
      operationId: reclassifyIngredientCategory
      parameters:
        - name: normalizedKey
          in: path
          required: true
          schema: { type: string }
          description: The normalized ingredient key (output of IngredientNormalizer.Normalize).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReclassifyIngredientRequest'
      responses:
        '204':
          description: Reclassification persisted and grocery lists recomputed.
        '400':
          description: grocerySection is missing or not a valid GrocerySection value.
```

Add the request body schema inside `components/schemas:`:

```yaml
    ReclassifyIngredientRequest:
      type: object
      required: [grocerySection]
      properties:
        grocerySection:
          type: string
          enum:
            - Produce
            - Meat
            - Seafood
            - Dairy & Eggs
            - Frozen
            - Bakery
            - Pantry
            - Beverages
            - Deli
            - Grocery
```

**Run:** `task agent:drift` — must pass before proceeding.

---

### Task 3.2 — Regenerate Kiota client

**Run:**
```
task api:generate
```

Verify that a new generated path for `/api/ingredients/{normalizedKey}/category` appears under `pwa/src/lib/api/generated/api/ingredients/` (or the equivalent generated directory). Check that `ReclassifyIngredientRequest` appears in `pwa/src/lib/api/generated/models/index.ts`.

**Definition of done:** `task gate` passes (PWA side) after regeneration.

---

### Task 3.3 — Add RecomputeForIngredientAsync to GroceryRecomputeService

**File:** `api/src/RecipeApi/Services/GroceryRecomputeService.cs`

Add this method after the existing `RecomputeForRecipeAsync`:

```csharp
/// <summary>
/// Finds all weeks whose pre-computed grocery list contains <paramref name="normalizedKey"/>
/// and recomputes each affected week.
/// Called after a human reclassification to propagate the corrected section.
/// </summary>
public async Task RecomputeForIngredientAsync(string normalizedKey, CancellationToken ct)
{
    // Use a raw SQL JSON-contains check to avoid deserialising every plan in memory.
    // The grocery_items column is stored as a JSON array of GroceryLineItemDto objects.
    var affectedMondays = await db.WeeklyPlans
        .Where(p => EF.Functions.JsonContains(
            p.GroceryItems!,
            $"[{{\"normalizedKey\":\"{normalizedKey}\"}}]"))
        .Select(p => p.WeekStartDate)
        .ToListAsync(ct);

    if (affectedMondays.Count == 0)
    {
        logger.LogDebug(
            "Ingredient '{Key}' is not in any weekly grocery list — no recompute needed",
            normalizedKey);
        return;
    }

    logger.LogInformation(
        "Reclassifying ingredient '{Key}' — recomputing {Count} affected week(s)",
        normalizedKey, affectedMondays.Count);

    foreach (var monday in affectedMondays)
        await RecomputeForWeekAsync(monday, ct);
}
```

> **Note on `EF.Functions.JsonContains`:** This requires the `Npgsql.EntityFrameworkCore.PostgreSQL` package (already present). If the project uses an in-memory provider in tests, skip this call and instead filter in-memory using `p.GroceryItems != null && p.GroceryItems.Contains(normalizedKey)` — this is safe for tests because normalizedKeys are unique enough strings that substring matching is deterministic in test data.

**Definition of done:** `task gate` passes.

---

### Task 3.4 — Add IngredientCategoryService

**File:** `api/src/RecipeApi/Services/IngredientCategoryService.cs` (new file)

```csharp
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class IngredientCategoryService(
    RecipeDbContext db,
    GroceryRecomputeService groceryRecompute,
    ILogger<IngredientCategoryService> logger)
{
    /// <summary>
    /// Upserts the ingredient_categories row for <paramref name="normalizedKey"/>,
    /// sets source = "human", then recomputes all affected weekly grocery lists.
    /// </summary>
    public async Task ReclassifyAsync(
        string normalizedKey,
        string grocerySection,
        CancellationToken ct)
    {
        var existing = await db.IngredientCategories
            .FirstOrDefaultAsync(ic => ic.NormalizedKey == normalizedKey, ct);

        if (existing is null)
        {
            db.IngredientCategories.Add(new IngredientCategory
            {
                NormalizedKey = normalizedKey,
                GrocerySection = grocerySection,
                Confidence = 1.0,
                Source = "human",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            existing.GrocerySection = grocerySection;
            existing.Source = "human";
            existing.Confidence = 1.0;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Ingredient '{Key}' reclassified to '{Section}' by human",
            normalizedKey, grocerySection);

        await groceryRecompute.RecomputeForIngredientAsync(normalizedKey, ct);
    }
}
```

Register in `Program.cs` (add after the `GroceryRecomputeService` line):
```csharp
builder.Services.AddScoped<IngredientCategoryService>();
```

**Definition of done:** `task gate` passes.

---

### Task 3.5 — Write IngredientCategoryService tests first

**File:** `api/src/RecipeApi.Tests/Services/IngredientCategoryServiceTests.cs` (new file)

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class IngredientCategoryServiceTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private IngredientCategoryService _service = null!;
    private Mock<GroceryRecomputeService> _recomputeMock = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();

        // Use a mock for GroceryRecomputeService so these tests stay focused.
        _recomputeMock = new Mock<GroceryRecomputeService>(MockBehavior.Loose);
        _recomputeMock
            .Setup(s => s.RecomputeForIngredientAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<IngredientCategoryService>>();
        _service = new IngredientCategoryService(_db, _recomputeMock.Object, logger);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task ReclassifyAsync_NewKey_InsertsRowWithHumanSource()
    {
        await _service.ReclassifyAsync("potato", "Produce", CancellationToken.None);

        var row = await _db.IngredientCategories.SingleAsync(r => r.NormalizedKey == "potato");
        Assert.Equal("Produce", row.GrocerySection);
        Assert.Equal("human", row.Source);
        Assert.Equal(1.0, row.Confidence);
    }

    [Fact]
    public async Task ReclassifyAsync_ExistingKey_UpdatesSectionAndSource()
    {
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "onion",
            GrocerySection = "Grocery",
            Source = "llm",
            Confidence = 0.7,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
        });
        await _db.SaveChangesAsync();

        await _service.ReclassifyAsync("onion", "Produce", CancellationToken.None);

        var row = await _db.IngredientCategories.SingleAsync(r => r.NormalizedKey == "onion");
        Assert.Equal("Produce", row.GrocerySection);
        Assert.Equal("human", row.Source);
        Assert.Equal(1.0, row.Confidence);
    }

    [Fact]
    public async Task ReclassifyAsync_ExistingKey_RefreshesUpdatedAt()
    {
        var before = DateTimeOffset.UtcNow.AddMinutes(-1);
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "carrot",
            GrocerySection = "Grocery",
            Source = "llm",
            Confidence = 0.5,
            CreatedAt = before,
            UpdatedAt = before,
        });
        await _db.SaveChangesAsync();

        await _service.ReclassifyAsync("carrot", "Produce", CancellationToken.None);

        var row = await _db.IngredientCategories.SingleAsync(r => r.NormalizedKey == "carrot");
        Assert.True(row.UpdatedAt > before);
    }

    [Fact]
    public async Task ReclassifyAsync_AlwaysCallsRecomputeForIngredient()
    {
        await _service.ReclassifyAsync("garlic", "Produce", CancellationToken.None);

        _recomputeMock.Verify(
            s => s.RecomputeForIngredientAsync("garlic", It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
```

**Run:** `task agent:test:impact`

**Definition of done:** All four tests pass.

---

### Task 3.6 — Add IngredientsController

**File:** `api/src/RecipeApi/Controllers/IngredientsController.cs` (new file)

```csharp
using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/ingredients")]
public class IngredientsController(IngredientCategoryService ingredientCategoryService) : ControllerBase
{
    private static readonly HashSet<string> ValidSections = new(StringComparer.OrdinalIgnoreCase)
    {
        "Produce", "Meat", "Seafood", "Dairy & Eggs",
        "Frozen", "Bakery", "Pantry", "Beverages", "Deli", "Grocery"
    };

    [HttpPatch("{normalizedKey}/category")]
    public async Task<IActionResult> ReclassifyCategory(
        [FromRoute] string normalizedKey,
        [FromBody] ReclassifyIngredientDto dto,
        CancellationToken ct)
    {
        if (!ValidSections.Contains(dto.GrocerySection))
        {
            return Problem(
                statusCode: 400,
                title: "Invalid grocery section",
                detail: $"'{dto.GrocerySection}' is not a valid GrocerySection. " +
                        $"Valid values: {string.Join(", ", ValidSections)}.");
        }

        await ingredientCategoryService.ReclassifyAsync(normalizedKey, dto.GrocerySection, ct);
        return NoContent();
    }
}
```

**File:** `api/src/RecipeApi/Dto/ReclassifyIngredientDto.cs` (new file)

```csharp
namespace RecipeApi.Dto;

public record ReclassifyIngredientDto(string GrocerySection);
```

**Definition of done:** `task gate` passes.

---

### Task 3.7 — Write integration tests for the PATCH endpoint

**File:** `api/src/RecipeApi.Tests/Integration/IngredientCategoryIntegrationTests.cs` (new file)

Look at `api/src/RecipeApi.Tests/Integration/DiscoveryIntegrationTests.cs` for the HTTP client setup pattern — copy the same `_client` initialisation from `TestWebApplicationFactory`.

```csharp
using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class IngredientCategoryIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
        var scope = _factory.Services.CreateScope();
        _db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Patch_ValidSection_Returns204AndPersistsHumanSource()
    {
        var response = await _client.PatchAsJsonAsync(
            "/api/ingredients/potato/category",
            new { grocerySection = "Produce" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var row = await _db.IngredientCategories
            .SingleAsync(r => r.NormalizedKey == "potato");
        Assert.Equal("Produce", row.GrocerySection);
        Assert.Equal("human", row.Source);
    }

    [Fact]
    public async Task Patch_InvalidSection_Returns400()
    {
        var response = await _client.PatchAsJsonAsync(
            "/api/ingredients/salt/category",
            new { grocerySection = "NotARealSection" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
```

**Run:** `task agent:test:impact`

**Definition of done:** Both integration tests pass.

---

## Slice 4 — PWA: reclassify affordance

### Task 4.1 — Add reclassify API call

**File:** `pwa/src/lib/api/ingredients.ts` (new file)

Follow the same `fetch` pattern used in `pwa/src/lib/api/schedule.ts`:

```ts
import { requestAdapter } from './api-client';
import { useFamilyStore } from '@/store/familyStore';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';

export async function reclassifyIngredient(
  normalizedKey: string,
  grocerySection: GrocerySection
): Promise<void> {
  const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;

  const response = await fetch(
    `${requestAdapter.baseUrl}/api/ingredients/${encodeURIComponent(normalizedKey)}/category`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Family-Member-Id': familyMemberId || '',
      },
      body: JSON.stringify({ grocerySection }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to reclassify ingredient: ${response.statusText}`);
  }
}
```

**Definition of done:** `task gate` passes (TypeScript compiles, no lint errors).

---

### Task 4.2 — Add reclassify state and handler to GroceryList

**File:** `pwa/src/components/planner/GroceryList.tsx`

Add two new pieces of state at the top of the component (after the existing `errorItems` state):

```tsx
import { reclassifyIngredient } from '@/lib/api/ingredients';
import { AISLE_ORDER } from '@/lib/grocery/aisleOrder';

// Track which item's section picker is open (by normalizedKey), and reclassify errors
const [reclassifyOpen, setReclassifyOpen] = useState<string | null>(null);
const [reclassifyErrors, setReclassifyErrors] = useState<Set<string>>(new Set());
```

Add the handler after `handleToggle`:

```tsx
const handleReclassify = async (item: GroceryLineItemDto, newSection: GrocerySection) => {
  setReclassifyOpen(null);
  try {
    await reclassifyIngredient(item.normalizedKey!, newSection);
    // Optimistic: the SSE stream will push the recomputed list shortly.
    // No local state change needed beyond closing the picker.
  } catch {
    setReclassifyErrors((prev) => {
      const next = new Set(prev);
      next.add(item.normalizedKey!);
      return next;
    });
    setTimeout(() => {
      setReclassifyErrors((prev) => {
        const next = new Set(prev);
        next.delete(item.normalizedKey!);
        return next;
      });
    }, 3000);
  }
};
```

**Definition of done:** `task gate` passes.

---

### Task 4.3 — Add reclassify UI to each item row

**File:** `pwa/src/components/planner/GroceryList.tsx`

Inside the `aisleItems.map(...)` render block, add a reclassify button and inline section picker alongside each item. The button must not overlap the toggle tap target.

Replace the existing item `<motion.button>` block with:

```tsx
{aisleItems.map((item) => {
  const key = item.displayName ?? '';
  const isChecked = groceryState[key] ?? false;
  const hasError = errorItems.has(key);
  const hasReclassifyError = reclassifyErrors.has(item.normalizedKey ?? '');
  const isPickerOpen = reclassifyOpen === item.normalizedKey;

  return (
    <div key={key} className="relative">
      <div className={`flex items-center p-4 rounded-2xl transition-all ${
        isChecked ? 'bg-sage/5 text-charcoal/40' : 'hover:bg-charcoal/2 text-charcoal'
      }`}>
        {/* Toggle button — takes up the left portion */}
        <button
          onClick={() => handleToggle(key)}
          className="flex items-center space-x-4 flex-1 text-left"
          data-testid="grocery-item-checkbox"
          data-item-name={key}
        >
          {isChecked ? (
            <CheckCircle2 size={20} className="text-sage flex-shrink-0" />
          ) : (
            <Circle size={20} className="text-charcoal/20 flex-shrink-0" />
          )}
          <span className={`font-medium transition-all ${isChecked ? 'line-through opacity-60' : ''}`}>
            {key}
          </span>
          {hasError && (
            <AlertCircle size={12} className="text-terracotta flex-shrink-0 ml-1"
              data-testid="grocery-item-error" />
          )}
        </button>

        {/* Reclassify button — separate tap target */}
        <button
          onClick={() => setReclassifyOpen(isPickerOpen ? null : (item.normalizedKey ?? null))}
          className="ml-2 p-1 rounded-full hover:bg-charcoal/5 text-charcoal/30 hover:text-charcoal/60 transition-colors"
          aria-label={`Change section for ${key}`}
          data-testid="reclassify-btn"
          data-item-name={key}
        >
          <Tag size={14} />
          {hasReclassifyError && (
            <AlertCircle size={10} className="text-terracotta absolute -top-1 -right-1"
              data-testid="reclassify-error" />
          )}
        </button>
      </div>

      {/* Inline section picker */}
      {isPickerOpen && (
        <div
          className="mx-4 mb-2 flex flex-wrap gap-2 p-3 bg-charcoal/3 rounded-2xl"
          data-testid="section-picker"
        >
          {AISLE_ORDER.map((section) => (
            <button
              key={section}
              onClick={() => handleReclassify(item, section)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                item.section === section
                  ? 'bg-sage text-white'
                  : 'bg-white text-charcoal/60 hover:bg-sage/10'
              }`}
              data-testid={`section-option-${section}`}
            >
              {section}
            </button>
          ))}
        </div>
      )}
    </div>
  );
})}
```

Add `Tag` to the lucide-react import:
```tsx
import { AlertCircle, CheckCircle2, Circle, Tag } from 'lucide-react';
```

**Definition of done:** `task gate` passes. Manually open the grocery list in a browser — each item has a small tag icon; tapping it reveals a row of section pills; tapping a pill closes the picker and fires the PATCH call.

---

### Task 4.4 — Add reclassify tests to GroceryList

**File:** `pwa/src/components/planner/GroceryList.test.tsx`

Add a new `describe` block for reclassification:

```tsx
import { reclassifyIngredient } from '@/lib/api/ingredients';

vi.mock('@/lib/api/ingredients', () => ({
  reclassifyIngredient: vi.fn(),
}));

describe('GroceryList — reclassify affordance', () => {
  it('shows the section picker when the reclassify button is clicked', async () => {
    render(
      <GroceryList
        weekOffset={0}
        items={[makeItem('Tomato', 'Produce', 'tomato')]}
      />
    );
    const btn = screen.getByTestId('reclassify-btn');
    await userEvent.click(btn);
    expect(screen.getByTestId('section-picker')).toBeInTheDocument();
  });

  it('calls reclassifyIngredient with the selected section', async () => {
    vi.mocked(reclassifyIngredient).mockResolvedValue(undefined);
    render(
      <GroceryList
        weekOffset={0}
        items={[makeItem('Tomato', 'Produce', 'tomato')]}
      />
    );
    await userEvent.click(screen.getByTestId('reclassify-btn'));
    await userEvent.click(screen.getByTestId('section-option-Pantry'));

    expect(reclassifyIngredient).toHaveBeenCalledWith('tomato', 'Pantry');
    expect(screen.queryByTestId('section-picker')).not.toBeInTheDocument();
  });

  it('shows reclassify error indicator when the API call fails', async () => {
    vi.mocked(reclassifyIngredient).mockRejectedValue(new Error('Network error'));
    render(
      <GroceryList
        weekOffset={0}
        items={[makeItem('Tomato', 'Produce', 'tomato')]}
      />
    );
    await userEvent.click(screen.getByTestId('reclassify-btn'));
    await userEvent.click(screen.getByTestId('section-option-Pantry'));

    await screen.findByTestId('reclassify-error');
  });
});
```

Import `userEvent` at the top:
```tsx
import userEvent from '@testing-library/user-event';
```

**Run:** `task agent:test:impact`

**Definition of done:** All three new reclassify tests pass alongside the existing section-completion tests.

---

## Slice 5 — Final gates

### Task 5.1 — Drift check

```
task agent:drift
```

Must report zero violations. Fix any before proceeding.

### Task 5.2 — Full test suite

```
task test:api && task test:pwa
```

All tests must pass.

### Task 5.3 — Review

```
task review
```

Address any lint, typecheck, or formatting findings. Do not mark this spec complete until `task review` exits clean.

---

## Risks & Questions

- **`EF.Functions.JsonContains` on in-memory provider** — EF Core's in-memory provider does not support `JsonContains`. Task 3.3 notes the fallback pattern for test contexts. Confirm the API integration tests use the Postgres test DB (via `TestWebApplicationFactory`) and not the in-memory provider, or adjust the implementation to use a raw SQL fallback that works in both contexts.
- **SSE propagation timing** — after reclassify, the PWA closes the picker and waits for the SSE `schedule` event to push the updated `groceryItems`. If the user's SSE connection is stale, the item may appear to stay in the old section until reconnect. This is acceptable for the current scope.
- **`GroceryRecomputeService` mock in `IngredientCategoryServiceTests`** — if `GroceryRecomputeService` is not easily mockable (sealed, no interface), make `RecomputeForIngredientAsync` `virtual` or extract an `IGroceryRecompute` interface. Do the simplest thing that lets the unit test isolate the service logic.

## Notes / Decisions

- **2026-05-06** — Spec written. Tasks restructured as vertical slices after review. Rollup (Slice 2) comes before the endpoint (Slice 3) so that any recompute triggered by reclassification already uses correct unit normalisation.
- **`unitText` in emitted DTO is canonical, not raw** — e.g. a recipe that says `1 kg flour` will produce `unitText: "g"` and `quantity: 1000` in the grocery list. This is intentional: display formatting (showing "1 kg" vs "1000 g") is a future concern and out of scope here.
