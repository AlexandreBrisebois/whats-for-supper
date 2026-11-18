using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public class SupperIngredientPreviewPostgresTests(ITestOutputHelper output)
{
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    private static RecipeIngredientLineDto Line(string description, string? amount, string? unit = null, string? shoppingName = null, RecipePackageDto? package = null) => new()
    {
        Id = Guid.NewGuid(),
        Description = description,
        Amount = amount is null ? null : QuantityMath.Parse(amount),
        AmountText = amount,
        Unit = unit is null ? null : new(unit, null),
        Scaling = "proportional",
        Package = package,
        Shopping = new(shoppingName ?? description, null, null),
        Provenance = new("source", "source-v1", [])
    };

    private static string BuildCanonical(int? basis, params RecipeIngredientLineDto[] lines) =>
        JsonSerializer.Serialize(new CanonicalRecipeContent(2, Guid.NewGuid().ToString("N"), "source-v1", basis, lines, []), WebJson);

    private static Recipe Recipe(int? basis = 2)
    {
        var lines = new[]
        {
            Line("pasta", "200", "g"),
            Line("Salt to taste", null)
        };
        return new()
        {
            Name = "Preview pasta",
            Servings = basis,
            IsReady = true,
            Ingredients = "[\"200 g pasta\",\"Salt to taste\"]",
            RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\",\"Salt to taste\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"},{\"name\":\"Salt to taste\"}]}",
            CanonicalContent = BuildCanonical(basis, lines)
        };
    }

    internal static Recipe LegacyShells()
    {
        string[] lines = ["12 coquilles géantes", "1 oignon haché", "450 g Bœuf haché mi-maigre", "500 ml Sauce marinara", "80 ml Parmesan râpé", "30 ml d'huile d'olive", "30 ml de basilic haché", "sel", "poivre"];
        string[] names = ["coquilles géantes", "oignon haché", "Bœuf haché mi-maigre", "Sauce marinara", "Parmesan râpé", "huile d'olive", "basilic haché"];
        double[] amounts = [12, 1, 450, 500, 80, 30, 30];
        string?[] units = [null, null, "g", "ml", "ml", "ml", "ml"];
        var canonicalLines = new[]
        {
            Line("coquilles géantes", "12"),
            Line("oignon haché", "1"),
            Line("Bœuf haché mi-maigre", "450", "g"),
            Line("Sauce marinara", "500", "ml"),
            Line("Parmesan râpé", "80", "ml"),
            Line("d'huile d'olive", "30", "ml", "huile d'olive"),
            Line("de basilic haché", "30", "ml", "basilic haché"),
            Line("sel", null),
            Line("poivre", null)
        };
        return new Recipe {
            Name = "Coquilles farcies au bœuf", IsReady = true, Servings = 4,
            Ingredients = JsonSerializer.Serialize(lines),
            RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = lines,
                supply = names.Select((name, i) => new { name, requiredQuantity = new { value = amounts[i], unitText = units[i] } }) }),
            CanonicalContent = BuildCanonical(4, canonicalLines)
        };
    }

    [Theory]
    [InlineData(2)]
    [InlineData(4)]
    [InlineData(6)]
    public async Task Preview_LegacyShellsScalesVerifiedLinesWithoutInventingSeasonings(int target)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = LegacyShells(); db.Recipes.Add(recipe); await db.SaveChangesAsync();
        var original = recipe.Ingredients; var metadata = recipe.RawMetadata;
        using var client = factory.CreateAuthenticatedClient();
        using var doc = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-preview?targetServings={target}"));
        var root = doc.RootElement; var lines = root.GetProperty("lines");
        Assert.Equal("scaled", root.GetProperty("status").GetString());
        double[] amounts = [12, 1, 450, 500, 80, 30, 30];
        for (var i = 0; i < amounts.Length; i++) {
            Assert.Equal(amounts[i] * target / 4, lines[i].GetProperty("quantity").GetDouble());
            Assert.Equal("scaled", lines[i].GetProperty("status").GetString());
        }
        foreach (var i in new[] { 7, 8 }) {
            Assert.Equal(JsonValueKind.Null, lines[i].GetProperty("quantity").ValueKind);
            Assert.Equal("unquantified", lines[i].GetProperty("status").GetString());
        }
        db.ChangeTracker.Clear();
        var saved = await db.Recipes.SingleAsync(); Assert.Equal(original, saved.Ingredients); Assert.Equal(metadata, saved.RawMetadata);
        Assert.Empty(await db.SupperServings.ToListAsync()); Assert.Empty(await db.WorkflowInstances.ToListAsync());
    }

    [Fact]
    public async Task Preview_PopulatedRecipeWithoutCanonicalContentFailsClosed_AndEmptyPlaceholderProjectsEmpty()
    {
        Assert.Empty(SupperIngredientProjection.Read(new Recipe { Name = "Pending", IsReady = false }, 4));

        var legacy = new Recipe
        {
            Name = "Unmigrated pasta",
            Servings = 4,
            IsReady = true,
            Ingredients = "[\"200 g pasta\"]",
            RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}"
        };
        Assert.Throws<InvalidDataException>(() => SupperIngredientProjection.Read(legacy, 4));
        Assert.Throws<InvalidDataException>(() => SupperIngredientProjection.Read(
            new Recipe { Name = "Supply only", RawMetadata = "{\"supply\":[{\"name\":\"pasta\",\"quantity\":200}]}" }, 4));

        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var placeholder = new Recipe { Name = "Pending", IsReady = false };
        db.Recipes.AddRange(legacy, placeholder);
        await db.SaveChangesAsync();

        using var client = factory.CreateAuthenticatedClient();
        var emptyReply = await client.GetAsync($"/api/recipes/{placeholder.Id}/ingredient-preview?targetServings=4");
        Assert.Equal(HttpStatusCode.OK, emptyReply.StatusCode);
        using var emptyDoc = JsonDocument.Parse(await emptyReply.Content.ReadAsStringAsync());
        Assert.Equal(0, emptyDoc.RootElement.GetProperty("lines").GetArrayLength());

        var failReply = await client.GetAsync($"/api/recipes/{legacy.Id}/ingredient-preview?targetServings=4");
        Assert.Equal(HttpStatusCode.InternalServerError, failReply.StatusCode);
    }

    [Fact]
    public void Preview_CanonicalLinesIgnoreRetainedRawMetadataSupplyAndMissingBasisRemainsUnresolved()
    {
        var package = new RecipePackageDto(new("cans", null), new(QuantityMath.Parse("400")!, new("g", null)), "net");
        var linesInput = new[]
        {
            Line("cafe\u0301", "10", "g"),
            Line("tomatoes", "2", "cans", package: package),
            Line("salt to taste", null)
        };
        var recipe = new Recipe
        {
            Servings = 4,
            Ingredients = "[\"999 kg completely different legacy text\"]",
            RawMetadata = JsonSerializer.Serialize(new
            {
                recipeIngredient = new[] { "999 kg stale" },
                supply = new[] { new { name = "stale", quantity = 999, unitText = "kg" } }
            }),
            CanonicalContent = BuildCanonical(4, linesInput)
        };

        var lines = SupperIngredientProjection.Read(recipe, 6);
        Assert.Equal(15d, lines[0].Quantity);
        Assert.Empty(lines[0].Issues);
        Assert.Equal(3d, lines[1].Quantity);
        Assert.Contains("400 g", lines[1].OriginalText);
        Assert.Null(lines[2].Quantity);
        Assert.Equal("unquantified", lines[2].Status);

        recipe.CanonicalContent = BuildCanonical(null, linesInput);
        recipe.Servings = null;
        var missingBasis = SupperIngredientProjection.Read(recipe, 6);
        Assert.Equal("unresolved", missingBasis[0].Status);
        Assert.Equal(["missing_basis"], missingBasis[0].Issues);
        Assert.Null(missingBasis[0].Quantity);
        Assert.Equal("unquantified", missingBasis[2].Status);
    }

    [Fact]
    public async Task Preview_UsesSharedAmountsAndContainsNoDatedAuthority()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = Recipe(); db.Recipes.Add(recipe); await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient();
        var reply = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredient-preview?targetServings=4");
        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        using var doc = JsonDocument.Parse(await reply.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        Assert.Equal(2, root.GetProperty("baseServings").GetInt32());
        Assert.Equal(4, root.GetProperty("targetServings").GetInt32());
        Assert.Equal(2, root.GetProperty("factor").GetDouble());
        Assert.Equal(400, root.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
        Assert.Equal("unquantified", root.GetProperty("lines")[1].GetProperty("status").GetString());
        Assert.False(string.IsNullOrEmpty(root.GetProperty("version").GetString()));
        foreach (var field in new[] { "supperDate", "occurrenceId", "servingVersion", "preparation", "preparationPlanToken", "preparationServingVersion", "editable" })
            Assert.False(root.TryGetProperty(field, out _), field);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?targetServings=0")]
    [InlineData("?targetServings=5")]
    [InlineData("?targetServings=2.5")]
    [InlineData("?targetServings=nonsense")]
    public async Task Preview_RejectsUnsupportedTargets(string query)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateAuthenticatedClient();
        var reply = await client.GetAsync($"/api/recipes/{Guid.NewGuid()}/ingredient-preview{query}");
        Assert.Equal(HttpStatusCode.BadRequest, reply.StatusCode);
    }

    [Fact]
    public async Task Preview_UnknownRecipeIsNotFound()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/recipes/{Guid.NewGuid()}/ingredient-preview?targetServings=2")).StatusCode);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Preview_Postgres_LegacyAlignmentMatchesDatedCookingAndGroceryContributions()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = LegacyShells(); var date = new DateOnly(2026, 10, 14);
            var occurrence = new CalendarEvent { Date = date, RecipeId = recipe.Id, Status = CalendarEventStatus.Planned };
            db.Recipes.Add(recipe); db.CalendarEvents.Add(occurrence);
            db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 6 }) });
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 12), default);
            using var client = factory.CreateAuthenticatedClient();
            using var preview = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-preview?targetServings=6"));
            using var assigned = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=assigned&occurrenceId={occurrence.Id}"));
            Assert.Equal(preview.RootElement.GetProperty("lines").GetRawText(), assigned.RootElement.GetProperty("lines").GetRawText());
            Assert.Equal("scaled", assigned.RootElement.GetProperty("status").GetString());
            var items = JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>((await db.WeeklyPlans.SingleAsync()).GroceryItems!)!;
            var beef = items.Single(x => x.UnitText == "g"); Assert.Equal(675d, beef.Quantity); Assert.True(beef.QuantityComplete);
            Assert.All(items.Where(x => x.DisplayName is "sel" or "poivre"), item => { Assert.Null(item.Quantity); Assert.False(item.QuantityComplete); });
            // Explicit preparation keeps its frozen target when the shared usual later changes.
            occurrence.Status = CalendarEventStatus.Cooked; occurrence.PreparedOn = date.AddDays(-1); occurrence.PreparedAtUtc = DateTimeOffset.Parse("2026-10-13T12:00:00Z");
            occurrence.PreparedServings = 7; occurrence.PreparedOriginalServings = 4;
            var setting = await db.FamilySettings.SingleAsync(x => x.Key == SupperServingsService.DefaultKey);
            setting.Value = JsonSerializer.SerializeToElement(new { servings = 4 }); await db.SaveChangesAsync();
            using var prepared = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=assigned&occurrenceId={occurrence.Id}"));
            Assert.Equal(7, prepared.RootElement.GetProperty("targetServings").GetInt32());
            Assert.Equal(787.5, prepared.RootElement.GetProperty("lines")[2].GetProperty("quantity").GetDouble());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Preview_Postgres_RepeatedReadsPreserveSavedCountsPreparedSnapshotsGroceriesAndJobs()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = Recipe(); db.Recipes.Add(recipe);
            var date = new DateOnly(2026, 10, 16);
            db.CalendarEvents.Add(new CalendarEvent {
                Date = date, RecipeId = recipe.Id, Status = CalendarEventStatus.Cooked,
                PreparedOn = date.AddDays(-3), PreparedAtUtc = new DateTimeOffset(2026, 10, 13, 12, 0, 0, TimeSpan.Zero),
                PreparedServings = 7, PreparedOriginalServings = 2,
                PreparationPlanToken = "prepared-plan", PreparationServingVersion = "prepared-ingredients"
            });
            db.SupperServings.Add(new SupperServing { Date = date, OverrideServings = 5 });
            db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = date.AddDays(-4), GroceryState = "{\"pasta\":true}", GroceryItems = "[]" });
            await db.SaveChangesAsync();
            async Task<string> Snapshot() {
                db.ChangeTracker.Clear();
                return JsonSerializer.Serialize(new {
                    recipes = await db.Recipes.AsNoTracking().Select(x => new { x.Id, x.Servings, x.Ingredients, x.RawMetadata, x.CanonicalContent, x.LastCookedDate, x.UpdatedAt }).ToListAsync(),
                    events = await db.CalendarEvents.AsNoTracking().Select(x => new { x.Id, x.Date, x.RecipeId, x.Status, x.PreparedOn, x.PreparedAtUtc, x.PreparedServings, x.PreparedOriginalServings, x.PreparationPlanToken, x.PreparationServingVersion }).ToListAsync(),
                    counts = await db.SupperServings.AsNoTracking().ToListAsync(),
                    defaults = await db.FamilySettings.AsNoTracking().ToListAsync(),
                    groceries = await db.WeeklyPlans.AsNoTracking().Select(x => new { x.GroceryItems, x.GroceryState, x.ServingRefreshStatus, x.ServingInputVersion, x.ServingAppliedVersion }).ToListAsync(),
                    jobs = await db.WorkflowTasks.AsNoTracking().Select(x => new { x.TaskId, x.Status }).ToListAsync()
                });
            }
            var before = await Snapshot();
            using var client = factory.CreateAuthenticatedClient();
            foreach (var target in new[] { 2, 6, 4, 2, 4, 6 }) {
                using var doc = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-preview?targetServings={target}"));
                Assert.Equal(target * 100, doc.RootElement.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
                Assert.Equal(before, await Snapshot());
            }
            var saved = await db.Recipes.SingleAsync();
            saved.Servings = null;
            saved.CanonicalContent = BuildCanonical(null, CanonicalRecipeContentStore.Read(saved)!.IngredientLines.ToArray());
            await db.SaveChangesAsync();
            using var missing = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-preview?targetServings=4"));
            Assert.Equal(JsonValueKind.Null, missing.RootElement.GetProperty("factor").ValueKind);
            Assert.Equal("unresolved", missing.RootElement.GetProperty("status").GetString());
            Assert.Equal("200 g pasta", missing.RootElement.GetProperty("lines")[0].GetProperty("originalText").GetString());
            saved.Servings = 2;
            saved.Ingredients = "[\"Changed pasta\",\"Salt to taste\"]";
            saved.CanonicalContent = BuildCanonical(2, Line("Changed pasta", null), Line("Salt to taste", null));
            await db.SaveChangesAsync();
            using var stale = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-preview?targetServings=6"));
            Assert.Equal("scaled", stale.RootElement.GetProperty("status").GetString());
            Assert.Equal("unquantified", stale.RootElement.GetProperty("lines")[0].GetProperty("status").GetString());
            Assert.Equal("Changed pasta", stale.RootElement.GetProperty("lines")[0].GetProperty("originalText").GetString());
            Assert.Empty(stale.RootElement.GetProperty("lines")[0].GetProperty("issues").EnumerateArray());
            Assert.Equal(JsonValueKind.Null, stale.RootElement.GetProperty("lines")[0].GetProperty("quantity").ValueKind);
            Assert.Equal(7, (await db.CalendarEvents.SingleAsync()).PreparedServings);
        });
    }
}
