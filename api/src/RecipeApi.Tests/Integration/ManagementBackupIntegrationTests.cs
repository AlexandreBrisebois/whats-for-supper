using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
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
        
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        Assert.True(await store.InfoExistsAsync(recipe.Id), $"recipe.info should have been written for a ready recipe, but was not found in store for {recipe.Id}");
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

        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        Assert.False(await store.InfoExistsAsync(recipe.Id), $"recipe.info should NOT have been written for an unready recipe with no payload, but was found in store for {recipe.Id}");
    }

    [Theory]
    [InlineData("custom", "Emma’s birthday supper")]
    [InlineData("order_in", "Luigi’s")]
    [InlineData("eating_out", "Try the new café")]
    [InlineData(null, null)]
    public async Task NonCookingCalendarBackup_RestoresCustomAndLegacyPlans(string? kind, string? note)
    {
        var entry = new CalendarEvent
        {
            Id = Guid.NewGuid(), Date = new DateOnly(2026, 10, 12), Status = CalendarEventStatus.Skipped,
            NonCookingKind = kind, NonCookingLabel = note
        };
        _db.CalendarEvents.Add(entry);
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        var path = Path.Combine(_scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root, "calendar-events.json");
        if (kind == null)
            await File.WriteAllTextAsync(path, System.Text.Json.JsonSerializer.Serialize(new[] { new { id = entry.Id, date = "2026-10-12", status = 3, recipeId = (Guid?)null } }));
        _db.CalendarEvents.Remove(entry);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
        await _management.RestoreAsync();
        var restored = _db.CalendarEvents.Single(e => e.Id == entry.Id);
        Assert.Equal(CalendarEventStatus.Skipped, restored.Status);
        Assert.Null(restored.RecipeId);
        Assert.Equal(entry.NonCookingKind, restored.NonCookingKind);
        Assert.Equal(entry.NonCookingLabel, restored.NonCookingLabel);
    }
}
