using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for Phase 13 Phase B:
///   POST /api/recipes/describe  — stub creation
///   GET  /api/recipes/{id}/status — synthesis status
/// </summary>
public class RecipeDescribeIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── POST /api/recipes/describe ────────────────────────────────────────────

    [Fact]
    public async Task Describe_ValidBody_Returns200WithRecipeId()
    {
        var response = await _client.PostAsJsonAsync("/api/recipes/describe", new
        {
            name = "Our family spaghetti",
            description = "Homemade tomato sauce with meatballs, slow-cooked for two hours"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = body.GetProperty("data");

        // Must have a valid GUID id
        var id = data.GetProperty("id").GetString();
        Assert.True(Guid.TryParse(id, out _), $"Expected a valid GUID but got: {id}");

        // Name must match what was sent
        Assert.Equal("Our family spaghetti", data.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Describe_MissingName_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/recipes/describe", new
        {
            description = "No name provided"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Describe_MissingDescription_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/recipes/describe", new
        {
            name = "No description provided"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── GET /api/recipes/{id}/status ──────────────────────────────────────────

    [Fact]
    public async Task GetStatus_StubRecipe_ReturnsPending()
    {
        // First create a stub recipe
        var createResponse = await _client.PostAsJsonAsync("/api/recipes/describe", new
        {
            name = "Pending GOTO recipe",
            description = "A recipe that has not been synthesised yet"
        });
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var recipeId = createBody.GetProperty("data").GetProperty("id").GetString();
        Assert.NotNull(recipeId);

        // Now check its status — must be "pending" (ImageCount = 0)
        var statusResponse = await _client.GetAsync($"/api/recipes/{recipeId}/status");
        Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);

        var statusBody = await statusResponse.Content.ReadFromJsonAsync<JsonElement>();
        var data = statusBody.GetProperty("data");

        Assert.Equal(recipeId, data.GetProperty("id").GetString());
        Assert.Equal("pending", data.GetProperty("status").GetString());
        Assert.Equal(0, data.GetProperty("imageCount").GetInt32());
        Assert.False(data.GetProperty("isSynthesized").GetBoolean());
    }

    [Fact]
    public async Task GetStatus_UnknownId_Returns404()
    {
        var unknownId = Guid.NewGuid();
        var response = await _client.GetAsync($"/api/recipes/{unknownId}/status");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── addedBy and recipe.info persistence ──────────────────────────────────

    [Fact]
    public async Task Describe_WithFamilyMemberHeader_PopulatesAddedByAndWritesRecipeInfo()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/describe")
        {
            Content = JsonContent.Create(new { name = "Our family spaghetti", description = "Homemade tomato sauce with meatballs" })
        };
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var idStr = body.GetProperty("data").GetProperty("id").GetString();
        Assert.True(Guid.TryParse(idStr, out var recipeId));

        // DB row has AddedBy populated
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(recipe);
        Assert.Equal(_factory.DefaultFamilyMemberId, recipe.AddedBy);
        Assert.NotEqual(default, recipe.CreatedAt);

        // recipe.info written to store with correct values
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        Assert.True(await store.InfoExistsAsync(recipeId), $"recipe.info not found in store for {recipeId}");
        var info = await store.ReadInfoAsync(recipeId);
        Assert.NotNull(info);
        Assert.Equal(_factory.DefaultFamilyMemberId, info.AddedBy);
        Assert.Equal(0, info.ImageCount);
        Assert.Equal("Our family spaghetti", info.Name);
    }

    [Fact]
    public async Task Describe_WithoutFamilyMemberHeader_SucceedsWithNullAddedBy()
    {
        var response = await _client.PostAsJsonAsync("/api/recipes/describe", new
        {
            name = "Anonymous recipe",
            description = "No family member context"
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var idStr = body.GetProperty("data").GetProperty("id").GetString();
        Assert.True(Guid.TryParse(idStr, out var recipeId));

        // DB row has AddedBy = null
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(recipe);
        Assert.Null(recipe.AddedBy);

        // recipe.info exists in store with addedBy null
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        Assert.True(await store.InfoExistsAsync(recipeId), $"recipe.info not found in store for {recipeId}");
        var info = await store.ReadInfoAsync(recipeId);
        Assert.NotNull(info);
        Assert.Null(info.AddedBy);
    }
}
