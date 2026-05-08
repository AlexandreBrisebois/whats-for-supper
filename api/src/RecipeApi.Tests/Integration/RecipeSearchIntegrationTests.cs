using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipeSearchIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Search_WithChickenQuery_Returns_ChickenStirFry_From_NameMatch()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Chicken Stir Fry",
            Description = "Weeknight skillet dinner",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken thighs", "broccoli", "soy sauce" }),
            Notes = "Kids ask for this on busy nights.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        });

        var response = await PostSearchAsync(new { query = "chicken" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var data = document.RootElement;
        var topPick = data.GetProperty("topPick");
        Assert.Equal("Chicken Stir Fry", topPick.GetProperty("name").GetString());

        var results = data.GetProperty("results");
        Assert.Contains(results.EnumerateArray(), result => result.GetProperty("name").GetString() == "Chicken Stir Fry");
    }

    [Fact]
    public async Task Search_Matches_Query_From_Notes_And_Emits_NotesReason()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Lemon Pasta",
            Description = "Bright pantry pasta",
            Ingredients = JsonSerializer.Serialize(new[] { "pasta", "lemon", "parmesan" }),
            Notes = "This is the cozy soup-adjacent pasta the family asks for when someone is sick.",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "soup" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var topPick = document.RootElement.GetProperty("topPick");
        Assert.Equal("Lemon Pasta", topPick.GetProperty("name").GetString());

        var reasons = topPick.GetProperty("reasons");
        Assert.Contains(reasons.EnumerateArray(), reason =>
            reason.GetProperty("source").GetString() == "notes-match" &&
            reason.GetProperty("label").GetString() == "Your notes mention this");
    }

    [Fact]
    public async Task Search_WithFuzzyQuery_Returns_Similar_Text_Candidate()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Chicken Stir Fry",
            Description = "Fast dinner with crisp vegetables",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken", "snow peas" }),
            Notes = "Reliable favorite.",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "chikcen" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var results = document.RootElement.GetProperty("results");
        Assert.Contains(results.EnumerateArray(), result => result.GetProperty("name").GetString() == "Chicken Stir Fry");
    }

    [Fact]
    public async Task Search_Clamps_To_Five_Results()
    {
        for (var index = 0; index < 7; index++)
        {
            await SeedRecipeAsync(new Recipe
            {
                Id = Guid.NewGuid(),
                AddedBy = _factory.DefaultFamilyMemberId,
                Name = $"Chicken Dinner {index}",
                Description = "Chicken dinner",
                Ingredients = JsonSerializer.Serialize(new[] { "chicken", "garlic" }),
                Notes = "Weeknight staple.",
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-index),
                UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-index)
            });
        }

        var response = await PostSearchAsync(new { query = "chicken", limit = 99 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var results = document.RootElement.GetProperty("results");
        Assert.True(results.GetArrayLength() <= 5);
    }

    [Fact]
    public async Task Search_Returns_LexicalOnly_ResultPath_In_Phase1()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Chicken Stir Fry",
            Description = "Fast dinner",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken" }),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "chicken" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        Assert.Equal("lexical-only", document.RootElement.GetProperty("resultPath").GetString());
    }

    [Fact]
    public async Task Search_Returns_NonEmpty_Reasons_With_Source_And_Label()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Chicken Stir Fry",
            Description = "Fast dinner",
            Ingredients = JsonSerializer.Serialize(new[] { "chicken" }),
            Notes = "Chicken note",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "chicken" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var firstResult = document.RootElement.GetProperty("results")[0];
        var firstReason = firstResult.GetProperty("reasons")[0];

        Assert.False(string.IsNullOrWhiteSpace(firstReason.GetProperty("source").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(firstReason.GetProperty("label").GetString()));
    }

    [Fact]
    public async Task Search_WithEmptyQuery_Returns_Newest_Recipes_First()
    {
        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Older Recipe",
            Description = "Earlier recipe",
            Ingredients = JsonSerializer.Serialize(new[] { "onion" }),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-3),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-3)
        });

        await SeedRecipeAsync(new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Newest Recipe",
            Description = "Latest recipe",
            Ingredients = JsonSerializer.Serialize(new[] { "garlic" }),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var response = await PostSearchAsync(new { query = "" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var results = document.RootElement.GetProperty("results");
        Assert.Equal("Newest Recipe", results[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task Search_Mirrors_AppliedFilters_In_Response()
    {
        var response = await PostSearchAsync(new
        {
            query = "chicken",
            filters = new
            {
                newRecipes = true,
                neverCooked = false,
                familyFavorite = true,
                quickOnly = true,
                notCookedInLongTime = false,
                discoverableOnly = true
            }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = await ReadDataAsync(response);
        var appliedFilters = document.RootElement.GetProperty("appliedFilters");
        Assert.True(appliedFilters.GetProperty("newRecipes").GetBoolean());
        Assert.False(appliedFilters.GetProperty("neverCooked").GetBoolean());
        Assert.True(appliedFilters.GetProperty("familyFavorite").GetBoolean());
        Assert.True(appliedFilters.GetProperty("quickOnly").GetBoolean());
        Assert.False(appliedFilters.GetProperty("notCookedInLongTime").GetBoolean());
        Assert.True(appliedFilters.GetProperty("discoverableOnly").GetBoolean());
    }

    private async Task<HttpResponseMessage> PostSearchAsync(object payload)
    {
        return await _client.PostAsJsonAsync("/api/recipes/search", payload);
    }

    private async Task<JsonDocument> ReadDataAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        using var envelope = JsonDocument.Parse(json);
        var root = envelope.RootElement;
        return root.TryGetProperty("data", out var data)
            ? JsonDocument.Parse(data.GetRawText())
            : JsonDocument.Parse(root.GetRawText());
    }

    private async Task SeedRecipeAsync(Recipe recipe)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
    }
}