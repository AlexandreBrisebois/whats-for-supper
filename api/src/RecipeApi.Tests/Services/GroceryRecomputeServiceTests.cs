using System.Text.Json;
using FsCheck;
using FsCheck.Fluent;
using FsCheck.Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Services;

/// <summary>
/// Unit and property-based tests for <see cref="GroceryRecomputeService"/>.
/// Uses the in-memory EF provider via <see cref="TestWebApplicationFactory"/>.
///
/// Property tests (P6–P9) use a manual 100-iteration loop because FsCheck 3.x
/// does not support async property bodies, and the service requires async DB access.
/// </summary>
public class GroceryRecomputeServiceTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private GroceryRecomputeService _service = null!;

    // A fixed Monday used by unit tests
    private static readonly DateOnly TestMonday = new DateOnly(2025, 1, 6); // Monday

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<GroceryRecomputeService>>();
        var aisleMapper = new AisleMapper();
        _service = new GroceryRecomputeService(_db, aisleMapper, logger);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Builds a raw_metadata JSON string with a supply array.</summary>
    private static string BuildRawMetadata(IEnumerable<(string name, double? quantity, string? unitText)> supplies)
    {
        var items = supplies.Select(s =>
        {
            var obj = new Dictionary<string, object?> { ["name"] = s.name };
            if (s.quantity.HasValue) obj["quantity"] = s.quantity.Value;
            if (s.unitText != null) obj["unitText"] = s.unitText;
            return obj;
        });
        return JsonSerializer.Serialize(new { supply = items });
    }

    /// <summary>
    /// Seeds a recipe with the given supply items and a calendar event on <paramref name="date"/>.
    /// Returns the recipe ID.
    /// </summary>
    private async Task<Guid> SeedRecipeWithSupplyAsync(
        DateOnly date,
        IEnumerable<(string name, double? quantity, string? unitText)> supplies)
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            RawMetadata = BuildRawMetadata(supplies),
        });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = date,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();
        return recipeId;
    }

    /// <summary>Reads the persisted grocery_items for <paramref name="monday"/> from the DB.</summary>
    private async Task<List<GroceryLineItemDto>> GetGroceryItemsAsync(DateOnly monday)
    {
        var plan = await _db.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday);
        if (plan == null) return [];
        return JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
    }

    /// <summary>
    /// Returns a deterministic Monday offset from a base date using a hash seed,
    /// ensuring no two property test iterations share the same week.
    /// </summary>
    private static DateOnly UniqueMonday(DateOnly baseDate, int seed, int maxDays = 3000)
    {
        var offset = Math.Abs(seed) % maxDays;
        var candidate = baseDate.AddDays(offset);
        var daysToMonday = ((int)candidate.DayOfWeek - 1 + 7) % 7;
        return candidate.AddDays(-daysToMonday);
    }

    // ── Unit Tests ────────────────────────────────────────────────────────────

    [Fact]
    public async Task EmptySupply_WritesEmptyGroceryItems()
    {
        // Arrange: recipe with no supply items
        await SeedRecipeWithSupplyAsync(TestMonday, []);

        // Act
        await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        // Assert
        var items = await GetGroceryItemsAsync(TestMonday);
        Assert.Empty(items);
    }

    [Fact]
    public async Task SingleRecipe_SingleSupplyItem_ProducesOneLineItem()
    {
        var monday = new DateOnly(2025, 1, 13);
        await SeedRecipeWithSupplyAsync(monday, [("chicken breast", 500.0, "g")]);

        await _service.RecomputeForWeekAsync(monday, CancellationToken.None);

        var items = await GetGroceryItemsAsync(monday);
        Assert.Single(items);
        Assert.Equal("chicken breast", items[0].NormalizedKey);
        Assert.Equal(500.0, items[0].Quantity);
        Assert.Equal("g", items[0].UnitText);
    }

    [Fact]
    public async Task TwoRecipes_OverlappingIngredient_SameUnit_QuantitiesSummed()
    {
        var monday = new DateOnly(2025, 1, 20);
        // Two recipes both using "onion" in "pcs"
        await SeedRecipeWithSupplyAsync(monday, [("onion", 2.0, "pcs")]);
        await SeedRecipeWithSupplyAsync(monday.AddDays(1), [("onion", 3.0, "pcs")]);

        await _service.RecomputeForWeekAsync(monday, CancellationToken.None);

        var items = await GetGroceryItemsAsync(monday);
        var onionItems = items.Where(i => i.NormalizedKey == "onion").ToList();
        Assert.Single(onionItems);
        Assert.Equal(5.0, onionItems[0].Quantity);
        Assert.Equal("pcs", onionItems[0].UnitText);
    }

    [Fact]
    public async Task TwoSupplyItems_SameName_DifferentUnits_ProducesTwoLineItems()
    {
        var monday = new DateOnly(2025, 1, 27);
        // Same ingredient "flour" but different units in the same recipe
        await SeedRecipeWithSupplyAsync(monday, [
            ("flour", 200.0, "g"),
            ("flour", 1.0, "cup"),
        ]);

        await _service.RecomputeForWeekAsync(monday, CancellationToken.None);

        var items = await GetGroceryItemsAsync(monday);
        var flourItems = items.Where(i => i.NormalizedKey == "flour").ToList();
        Assert.Equal(2, flourItems.Count);
        Assert.Contains(flourItems, i => i.UnitText == "g" && i.Quantity == 200.0);
        Assert.Contains(flourItems, i => i.UnitText == "ml" && i.Quantity == 240.0);
    }

    [Fact]
    public async Task SupplyItem_NotInIngredientCategories_FallsBackToAisleMapper()
    {
        var monday = new DateOnly(2025, 2, 3);
        // "lettuce" is not in ingredient_categories — AisleMapper maps it to Produce
        await SeedRecipeWithSupplyAsync(monday, [("lettuce", 1.0, "head")]);

        await _service.RecomputeForWeekAsync(monday, CancellationToken.None);

        var items = await GetGroceryItemsAsync(monday);
        Assert.Single(items);
        Assert.Equal("Produce", items[0].Section);
    }

    [Fact]
    public async Task SupplyItem_InIngredientCategories_UsesDbSection()
    {
        var monday = new DateOnly(2025, 2, 10);
        // Seed "garlic" in ingredient_categories with a custom section override
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "garlic",
            GrocerySection = "Deli",  // override — AisleMapper would return Produce
            Confidence = 1.0,
            Source = "manual",
        });
        await _db.SaveChangesAsync();

        await SeedRecipeWithSupplyAsync(monday, [("garlic", 3.0, "cloves")]);

        await _service.RecomputeForWeekAsync(monday, CancellationToken.None);

        var items = await GetGroceryItemsAsync(monday);
        Assert.Single(items);
        Assert.Equal("Deli", items[0].Section);
    }

    [Fact]
    public async Task RecomputeForWeekAsync_SameUnitSameIngredient_SumsQuantity()
    {
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
        public async Task RecomputeForWeekAsync_RequiredQuantityShape_ExtractsQuantityAndUnit()
        {
                var recipeId = Guid.NewGuid();
                _db.Recipes.Add(new Recipe
                {
                        Id = recipeId,
                        Name = "SchemaOrg Recipe",
                        RawMetadata =
                                """
                                {
                                    "supply": [
                                        {
                                            "name": "garlic cloves",
                                            "requiredQuantity": {
                                                "value": 4,
                                                "unitText": "piece"
                                            }
                                        }
                                    ]
                                }
                                """,
                });
                _db.CalendarEvents.Add(new CalendarEvent
                {
                        Id = Guid.NewGuid(),
                        RecipeId = recipeId,
                        Date = TestMonday,
                        Status = CalendarEventStatus.Planned,
                });
                await _db.SaveChangesAsync();

                await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

                var items = await GetGroceryItemsAsync(TestMonday);
                var garlic = items.Single(i => i.NormalizedKey!.Contains("garlic"));
                Assert.Equal(4.0, garlic.Quantity);
                Assert.Equal("piece", garlic.UnitText);
        }

    [Fact]
    public async Task RecomputeForWeekAsync_UnknownUnit_KeptAsSeparateBucket()
    {
        await SeedRecipeWithSupplyAsync(TestMonday,
            [("salt", 1.0, "pinch"), ("salt", 1.0, "pinch")]);

        await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
        var items = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(
            plan.GroceryItems!, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

        var salt = items.Single(i => i.NormalizedKey!.Contains("salt"));
        Assert.Equal("pinch", salt.UnitText);
        Assert.Equal(2.0, salt.Quantity);
    }

    [Fact]
    public async Task RecomputeForWeekAsync_NullUnit_GroupedUnderPiece()
    {
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

    // ── Property-Based Tests ──────────────────────────────────────────────────
    //
    // FsCheck 3.x does not support async property bodies. These tests use a
    // manual 100-iteration loop driven by FsCheck generators, running each
    // iteration against a fresh week (unique Monday) to avoid cross-iteration
    // interference in the shared in-memory DB.

    // Feature: grocery-section-categorization, Property 6: same-key same-unit quantity aggregation
    // For any two supply items with the same normalizedKey and the same unitText, the
    // GroceryRecomputeService SHALL produce exactly one GroceryLineItem whose quantity
    // equals the arithmetic sum of the two input quantities.
    // Validates: Requirements 3.4, 3.11
    [Fact]
    public async Task P6_SameKeySameUnit_QuantitiesAreAggregated()
    {
        var units = new[] { "g", "kg", "ml", "L", "cup", "tbsp", "tsp", "pcs", "oz" };
        var rng = new Random(42);
        var baseDate = new DateOnly(2026, 1, 1);

        for (int i = 0; i < 100; i++)
        {
            // Unique ingredient name per iteration to avoid cross-iteration interference
            var name = $"p6ingredient{i:D3}";
            var q1 = (double)rng.Next(1, 501);
            var q2 = (double)rng.Next(1, 501);
            var unit = units[rng.Next(units.Length)];

            var monday = UniqueMonday(baseDate, i * 7, 3000);

            await SeedRecipeWithSupplyAsync(monday, [(name, q1, unit)]);
            await SeedRecipeWithSupplyAsync(monday.AddDays(1), [(name, q2, unit)]);

            await _service.RecomputeForWeekAsync(monday, CancellationToken.None);

            var items = await GetGroceryItemsAsync(monday);
            var normalizedName = IngredientNormalizer.Normalize(name);
            var normalizedUnit = UnitNormalizer.Normalize(unit);
            var expectedUnit = normalizedUnit?.CanonicalUnit ?? unit;
            var expectedQuantity = (q1 + q2) * (normalizedUnit?.Factor ?? 1.0);
            var matching = items.Where(x => x.NormalizedKey == normalizedName && x.UnitText == expectedUnit).ToList();

            Assert.Single(matching);
            Assert.NotNull(matching[0].Quantity);
            Assert.Equal(expectedQuantity, matching[0].Quantity!.Value, precision: 4);
        }
    }

    // Feature: grocery-section-categorization, Property 7: different-unit separation
    // For any two supply items with the same normalizedKey but different unitText values,
    // the GroceryRecomputeService SHALL produce exactly two separate GroceryLineItem entries
    // — one per unit.
    // Validates: Requirements 3.5
    [Fact]
    public async Task P7_SameKey_DifferentUnits_ProducesSeparateLineItems()
    {
        var unitPairs = new (string, string)[]
        {
            ("tsp", "oz"), ("pcs", "g"), ("kg", "cup"), ("oz", "ml"),
        };
        var rng = new Random(43);
        var baseDate = new DateOnly(2027, 1, 1);

        for (int i = 0; i < 100; i++)
        {
            // Use a unique ingredient name per iteration to avoid cross-iteration interference
            // in the shared in-memory DB (different iterations may land on the same Monday).
            var name = $"p7ingredient{i:D3}";
            var (unit1, unit2) = unitPairs[rng.Next(unitPairs.Length)];
            var q1 = (double)rng.Next(1, 501);
            var q2 = (double)rng.Next(1, 501);

            var monday = UniqueMonday(baseDate, i * 7, 3000);

            // Both supply items in the same recipe on the same day
            await SeedRecipeWithSupplyAsync(monday, [(name, q1, unit1), (name, q2, unit2)]);

            await _service.RecomputeForWeekAsync(monday, CancellationToken.None);

            var items = await GetGroceryItemsAsync(monday);
            var normalizedName = IngredientNormalizer.Normalize(name);
            var matching = items.Where(x => x.NormalizedKey == normalizedName).ToList();
            var expectedUnit1 = UnitNormalizer.Normalize(unit1)?.CanonicalUnit ?? unit1;
            var expectedUnit2 = UnitNormalizer.Normalize(unit2)?.CanonicalUnit ?? unit2;

            Assert.Equal(2, matching.Count);
            var unitSet = matching.Select(x => x.UnitText).ToHashSet();
            Assert.Contains(expectedUnit1, unitSet);
            Assert.Contains(expectedUnit2, unitSet);
        }
    }

    // Feature: grocery-section-categorization, Property 8: recomputation determinism
    // For any set of recipes assigned to a week plan, computing grocery_items twice from
    // the same recipe set SHALL produce arrays that are identical when sorted by
    // (normalizedKey, unitText).
    // Validates: Requirements 5b.9, 6.5
    [Fact]
    public async Task P8_RecomputationIsDeterministic()
    {
        var units = new[] { "g", "kg", "ml", "cup", "pcs" };
        var rng = new Random(44);
        var baseDate = new DateOnly(2028, 1, 1);

        for (int i = 0; i < 50; i++)
        {
            var count = rng.Next(1, 5);
            var monday = UniqueMonday(baseDate, i * 7, 3000);

            // Use unique ingredient names per iteration to avoid cross-iteration interference
            var supplies = Enumerable.Range(0, count)
                .Select(j => ($"p8ingredient{i:D3}x{j}", (double?)rng.Next(1, 201), (string?)units[rng.Next(units.Length)]))
                .ToList();

            await SeedRecipeWithSupplyAsync(monday, supplies);

            // First computation
            await _service.RecomputeForWeekAsync(monday, CancellationToken.None);
            var first = (await GetGroceryItemsAsync(monday))
                .OrderBy(x => x.NormalizedKey).ThenBy(x => x.UnitText)
                .Select(x => $"{x.NormalizedKey}|{x.UnitText}|{x.Quantity}")
                .ToList();

            // Second computation (same data, no changes)
            await _service.RecomputeForWeekAsync(monday, CancellationToken.None);
            var second = (await GetGroceryItemsAsync(monday))
                .OrderBy(x => x.NormalizedKey).ThenBy(x => x.UnitText)
                .Select(x => $"{x.NormalizedKey}|{x.UnitText}|{x.Quantity}")
                .ToList();

            Assert.Equal(first, second);
        }
    }

    // Feature: grocery-section-categorization, Property 9: grocery state immutability
    // For any weekly_plans row with an existing grocery_state, calling
    // GroceryRecomputeService.RecomputeForWeekAsync SHALL leave grocery_state
    // byte-for-byte unchanged.
    // Validates: Requirements 5b.8
    [Fact]
    public async Task P9_GroceryStateIsNotMutatedByRecompute()
    {
        var groceryKeys = new[] { "Chicken", "Broccoli", "Onion", "Garlic", "Flour", "Milk", "Eggs", "Butter", "Rice", "Pasta" };
        var rng = new Random(45);
        var baseDate = new DateOnly(2029, 1, 1);

        for (int i = 0; i < 100; i++)
        {
            var monday = UniqueMonday(baseDate, i * 7, 3000);

            // Build a random grocery_state dict
            var count = rng.Next(0, 6);
            var stateDict = groceryKeys
                .OrderBy(_ => rng.Next())
                .Take(count)
                .ToDictionary(k => k, _ => rng.Next(2) == 0);
            var groceryStateJson = JsonSerializer.Serialize(stateDict);

            // Pre-create the weekly_plans row with the known grocery_state
            _db.WeeklyPlans.Add(new WeeklyPlan
            {
                Id = Guid.NewGuid(),
                WeekStartDate = monday,
                Status = WeeklyPlanStatus.Draft,
                GroceryState = groceryStateJson,
                GroceryItems = "[]",
            });
            await _db.SaveChangesAsync();

            // Seed a recipe so recompute has something to process
            await SeedRecipeWithSupplyAsync(monday, [("onion", 1.0, "pcs")]);

            // Act
            await _service.RecomputeForWeekAsync(monday, CancellationToken.None);

            // Assert: grocery_state is byte-for-byte unchanged
            var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == monday);
            Assert.Equal(groceryStateJson, plan.GroceryState);
        }
    }

    // ── Task 6: Balance Scoring Tests ─────────────────────────────────────────

    [Fact]
    public async Task BalanceScoring_WritesBalanceSummaryToWeeklyPlan()
    {
        // Arrange: create a recipe with a dietary profile
        var recipeId = Guid.NewGuid();
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: ["VegetablesAndFruits"],
            ProteinSource: "Poultry",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.95,
            Source: "llm",
            FopFlags: null
        );
        var profileJson = JsonSerializer.Serialize(profile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            RawMetadata = BuildRawMetadata([("chicken", 200.0, "g")]),
            DietaryProfile = profileJson,
        });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = TestMonday,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act
        await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        // Assert
        var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
        Assert.NotNull(plan.BalanceSummary);
        var summary = JsonSerializer.Deserialize<WeeklyBalanceSummary>(plan.BalanceSummary,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(summary);
        Assert.False(summary.IsBalanced); // Only 1 recipe, not balanced
    }

    [Fact]
    public async Task BalanceScoring_WithNullProfiles_ProducesUnbalancedSummary()
    {
        // Arrange: 7 recipes with null dietary_profile
        for (int i = 0; i < 7; i++)
        {
            var recipeId = Guid.NewGuid();
            _db.Recipes.Add(new Recipe
            {
                Id = recipeId,
                Name = $"Recipe {i}",
                RawMetadata = BuildRawMetadata([("ingredient", 100.0, "g")]),
                DietaryProfile = null,
            });
            _db.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = recipeId,
                Date = TestMonday.AddDays(i),
                Status = CalendarEventStatus.Planned,
            });
        }
        await _db.SaveChangesAsync();

        // Act
        await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        // Assert
        var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
        Assert.NotNull(plan.BalanceSummary);
        var summary = JsonSerializer.Deserialize<WeeklyBalanceSummary>(plan.BalanceSummary,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(summary);
        Assert.False(summary.IsBalanced);
        Assert.Equal(0, summary.ProteinDays);
        Assert.Equal(0, summary.VeggieDays);
    }

    [Fact]
    public async Task BalanceScoring_WrittenInSameSaveAsGroceryItems()
    {
        // Arrange: recipe with dietary profile
        var recipeId = Guid.NewGuid();
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: [],
            ProteinSource: "Poultry",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.95,
            Source: "llm",
            FopFlags: null
        );
        var profileJson = JsonSerializer.Serialize(profile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            RawMetadata = BuildRawMetadata([("chicken", 200.0, "g")]),
            DietaryProfile = profileJson,
        });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = TestMonday,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act
        await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        // Assert: both grocery_items and balance_summary are written
        var plan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
        Assert.NotNull(plan.GroceryItems);
        Assert.NotNull(plan.BalanceSummary);
    }

    [Fact]
    public async Task BalanceScoring_FirstRecompute_DoesNotEmitNudge()
    {
        // Arrange: mock publisher to capture calls
        var publisherMock = new Mock<IScheduleEventPublisher>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<GroceryRecomputeService>>();
        var aisleMapper = new AisleMapper();
        var service = new GroceryRecomputeService(_db, aisleMapper, logger, publisherMock.Object);

        var recipeId = Guid.NewGuid();
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: [],
            ProteinSource: "Poultry",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.95,
            Source: "llm",
            FopFlags: null
        );
        var profileJson = JsonSerializer.Serialize(profile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            RawMetadata = BuildRawMetadata([("chicken", 200.0, "g")]),
            DietaryProfile = profileJson,
        });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = TestMonday,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act
        await service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        // Assert: PublishDiscoveryNudgeAsync should NOT be called on first recompute
        publisherMock.Verify(
            p => p.PublishDiscoveryNudgeAsync(It.IsAny<string?>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task BalanceScoring_GroupReachesTarget_EmitsNudge()
    {
        // Arrange: create a weekly plan with a previous balance_summary where proteinDays = 2
        var previousSummary = new WeeklyBalanceSummary(
            ProteinDays: 2,
            VeggieDays: 0,
            GrainDays: 0,
            PlantProteinDays: 0,
            RedMeatDays: 0,
            MaxConsecutiveSame: 1,
            IsBalanced: false,
            Recommendations: ["Add more protein-rich meals this week (meat, fish, legumes, eggs)."],
            FopWeekSummary: new FopWeekSummary(0, 0, 0)
        );
        var previousJson = JsonSerializer.Serialize(previousSummary, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        var plan = new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = TestMonday,
            Status = WeeklyPlanStatus.Draft,
            BalanceSummary = previousJson,
        };
        _db.WeeklyPlans.Add(plan);

        // Add 3 protein recipes to reach the target
        for (int i = 0; i < 3; i++)
        {
            var recipeId = Guid.NewGuid();
            var profile = new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: [],
                ProteinSource: "Poultry",
                CuisineType: "Canadian",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            );
            var profileJson = JsonSerializer.Serialize(profile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            _db.Recipes.Add(new Recipe
            {
                Id = recipeId,
                Name = $"Protein Recipe {i}",
                RawMetadata = BuildRawMetadata([("chicken", 200.0, "g")]),
                DietaryProfile = profileJson,
            });
            _db.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = recipeId,
                Date = TestMonday.AddDays(i),
                Status = CalendarEventStatus.Planned,
            });
        }
        await _db.SaveChangesAsync();

        // Mock the publisher
        var publisherMock = new Mock<IScheduleEventPublisher>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<GroceryRecomputeService>>();
        var aisleMapper = new AisleMapper();
        var service = new GroceryRecomputeService(_db, aisleMapper, logger, publisherMock.Object);

        // Act
        await service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        // Assert: PublishDiscoveryNudgeAsync should be called
        publisherMock.Verify(
            p => p.PublishDiscoveryNudgeAsync(It.IsAny<string?>(), It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task BalanceScoring_SummaryUnchanged_DoesNotEmitNudge()
    {
        // Arrange: create a weekly plan with a previous balance_summary
        var previousSummary = new WeeklyBalanceSummary(
            ProteinDays: 3,
            VeggieDays: 4,
            GrainDays: 2,
            PlantProteinDays: 1,
            RedMeatDays: 0,
            MaxConsecutiveSame: 1,
            IsBalanced: true,
            Recommendations: [],
            FopWeekSummary: new FopWeekSummary(0, 0, 0)
        );
        var previousJson = JsonSerializer.Serialize(previousSummary, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        var plan = new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = TestMonday,
            Status = WeeklyPlanStatus.Draft,
            BalanceSummary = previousJson,
        };
        _db.WeeklyPlans.Add(plan);

        // Add recipes that produce the same summary
        var profiles = new[]
        {
            new RecipeDietaryProfile("ProteinFoods", [], "Poultry", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "Poultry", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "Poultry", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", [], "None", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", [], "None", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", [], "None", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", ["WholeGrains"], "None", "Canadian", ["Dinner"], "Dinner", true, 0.95, "llm", null),
        };

        for (int i = 0; i < profiles.Length; i++)
        {
            var recipeId = Guid.NewGuid();
            var profileJson = JsonSerializer.Serialize(profiles[i], new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            _db.Recipes.Add(new Recipe
            {
                Id = recipeId,
                Name = $"Recipe {i}",
                RawMetadata = BuildRawMetadata([("ingredient", 100.0, "g")]),
                DietaryProfile = profileJson,
            });
            _db.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = recipeId,
                Date = TestMonday.AddDays(i),
                Status = CalendarEventStatus.Planned,
            });
        }
        await _db.SaveChangesAsync();

        // Mock the publisher
        var publisherMock = new Mock<IScheduleEventPublisher>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<GroceryRecomputeService>>();
        var aisleMapper = new AisleMapper();
        var service = new GroceryRecomputeService(_db, aisleMapper, logger, publisherMock.Object);

        // Act
        await service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        // Assert: PublishDiscoveryNudgeAsync should NOT be called
        publisherMock.Verify(
            p => p.PublishDiscoveryNudgeAsync(It.IsAny<string?>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task BalanceScoring_GroceryStateUnchanged()
    {
        // Arrange: create a weekly plan with a grocery_state
        var groceryState = new Dictionary<string, bool> { ["Chicken"] = true, ["Broccoli"] = false };
        var groceryStateJson = JsonSerializer.Serialize(groceryState);

        var plan = new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = TestMonday,
            Status = WeeklyPlanStatus.Draft,
            GroceryState = groceryStateJson,
            GroceryItems = "[]",
        };
        _db.WeeklyPlans.Add(plan);

        var recipeId = Guid.NewGuid();
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: [],
            ProteinSource: "Poultry",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.95,
            Source: "llm",
            FopFlags: null
        );
        var profileJson = JsonSerializer.Serialize(profile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            RawMetadata = BuildRawMetadata([("chicken", 200.0, "g")]),
            DietaryProfile = profileJson,
        });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = TestMonday,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act
        await _service.RecomputeForWeekAsync(TestMonday, CancellationToken.None);

        // Assert: grocery_state is unchanged
        var updatedPlan = await _db.WeeklyPlans.FirstAsync(p => p.WeekStartDate == TestMonday);
        Assert.Equal(groceryStateJson, updatedPlan.GroceryState);
    }
}
