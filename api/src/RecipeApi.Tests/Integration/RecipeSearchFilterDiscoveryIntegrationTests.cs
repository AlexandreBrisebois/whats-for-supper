using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class RecipeSearchFilterDiscoveryIntegrationTests
{
    [Fact]
    public async Task GetFilters_ServesConfiguredDefinitionsAndLatestMaterializedCuisineState()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["RecipeSearchFilters:Main:0:Id"] = "taco-night",
            ["RecipeSearchFilters:Main:0:Concept"] = "tacos",
            ["RecipeSearchFilters:Main:0:Label"] = "Taco night",
            ["RecipeSearchFilters:Main:1:Id"] = "fish",
            ["RecipeSearchFilters:Main:1:Concept"] = "fish dishes"
        });
        var generatedAt = new DateTimeOffset(2026, 9, 18, 6, 0, 0, TimeSpan.Zero);
        await AddStateAsync(factory, generatedAt, "{\"promoted\":[\"Japanese\"],\"all\":[\"Italian\",\"Japanese\"]}");

        var response = await factory.CreateClient().GetAsync("/api/recipes/search/filters");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = body.RootElement;
        Assert.Equal(generatedAt, root.GetProperty("generatedAt").GetDateTimeOffset());
        Assert.Equal(["taco-night", "fish"], root.GetProperty("main").EnumerateArray().Select(item => item.GetProperty("id").GetString()));
        Assert.Equal("Taco night", root.GetProperty("main")[0].GetProperty("label").GetString());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("main")[1].GetProperty("label").ValueKind);
        Assert.Equal(["Supper", "Lunch", "Breakfast", "Dessert"], root.GetProperty("mealTypes").EnumerateArray().Select(item => item.GetString()));
        Assert.Equal(["Japanese"], root.GetProperty("cuisines").GetProperty("promoted").EnumerateArray().Select(item => item.GetString()));
        Assert.Equal(["Italian", "Japanese"], root.GetProperty("cuisines").GetProperty("all").EnumerateArray().Select(item => item.GetString()));
    }

    [Fact]
    public async Task GetFilters_WithoutMaterializedState_DoesNotDiscoverCatalogOrHistoryCuisines()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Italian recipe", CuisineType = "Italian", IsReady = true };
            db.Recipes.Add(recipe);
            db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = Guid.NewGuid(), Vote = VoteType.Like });
            db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe.Id, Date = new DateOnly(2026, 9, 18), Status = CalendarEventStatus.Cooked });
            await db.SaveChangesAsync();
        }

        var response = await factory.CreateClient().GetAsync("/api/recipes/search/filters");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = body.RootElement;
        Assert.Equal(JsonValueKind.Null, root.GetProperty("generatedAt").ValueKind);
        Assert.Equal(["beef", "poultry", "pork", "fish", "pasta", "vegetarian"], root.GetProperty("main").EnumerateArray().Select(item => item.GetProperty("id").GetString()));
        Assert.Equal(["Supper", "Lunch", "Breakfast", "Dessert"], root.GetProperty("mealTypes").EnumerateArray().Select(item => item.GetString()));
        Assert.Empty(root.GetProperty("cuisines").GetProperty("promoted").EnumerateArray());
        Assert.Empty(root.GetProperty("cuisines").GetProperty("all").EnumerateArray());
    }

    [Fact]
    public async Task GetFilters_ServesAStaleMaterializedSnapshot()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        var staleAt = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        await AddStateAsync(factory, staleAt, "{\"promoted\":[\"French\"],\"all\":[\"French\"]}");

        var response = await factory.CreateClient().GetAsync("/api/recipes/search/filters");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(staleAt, body.RootElement.GetProperty("generatedAt").GetDateTimeOffset());
        Assert.Equal(["French"], body.RootElement.GetProperty("cuisines").GetProperty("all").EnumerateArray().Select(item => item.GetString()));
    }

    [Fact]
    public async Task GetFilters_WithMalformedMainConfiguration_UsesTheSafeBuiltInContractFallback()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["RecipeSearchFilters:Main:0:Id"] = "custom",
            ["RecipeSearchFilters:Main:0:Concept"] = "custom concept",
            ["RecipeSearchFilters:Main:0:Label"] = " "
        });

        var response = await factory.CreateClient().GetAsync("/api/recipes/search/filters");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = body.RootElement;
        Assert.Equal(JsonValueKind.Null, root.GetProperty("generatedAt").ValueKind);
        Assert.Equal(["beef", "poultry", "pork", "fish", "pasta", "vegetarian"], root.GetProperty("main").EnumerateArray().Select(item => item.GetProperty("id").GetString()));
        Assert.Equal(JsonValueKind.Null, root.GetProperty("main")[0].GetProperty("label").ValueKind);
        Assert.Equal(["Supper", "Lunch", "Breakfast", "Dessert"], root.GetProperty("mealTypes").EnumerateArray().Select(item => item.GetString()));
        Assert.Empty(root.GetProperty("cuisines").GetProperty("promoted").EnumerateArray());
        Assert.Empty(root.GetProperty("cuisines").GetProperty("all").EnumerateArray());
    }

    private static async Task AddStateAsync(TestWebApplicationFactory factory, DateTimeOffset generatedAt, string payload)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecipeSearchFilterStates.Add(new RecipeSearchFilterState
        {
            GeneratedAt = generatedAt,
            CuisinePayload = payload
        });
        await db.SaveChangesAsync();
    }
}
