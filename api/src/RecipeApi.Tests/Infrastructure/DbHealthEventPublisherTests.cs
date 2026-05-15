using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Infrastructure;

public class DbHealthEventPublisherTests
{
    [Fact]
    public async Task PublishRecipeChangedAsync_InsertsPendingEvent()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var publisher = new DbHealthEventPublisher(db);
        var recipeId = Guid.NewGuid();

        // Act
        await publisher.PublishRecipeChangedAsync(recipeId, CancellationToken.None);

        // Assert
        var healthEvent = await db.HealthEvents.SingleAsync();
        Assert.Equal("recipe_changed", healthEvent.EventType);
        Assert.Equal(recipeId.ToString(), healthEvent.EntityId);
        Assert.Equal("pending", healthEvent.Status);
    }

    [Fact]
    public async Task PublishWeekChangedAsync_InsertsPendingEvent()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var publisher = new DbHealthEventPublisher(db);
        var monday = new DateOnly(2026, 5, 18);

        // Act
        await publisher.PublishWeekChangedAsync(monday, CancellationToken.None);

        // Assert
        var healthEvent = await db.HealthEvents.SingleAsync();
        Assert.Equal("week_changed", healthEvent.EventType);
        Assert.Equal("2026-05-18", healthEvent.EntityId);
        Assert.Equal("pending", healthEvent.Status);
    }
}
