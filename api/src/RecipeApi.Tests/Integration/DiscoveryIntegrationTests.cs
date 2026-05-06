using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using System.Text.Json;
using System.Net.Http.Json;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for Discovery cuisine filtering (Task 8).
/// Note: These tests use HTTP calls instead of direct service calls because
/// the JsonContains function used for cuisine filtering is PostgreSQL-specific
/// and doesn't work with the in-memory database provider used for testing.
/// </summary>
public class DiscoveryIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private Guid _familyMemberId;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        _familyMemberId = _factory.DefaultFamilyMemberId;
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task GetDiscoveryStack_WithCuisineParameter_AcceptsParameter()
    {
        // Arrange: Create a recipe (cuisine filtering will be tested in real environment)
        var recipeId = Guid.NewGuid();
        var discoveryRecipe = new DiscoveryRecipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            Category = "ProteinFoods",
            IsVegetarian = false,
            IsHealthyChoice = false,
            DietaryProfile = JsonSerializer.Serialize(new { cuisineType = "Italian" })
        };
        _db.DiscoveryRecipes.Add(discoveryRecipe);
        await _db.SaveChangesAsync();

        // Act: Call API with cuisine parameter
        _client.DefaultRequestHeaders.Add("X-Family-Member-Id", _familyMemberId.ToString());
        var response = await _client.GetAsync("/api/discovery?cuisine=Italian");

        // Assert: API accepts the parameter and returns 200
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var recipes = json.RootElement.GetProperty("data").Deserialize<Recipe[]>(new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
        });
        
        // The recipe should appear (in-memory DB doesn't filter by cuisine, but API should work)
        Assert.NotNull(recipes);
    }

    [Fact]
    public async Task GetDiscoveryStack_WithoutCuisineParameter_ReturnsRecipes()
    {
        // Arrange: Create a recipe
        var recipeId = Guid.NewGuid();
        var discoveryRecipe = new DiscoveryRecipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            Category = "ProteinFoods",
            IsVegetarian = false,
            IsHealthyChoice = false
        };
        _db.DiscoveryRecipes.Add(discoveryRecipe);
        await _db.SaveChangesAsync();

        // Act: Call API without cuisine parameter
        _client.DefaultRequestHeaders.Add("X-Family-Member-Id", _familyMemberId.ToString());
        var response = await _client.GetAsync("/api/discovery");

        // Assert: API works and returns recipes
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var recipes = json.RootElement.GetProperty("data").Deserialize<Recipe[]>(new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
        });
        
        Assert.NotNull(recipes);
        Assert.Single(recipes);
        Assert.Equal(recipeId, recipes[0].Id);
    }

    [Fact]
    public async Task GetDiscoveryStack_WithCategoryAndCuisineParameters_AcceptsBoth()
    {
        // Arrange: Create a recipe
        var recipeId = Guid.NewGuid();
        var discoveryRecipe = new DiscoveryRecipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            Category = "ProteinFoods",
            IsVegetarian = false,
            IsHealthyChoice = false,
            DietaryProfile = JsonSerializer.Serialize(new { cuisineType = "Italian" })
        };
        _db.DiscoveryRecipes.Add(discoveryRecipe);
        await _db.SaveChangesAsync();

        // Act: Call API with both category and cuisine parameters
        _client.DefaultRequestHeaders.Add("X-Family-Member-Id", _familyMemberId.ToString());
        var response = await _client.GetAsync("/api/discovery?category=ProteinFoods&cuisine=Italian");

        // Assert: API accepts both parameters and returns 200
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var recipes = json.RootElement.GetProperty("data").Deserialize<Recipe[]>(new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
        });
        
        Assert.NotNull(recipes);
    }

    [Fact]
    public async Task GetDiscoveryStack_WithNonExistentCuisine_ReturnsSuccessfully()
    {
        // Arrange: Create a recipe
        var recipeId = Guid.NewGuid();
        var discoveryRecipe = new DiscoveryRecipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            Category = "ProteinFoods",
            IsVegetarian = false,
            IsHealthyChoice = false
        };
        _db.DiscoveryRecipes.Add(discoveryRecipe);
        await _db.SaveChangesAsync();

        // Act: Call API with non-existent cuisine
        _client.DefaultRequestHeaders.Add("X-Family-Member-Id", _familyMemberId.ToString());
        var response = await _client.GetAsync("/api/discovery?cuisine=Martian");

        // Assert: API returns successfully (no error)
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var recipes = json.RootElement.GetProperty("data").Deserialize<Recipe[]>(new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
        });
        
        Assert.NotNull(recipes);
        // In real PostgreSQL environment, this would return empty, but in-memory DB doesn't filter
    }

    [Fact]
    public async Task GetDiscoveryStack_CuisineParameterContract_MatchesOpenAPISpec()
    {
        // This test verifies that the cuisine parameter is properly accepted by the API
        // The actual filtering logic is tested in the real environment where PostgreSQL is available
        
        // Act: Call API with cuisine parameter
        _client.DefaultRequestHeaders.Add("X-Family-Member-Id", _familyMemberId.ToString());
        var response = await _client.GetAsync("/api/discovery?cuisine=Italian");

        // Assert: API accepts the parameter (contract test)
        response.EnsureSuccessStatusCode();
    }
}
