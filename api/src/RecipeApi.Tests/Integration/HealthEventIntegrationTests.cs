using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class HealthEventIntegrationTests : IAsyncLifetime
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

    [Fact]
    public async Task UpdateRecipe_PublishesHealthEvent()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Health Test Recipe",
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var updateDto = new
        {
            name = "Updated Health Test Recipe"
        };

        // Act
        var response = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", updateDto);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify health event insertion
        var healthEvent = await _db.HealthEvents
            .Where(e => e.EventType == "recipe_changed" && e.EntityId == recipeId.ToString())
            .FirstOrDefaultAsync();
        
        Assert.NotNull(healthEvent);
        Assert.Equal("pending", healthEvent.Status);
    }

    [Fact]
    public async Task RestoreRecipe_PublishesHealthEvent()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Restore Health Test Recipe",
            DeletedAt = DateTimeOffset.UtcNow,
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.IgnoreQueryFilters(); // Required to find it if we want to manually add
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act
        var response = await _client.PostAsync($"/api/recipes/{recipeId}/restore", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify health event insertion
        var healthEvent = await _db.HealthEvents
            .Where(e => e.EventType == "recipe_changed" && e.EntityId == recipeId.ToString())
            .FirstOrDefaultAsync();
        
        Assert.NotNull(healthEvent);
    }
}
