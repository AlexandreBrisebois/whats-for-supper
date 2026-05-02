using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for ManagementService.BackupAsync():
///   1. Ready recipes (Name + ImageCount > 0) are always backed up, even with no metadata/notes/rating.
///   2. Unready recipes with no payload continue to be skipped.
/// </summary>
public class ManagementBackupIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private ManagementService _management = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        _management = _scope.ServiceProvider.GetRequiredService<ManagementService>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task BackupAsync_IncludesReadyRecipe_EvenWithNoMetadataOrRating()
    {
        var recipe = new Recipe
        {
            Name = "Pasta",
            ImageCount = 1,
            RawMetadata = null,
            Notes = null,
            Rating = RecipeRating.Unknown,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        await _management.BackupAsync();

        var infoPath = Path.Combine(_factory.TempRecipesRoot, recipe.Id.ToString(), "recipe.info");
        Assert.True(File.Exists(infoPath), $"recipe.info should have been written for a ready recipe, but was not found at {infoPath}");
    }

    [Fact]
    public async Task BackupAsync_SkipsUnreadyRecipe_WithNoPayload()
    {
        var recipe = new Recipe
        {
            Name = null,
            ImageCount = 0,
            RawMetadata = null,
            Notes = null,
            Rating = RecipeRating.Unknown,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        await _management.BackupAsync();

        var infoPath = Path.Combine(_factory.TempRecipesRoot, recipe.Id.ToString(), "recipe.info");
        Assert.False(File.Exists(infoPath), $"recipe.info should NOT have been written for an unready recipe with no payload, but was found at {infoPath}");
    }
}
