using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Integration;
using Xunit;

namespace RecipeApi.Tests.Services;

[CollectionDefinition("StartupMigrationPerformance", DisableParallelization = true)]
public sealed class StartupMigrationPerformanceCollection;

[Collection("StartupMigrationPerformance")]
public sealed class BilingualStartupMigrationTests
{
    private sealed record SeedRecipeFile(
        Guid Id,
        string? Name,
        string? Description,
        string? TotalTime,
        string? SourceUrl,
        int ImageCount,
        bool IsSynthesized,
        bool IsDiscoverable,
        bool RotationHumanOff,
        string? RotationSource,
        bool CookedSuppressed,
        bool? SupperSuitable,
        bool IsReady,
        string? Category,
        string? CuisineType,
        string[]? MealTypes,
        bool? IsVegetarian,
        string? RawMetadata,
        string? Ingredients,
        int? Servings,
        DateTimeOffset? DeletedAt,
        Guid? DeletedBy,
        string? DeleteNote,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt,
        DateTimeOffset? LastCookedDate,
        int FinishedDishIndex);

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task MigrateAsync_UpgradesAll198SampleRecipesInUnderTwoSecondsAndIsIdempotent()
    {
        var fixturePath = Path.Combine(
            DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/legacy-sample-recipes-198.json");
        var items = JsonSerializer.Deserialize<SeedRecipeFile[]>(await File.ReadAllTextAsync(fixturePath), Json)!;
        Assert.Equal(198, items.Length);

        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["Tests:LocalRecipeStore"] = "true"
        });

        using (var seedScope = factory.Services.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            foreach (var item in items)
            {
                db.Recipes.Add(new Recipe
                {
                    Id = item.Id,
                    Name = item.Name,
                    Description = item.Description,
                    TotalTime = item.TotalTime,
                    SourceUrl = item.SourceUrl,
                    ImageCount = item.ImageCount,
                    IsSynthesized = item.IsSynthesized,
                    IsDiscoverable = item.IsDiscoverable,
                    RotationHumanOff = item.RotationHumanOff,
                    RotationSource = item.RotationSource ?? "Unknown",
                    CookedSuppressed = item.CookedSuppressed,
                    SupperSuitable = item.SupperSuitable,
                    IsReady = item.IsReady,
                    Category = item.Category,
                    CuisineType = item.CuisineType,
                    MealTypes = item.MealTypes,
                    IsVegetarian = item.IsVegetarian,
                    RawMetadata = item.RawMetadata,
                    Ingredients = item.Ingredients,
                    Servings = item.Servings,
                    DeletedAt = item.DeletedAt,
                    DeletedBy = item.DeletedBy,
                    DeleteNote = item.DeleteNote,
                    CreatedAt = item.CreatedAt,
                    UpdatedAt = item.UpdatedAt,
                    LastCookedDate = item.LastCookedDate,
                    FinishedDishIndex = item.FinishedDishIndex
                });
            }
            await db.SaveChangesAsync();

            var seeder = seedScope.ServiceProvider.GetRequiredService<FoodVocabularySeeder>();
            await seeder.EnsureSeededAsync();
        }

        RecipeStartupMigrationResult result;
        using (var migrateScope = factory.Services.CreateScope())
        {
            var migrator = migrateScope.ServiceProvider.GetRequiredService<RecipeStartupMigrator>();
            result = await migrator.MigrateAsync();
        }

        Assert.Equal(198, result.MigratedRecipes);
        Assert.True(result.ElapsedMilliseconds < 2000, $"Expected migration under 2000 ms, took {result.ElapsedMilliseconds} ms.");

