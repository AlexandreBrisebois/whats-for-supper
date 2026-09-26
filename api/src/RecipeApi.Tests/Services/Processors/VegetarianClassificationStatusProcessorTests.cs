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
            new Recipe { Id = Guid.NewGuid(), IsVegetarian = true },
            new Recipe { Id = Guid.NewGuid(), IsVegetarian = false },
            new Recipe { Id = Guid.NewGuid() },
            new Recipe { Id = Guid.NewGuid() });
        await db.SaveChangesAsync();
        var processor = new VegetarianClassificationStatusProcessor(db);

        var result = await processor.ExecuteAsync(new WorkflowTask(), CancellationToken.None);

        var metrics = Assert.IsType<VegetarianClassificationMetrics>(result);
        Assert.Equal(4, metrics.Total);
        Assert.Equal(2, metrics.Classified);
        Assert.Equal(2, metrics.Unknown);
        Assert.Equal(1, metrics.Vegetarian);
        Assert.Equal(1, metrics.NonVegetarian);
    }
}
