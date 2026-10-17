using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
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
    public async Task HistoryRestore_RebuildsAffinityFromCurrentVotesAndCookedEvents()
    {
        var recipe = new Recipe { Name = "Restored supper", IsReady = true, CuisineType = "Italian", ImageCount = 1 };
        _db.Recipes.Add(recipe);
        _db.CalendarEvents.Add(new CalendarEvent { RecipeId = recipe.Id, Date = new(2026, 10, 1), Status = CalendarEventStatus.Cooked });
        _db.RecipeSearchAffinityFacts.Add(new RecipeSearchAffinityFact { RecipeId = recipe.Id, Affinity = 8, LiveVoteContribution = 7 });
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        await _management.RestoreAsync();
        var fact = await _db.RecipeSearchAffinityFacts.SingleAsync(x => x.RecipeId == recipe.Id);
        Assert.Equal(1, fact.Affinity);
        Assert.Equal(0, fact.LiveVoteContribution);
        Assert.Equal(new DateOnly(2026, 10, 1), fact.LastCookedOn);
    }

    [Fact]
    public async Task WeeklyInterest_BackupExplicitEmptyDoesNotResurrectRemovedHistory()
    {
        var recipe = new Recipe { Name = "History supper", ImageCount = 1 };
        _db.Recipes.Add(recipe);
        _db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest
        {
            RecipeId = recipe.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 2,
            CloseId = Guid.NewGuid(), CapturedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        var path = Path.Combine(_scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root, "weekly-household-interest.json");
        Assert.True(File.Exists(path));
        var snapshot = await File.ReadAllTextAsync(path);
        Assert.DoesNotContain("familyMember", snapshot, StringComparison.OrdinalIgnoreCase);
        _db.WeeklyHouseholdInterests.RemoveRange(_db.WeeklyHouseholdInterests);
        await _db.SaveChangesAsync();
        await _management.RestoreAsync();
        Assert.Equal(2, Assert.Single(_db.WeeklyHouseholdInterests).PositiveCount);
        _db.WeeklyHouseholdInterests.RemoveRange(_db.WeeklyHouseholdInterests);
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        _db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = recipe.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 9 });
        await _db.SaveChangesAsync();
        await _management.RestoreAsync();
        Assert.Empty(_db.WeeklyHouseholdInterests);
        await _management.RestoreAsync();
        Assert.Empty(_db.WeeklyHouseholdInterests);
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

    [Fact]
    public async Task HistoryBackup_PreservesUnavailableRecipeDependency_AndRotationIntent_OnRepeatedRestore()
    {
        var recipe = new Recipe { Name = "Unavailable supper", DeletedAt = DateTimeOffset.UtcNow,
            RotationHumanOff = true, RotationSource = "Human", CookedSuppressed = true, SupperSuitable = false };
        _db.Recipes.Add(recipe);
        _db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest
        { RecipeId = recipe.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 2, Selected = true });
        await _db.SaveChangesAsync();
        await _management.BackupAsync();
        _db.WeeklyHouseholdInterests.RemoveRange(_db.WeeklyHouseholdInterests);
        _db.Recipes.Remove(recipe);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
        await _management.RestoreAsync();
        await _management.RestoreAsync();
        var restored = await _db.Recipes.IgnoreQueryFilters().SingleAsync(r => r.Id == recipe.Id);
        Assert.NotNull(restored.DeletedAt);
        Assert.False(restored.IsReady);
        Assert.True(restored.RotationHumanOff);
        Assert.Equal("Human", restored.RotationSource);
        Assert.True(restored.CookedSuppressed);
        Assert.False(restored.SupperSuitable);
        Assert.Equal(2, (await _db.WeeklyHouseholdInterests.SingleAsync()).PositiveCount);
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
