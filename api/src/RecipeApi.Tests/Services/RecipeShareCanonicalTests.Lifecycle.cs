using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeShareCanonicalTests
{
    [Fact]
    public async Task SharedRecipe_OrdinaryEditReadScheduleAndExplicitClearRetainMediaAndOneDemand()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
            new Integration.DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T16:00:00Z") },
            new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:LocalRecipeStore"] = "true" });
        await QualifySharedLifecycleAsync(factory);
    }

    internal static async Task QualifySharedLifecycleAsync(TestWebApplicationFactory factory)
    {
        using var client = factory.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        var id = Guid.NewGuid();
        var bundle = new
        {
            version = "1.0",
            recipe = new { name = "Shared pasta", ingredients = new[] { "200 g pasta", "salt to taste" },
                instructions = new[] { new { name = "Cook", itemListElement = new[] { new { text = "Cook the pasta for 10 minutes." } } } },
                sourceUrl = "https://example.test/shared", isSynthesized = false },
            info = new { bundleSource = "wfs-share", recipeId = id, exportedAtUtc = DateTimeOffset.UtcNow },
            hero = new { mimeType = "image/webp", base64 = Convert.ToBase64String([1, 2, 3]) },
            originals = new[] { new { mimeType = "image/png", base64 = Convert.ToBase64String([4, 5, 6]) } }
        };
        using var imported = await client.PostAsJsonAsync("/api/recipes/import-bundle", bundle);
        Assert.Equal(HttpStatusCode.Created, imported.StatusCode);
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var originalRaw = recipe.RawMetadata;
        var original = CanonicalRecipeContentStore.Read(recipe)!;
        var originalLines = original.IngredientLines.Select(x => x.Id).ToArray();
        var originalStep = Assert.Single(Assert.Single(original.InstructionSections).Steps);
        Assert.Null(original.Servings);
        Assert.All(original.IngredientLines, line => Assert.Null(line.Amount));

        object Edit(CanonicalRecipeContent baseline, bool clear) => new
        {
            expectedContentRevision = baseline.ContentRevision, servings = 4,
            ingredientLines = baseline.IngredientLines.Select((line, index) => new
            {
                id = line.Id, description = index == 0 ? "pasta" : line.Description,
                amount = index == 0 && !clear ? LegacyGroceryQuantity.Parse("250") : null,
                amountText = index == 0 && !clear ? "250" : null,
                unit = index == 0 ? new RecipeUnitDto("g", null) : null,
                scaling = line.Scaling, package = line.Package,
                shopping = index == 0 ? new RecipeShoppingAssociationDto("pasta", null, null) : line.Shopping
            }).ToArray()
        };
        using var saved = await client.PatchAsJsonAsync($"/api/recipes/{id}", Edit(original, clear: false));
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        db.ChangeTracker.Clear();
        var corrected = CanonicalRecipeContentStore.Read(await db.Recipes.SingleAsync(x => x.Id == id))!;
        Assert.Equal(originalLines, corrected.IngredientLines.Select(x => x.Id));
        Assert.Equal(LegacyGroceryQuantity.Parse("250"), corrected.IngredientLines[0].Amount);
        Assert.Equal("human", corrected.IngredientLines[0].Provenance.Origin);
        Assert.Equal(original.SourceRevision, corrected.SourceRevision);
        Assert.Equal(originalStep.Text, Assert.Single(Assert.Single(corrected.InstructionSections).Steps).Text);
        Assert.Equal(originalStep.Id, Assert.Single(Assert.Single(corrected.InstructionSections).Steps).Id);

        const string week = "2026-10-12";
        var portions = (await client.GetFromJsonAsync<JsonElement>($"/api/schedule/servings?weekOffset=0&referenceWeekStartDate={week}")).GetProperty("data");
        using var chosen = await client.PutAsJsonAsync("/api/schedule/servings", new
        {
            referenceWeekStartDate = week, weekOffset = 0, expectedVersion = portions.GetProperty("version").GetString(),
            days = new[] { new { date = week, servings = 8 } }
        });
        Assert.Equal(HttpStatusCode.OK, chosen.StatusCode);
        using var assigned = await client.PostAsJsonAsync($"/api/schedule/assign?referenceWeekStartDate={week}",
            new { weekOffset = 0, dayIndex = 0, recipeId = id, requireEmpty = true });
        Assert.Equal(HttpStatusCode.OK, assigned.StatusCode);
        await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 12), default);
        var schedule = (await client.GetFromJsonAsync<JsonElement>($"/api/schedule?weekOffset=0&referenceWeekStartDate={week}")).GetProperty("data");
        var rows = schedule.GetProperty("groceryItems").EnumerateArray().Where(row => row.GetProperty("recipeIds").EnumerateArray().Any(value => value.GetGuid() == id)).ToArray();
        Assert.Equal(2, rows.Length);
        var pasta = Assert.Single(rows, row => row.GetProperty("normalizedKey").GetString() == "pasta");
        Assert.Equal("500", pasta.GetProperty("quantity").GetProperty("value").GetProperty("n").GetString());
        Assert.Equal("1", pasta.GetProperty("quantity").GetProperty("value").GetProperty("d").GetString());
        var occurrence = await db.CalendarEvents.AsNoTracking().SingleAsync(x => x.RecipeId == id);

        using var cleared = await client.PatchAsJsonAsync($"/api/recipes/{id}", Edit(corrected, clear: true));
        Assert.Equal(HttpStatusCode.OK, cleared.StatusCode);
        await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 12), default);
        db.ChangeTracker.Clear();
        var after = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var current = CanonicalRecipeContentStore.Read(after)!;
        Assert.Null(current.IngredientLines[0].Amount);
        Assert.Null(current.IngredientLines[0].AmountText);
        Assert.Contains("amount", current.IngredientLines[0].Provenance.ProtectedFields);
        Assert.Equal(originalLines, current.IngredientLines.Select(x => x.Id));
        Assert.Equal(originalRaw, after.RawMetadata);
        Assert.Equal(occurrence.Id, (await db.CalendarEvents.SingleAsync(x => x.RecipeId == id)).Id);
        var finalSchedule = (await client.GetFromJsonAsync<JsonElement>($"/api/schedule?weekOffset=0&referenceWeekStartDate={week}")).GetProperty("data");
        var finalPasta = Assert.Single(finalSchedule.GetProperty("groceryItems").EnumerateArray(), row => row.GetProperty("normalizedKey").GetString() == "pasta");
        Assert.Equal(JsonValueKind.Null, finalPasta.GetProperty("quantity").ValueKind);
        using var read = await client.GetAsync($"/api/recipes/{id}");
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        Assert.Equal([4, 5, 6], await client.GetByteArrayAsync($"/api/recipes/{id}/original/0"));
        Assert.Equal([1, 2, 3], await services.GetRequiredService<RecipeRepository>().StorageProvider.LoadAsync("recipes", $"{id}/hero.webp"));
        Assert.Single(await db.RecipeFilePublications.Where(x => x.RecipeId == id).ToListAsync());
        Assert.Equal(2, await db.CanonicalRecipeOperations.CountAsync(x => x.RecipeId == id));
    }
}