        using (var verifyScope = factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var vocabulary = verifyScope.ServiceProvider.GetRequiredService<FoodVocabularyStore>();
            var authority = await vocabulary.CaptureAuthorityAsync(null);
            var migrated = await db.Recipes.IgnoreQueryFilters().AsNoTracking().ToListAsync();
            Assert.Equal(198, migrated.Count);

            var mappedLines = 0;
            foreach (var recipe in migrated)
            {
                var content = CanonicalRecipeContentStore.Read(recipe);
                Assert.NotNull(content);
                Assert.Equal(2, content.ContentSchemaVersion);
                Assert.NotNull(recipe.FoodMappingEvidence);
                _ = RecipeExportContent.WriteCurrent(new CanonicalRecipeExport(recipe.Id, content, null));
                FoodMappingQualification.Validate(content, recipe.FoodMappingEvidence, authority, recipe.Id);
                mappedLines += content.IngredientLines.Count(line => line.Shopping.FoodId is not null);
            }

            Assert.True(mappedLines >= 1000, $"Expected >= 1000 mapped lines across 198 recipes, found {mappedLines}.");

            var secondRun = await verifyScope.ServiceProvider.GetRequiredService<RecipeStartupMigrator>().MigrateAsync();
            Assert.Equal(0, secondRun.MigratedRecipes);
            Assert.Equal(0, secondRun.RecomputedWeeks);
        }
    }

    [Fact]
    public async Task MigrateAsync_DiscoversStepBindingsAndRecomputesUnifiedBilingualWeekWhilePreservingExtrasAndOverrides()
    {
        var monday = new DateOnly(2026, 11, 16);
        var enId = Guid.NewGuid();
        var frId = Guid.NewGuid();
        var extraId = Guid.NewGuid();
        var onionFoodId = Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee");

        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["Tests:LocalRecipeStore"] = "true"
        });

        using (var setupScope = factory.Services.CreateScope())
        {
            var services = setupScope.ServiceProvider;
            await services.GetRequiredService<FoodVocabularySeeder>().EnsureSeededAsync();

            var db = services.GetRequiredService<RecipeDbContext>();
            var now = services.GetRequiredService<IClock>().UtcNow;

            db.Recipes.AddRange(
                new Recipe
                {
                    Id = enId,
                    Name = "English Onion Soup",
                    Servings = 4,
                    IsReady = true,
                    Ingredients = JsonSerializer.Serialize(new[] { "2 onions", "30 ml olive oil", "200 ml water" }),
                    RawMetadata = JsonSerializer.Serialize(new
                    {
                        name = "English Onion Soup",
                        recipeYield = "4 servings",
                        recipeIngredient = new[] { "2 onions", "30 ml olive oil", "200 ml water" },
                        recipeInstructions = new[] { new { text = "Add all 200 ml water." } }
                    }),
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Recipe
                {
                    Id = frId,
                    Name = "Poêlée aux oignons",
                    Servings = 4,
                    IsReady = true,
                    Ingredients = JsonSerializer.Serialize(new[] { "3 oignons", "15 ml huile d'olive" }),
                    RawMetadata = JsonSerializer.Serialize(new
                    {
                        name = "Poêlée aux oignons",
                        recipeYield = "4 portions",
                        recipeIngredient = new[] { "3 oignons", "15 ml huile d'olive" },
                        recipeInstructions = new[] { new { text = "Mélanger." } }
                    }),
                    CreatedAt = now,
                    UpdatedAt = now
                });

            db.SupperServings.AddRange(
                new SupperServing { Date = monday, OverrideServings = 4, Version = Guid.NewGuid(), CreatedAt = now, UpdatedAt = now },
                new SupperServing { Date = monday.AddDays(1), OverrideServings = 4, Version = Guid.NewGuid(), CreatedAt = now, UpdatedAt = now });

            db.CalendarEvents.AddRange(
                new CalendarEvent { Id = Guid.NewGuid(), Date = monday, MealSlot = 0, RecipeId = enId, Status = CalendarEventStatus.Planned },
                new CalendarEvent { Id = Guid.NewGuid(), Date = monday.AddDays(1), MealSlot = 0, RecipeId = frId, Status = CalendarEventStatus.Planned });

            db.WeeklyPlans.Add(new WeeklyPlan
            {
                Id = Guid.NewGuid(),
                WeekStartDate = monday,
                Status = WeeklyPlanStatus.Draft,
                GroceryItems = JsonSerializer.Serialize(new[] { new { displayName = "2 onions", normalizedKey = "2 onions", section = "Produce" } }),
                GroceryState = JsonSerializer.Serialize(new Dictionary<string, bool> { ["2 onions"] = true }),
                GroceryListVersion = "1",
                CreatedAt = now
            });

            db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(
                extraId, extraId, monday, "Coffee", "Coffee", "Beverages", now));

            var seededVocab = await services.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync();
            Assert.NotNull(seededVocab);
            db.HouseholdFoodOverrides.Add(new HouseholdFoodOverride
            {
                Id = Guid.NewGuid(),
                Revision = Guid.NewGuid().ToString("D"),
                FoodId = onionFoodId,
                DictionaryRevision = seededVocab.Reference.Revision,
                DocumentRevision = seededVocab.Reference.Revision,
                DocumentSha256 = seededVocab.Reference.Sha256,
                GrocerySection = "Bakery",
                ProtectedFields = ["grocerySection"],
                PresentationSequence = "1",
                CreatedAt = now,
                UpdatedAt = now
            });

            await db.SaveChangesAsync();
        }

        using (var migrateScope = factory.Services.CreateScope())
        {
            var migrator = migrateScope.ServiceProvider.GetRequiredService<RecipeStartupMigrator>();
            var outcome = await migrator.MigrateAsync();
            Assert.Equal(2, outcome.MigratedRecipes);
            Assert.Equal(1, outcome.RecomputedWeeks);
        }

        using (var verifyScope = factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var enRecipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == enId);
            var enContent = CanonicalRecipeContentStore.Read(enRecipe)!;
            Assert.Equal(2, enContent.ContentSchemaVersion);
            var step = Assert.Single(enContent.InstructionSections.SelectMany(x => x.Steps));
            Assert.NotEmpty(step.Bindings);

            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems, Json)!;

            var onionRow = Assert.Single(rows, r => r.FoodId == onionFoodId);
            Assert.Equal(5, onionRow.Quantity);
            Assert.Equal("Bakery", onionRow.Section);
            Assert.Equal(2, onionRow.RecipeIds.Count);

            var oilRow = Assert.Single(rows, r => r.UnitText == "ml" && r.FoodId is not null && r.FoodId != onionFoodId && r.Quantity == 45);
            Assert.Equal(2, oilRow.RecipeIds.Count);

            Assert.Single(rows, r => r.UnitText == "ml" && r.Quantity == 200);
            Assert.Equal(2, await db.CalendarEvents.CountAsync());
            var extra = await db.GroceryExtraOccurrences.SingleAsync(x => x.Id == extraId);
            Assert.Equal("Coffee", extra.Name);
        }
    }
}
