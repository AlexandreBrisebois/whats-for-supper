using RecipeApi.Models;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

public class VegetarianClassificationStatusProcessorTests
{
    [Fact]
    public async Task ExecuteAsync_ReturnsLiveClassificationCounts()
    {
        await using var db = TestDbContextFactory.Create();
        db.Recipes.AddRange(
            new Recipe { Id = Guid.NewGuid(), IsVegetarian = true, VegetarianClassificationVersion = 1, VegetarianClassifiedAt = DateTimeOffset.Parse("2026-09-20T12:00:00Z") },
            new Recipe { Id = Guid.NewGuid(), IsVegetarian = false, VegetarianClassificationVersion = 1, VegetarianClassifiedAt = DateTimeOffset.Parse("2026-09-24T12:00:00Z") },
            new Recipe { Id = Guid.NewGuid() },
            new Recipe { Id = Guid.NewGuid(), VegetarianClassificationFailedAt = DateTimeOffset.UtcNow, VegetarianClassificationFailureReason = "LLM unavailable" });
        await db.SaveChangesAsync();
        var processor = new VegetarianClassificationStatusProcessor(db);

        var result = await processor.ExecuteAsync(new WorkflowTask(), CancellationToken.None);

        var metrics = Assert.IsType<VegetarianClassificationMetrics>(result);
        Assert.Equal(4, metrics.Total);
        Assert.Equal(2, metrics.CurrentVersion);
        Assert.Equal(1, metrics.Unknown);
        Assert.Equal(1, metrics.Vegetarian);
        Assert.Equal(1, metrics.NonVegetarian);
        Assert.Equal(1, metrics.Failed);
    }
}
