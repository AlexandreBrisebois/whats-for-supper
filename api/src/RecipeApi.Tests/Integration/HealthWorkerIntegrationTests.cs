using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class HealthWorkerIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private HealthWorker _worker = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        
        var scopeFactory = _factory.Services.GetRequiredService<IServiceScopeFactory>();
        _worker = new HealthWorker(scopeFactory, NullLogger<HealthWorker>.Instance);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Worker_ProcessesRecipeChangedEvent_AndCreatesProfile()
    {
        // 1. Arrange: Create a recipe with metadata
        var recipeId = Guid.NewGuid();
        var rawMetadata = JsonSerializer.Serialize(new
        {
            name = "Test Health Recipe",
            supply = new[] { new { name = "Chicken breast" }, new { name = "Broccoli" } },
            nutrition = new { sodiumContent = "100 mg", saturatedFatContent = "1 g", sugarContent = "2 g" }
        });

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Test Health Recipe",
            RawMetadata = rawMetadata,
            IsHealthyChoice = true,
            IsVegetarian = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);

        // 2. Add a pending health event
        var healthEvent = new HealthEvent
        {
            EventType = "recipe_changed",
            EntityId = recipeId.ToString(),
            Status = "pending",
            CreatedAt = DateTimeOffset.UtcNow,
            ScheduledFor = DateTimeOffset.UtcNow.AddMinutes(-5)
        };
        _db.HealthEvents.Add(healthEvent);
        await _db.SaveChangesAsync();

        // 3. Act: Run the worker
        // The worker will call HealthComputationService, which calls the LLM.
        // TestWebApplicationFactory stubs IChatClient to return a default response.
        var processedCount = await _worker.ProcessPendingEventsAsync(CancellationToken.None);

        // 4. Assert
        Assert.Equal(1, processedCount);

        // Verify event is completed
        var updatedEvent = await _db.HealthEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == healthEvent.Id);
        Assert.Equal("completed", updatedEvent?.Status);

        // Verify profile is created
        var profile = await _db.HealthRecipeProfiles.FindAsync(recipeId);
        Assert.NotNull(profile);
        Assert.Equal(recipeId, profile.RecipeId);
        Assert.NotNull(profile.DietaryProfile);
        Assert.Equal("ProteinFoods", profile.PrimaryFoodGroup); // Default from stub
        Assert.True(profile.IsHealthyChoice);
        Assert.False(profile.IsVegetarian);
    }

    [Fact]
    public async Task Worker_HandlesMissingRecipeGracefully()
    {
        // 1. Arrange: Add an event for a non-existent recipe
        var healthEvent = new HealthEvent
        {
            EventType = "recipe_changed",
            EntityId = Guid.NewGuid().ToString(),
            Status = "pending",
            ScheduledFor = DateTimeOffset.UtcNow.AddMinutes(-5)
        };
        _db.HealthEvents.Add(healthEvent);
        await _db.SaveChangesAsync();

        // 2. Act
        var processedCount = await _worker.ProcessPendingEventsAsync(CancellationToken.None);

        // 3. Assert
        Assert.Equal(1, processedCount);
        var updatedEvent = await _db.HealthEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == healthEvent.Id);
        Assert.Equal("completed", updatedEvent?.Status);
    }

    [Fact]
    public async Task Worker_ProcessesWeekChangedEvent_AndCreatesSummary()
    {
        // 1. Arrange
        var weekStart = new DateOnly(2026, 5, 18); // A Monday
        
        // Add some recipes and assignments
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Week Recipe", RawMetadata = "{}", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
        
        // Add a profile for the recipe
        _db.HealthRecipeProfiles.Add(new HealthRecipeProfile 
        { 
            RecipeId = recipeId, 
            PrimaryFoodGroup = "ProteinFoods", 
            DietaryProfile = JsonSerializer.Serialize(new RecipeDietaryProfile(
                "ProteinFoods", Array.Empty<string>(), "Poultry", "Canadian", new[] { "Dinner" }, "Dinner", false, 1.0, "stub", null), 
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        });

        // Add a calendar event (assignment)
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Date = weekStart,
            MealSlot = 0, // Dinner
            RecipeId = recipeId,
            Status = 0 // Planned
        });

        // 2. Add a pending week event
        var healthEvent = new HealthEvent
        {
            EventType = "week_changed",
            EntityId = weekStart.ToString("yyyy-MM-dd"),
            Status = "pending",
            ScheduledFor = DateTimeOffset.UtcNow.AddMinutes(-5)
        };
        _db.HealthEvents.Add(healthEvent);
        await _db.SaveChangesAsync();

        // 3. Act
        var processedCount = await _worker.ProcessPendingEventsAsync(CancellationToken.None);

        // 4. Assert
        Assert.Equal(1, processedCount);
        var updatedEvent = await _db.HealthEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == healthEvent.Id);
        Assert.Equal("completed", updatedEvent?.Status);

        var summary = await _db.HealthWeekSummaries.FindAsync(weekStart);
        Assert.NotNull(summary);
        Assert.NotNull(summary.BalanceSummary);
    }
}
