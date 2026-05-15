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

public class RecipeUpdateIntegrationTests : IAsyncLifetime
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
    public async Task UpdateRecipe_WithInstructions_UpdatesDbAndRecipeInfo()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var initialInstructions = new[] { "Step 1", "Step 2" };
        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Instruction Test Recipe",
            RawMetadata = JsonSerializer.Serialize(new { recipeInstructions = initialInstructions }),
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.WriteInfoAsync(new RecipeInfo { Id = recipeId, Name = "Instruction Test Recipe" });

        var newInstructions = new[] { "Updated Step 1", "Updated Step 2", "New Step 3" };
        var updateDto = new
        {
            recipeInstructions = newInstructions
        };

        // Act
        var response = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", updateDto);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify DB update
        var updatedRecipe = await _db.Recipes.FindAsync(recipeId);
        _db.Entry(updatedRecipe!).Reload();
        Assert.NotNull(updatedRecipe!.RawMetadata);
        
        using var doc = JsonDocument.Parse(updatedRecipe.RawMetadata);
        var instructions = doc.RootElement.GetProperty("recipeInstructions");
        Assert.Equal(3, instructions.GetArrayLength());
        Assert.Equal("Updated Step 1", instructions[0].GetString());

        // Verify recipe.info update
        var info = await store.ReadInfoAsync(recipeId);
        Assert.NotNull(info);
        Assert.NotNull(info.RecipeInstructions);
        var infoInstructions = (JsonElement)info.RecipeInstructions;
        Assert.Equal(3, infoInstructions.GetArrayLength());
        Assert.Equal("Updated Step 1", infoInstructions[0].GetString());
    }
}
