using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class IngredientCategoryServiceTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private IngredientCategoryService _service = null!;
    private Mock<GroceryRecomputeService> _recomputeMock = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();

        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<GroceryRecomputeService>>();
#pragma warning disable CS8625
        _recomputeMock = new Mock<GroceryRecomputeService>(_db, new AisleMapper(), logger, null)
#pragma warning restore CS8625
        {
            CallBase = false
        };
        _recomputeMock
            .Setup(s => s.RecomputeForIngredientAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var serviceLogger = _scope.ServiceProvider.GetRequiredService<ILogger<IngredientCategoryService>>();
        _service = new IngredientCategoryService(_db, _recomputeMock.Object, serviceLogger);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task ReclassifyAsync_NewKey_InsertsRowWithManualSource()
    {
        await _service.ReclassifyAsync("potato", "Produce", CancellationToken.None);

        var row = await _db.IngredientCategories.SingleAsync(r => r.NormalizedKey == "potato");
        Assert.Equal("Produce", row.GrocerySection);
        Assert.Equal("manual", row.Source);
        Assert.Equal(1.0, row.Confidence);
    }

    [Fact]
    public async Task ReclassifyAsync_ExistingKey_UpdatesSectionAndSource()
    {
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "onion",
            GrocerySection = "Grocery",
            Source = "llm",
            Confidence = 0.7,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
        });
        await _db.SaveChangesAsync();

        await _service.ReclassifyAsync("onion", "Produce", CancellationToken.None);

        var row = await _db.IngredientCategories.SingleAsync(r => r.NormalizedKey == "onion");
        Assert.Equal("Produce", row.GrocerySection);
        Assert.Equal("manual", row.Source);
        Assert.Equal(1.0, row.Confidence);
    }

    [Fact]
    public async Task ReclassifyAsync_ExistingKey_RefreshesUpdatedAt()
    {
        var before = DateTimeOffset.UtcNow.AddMinutes(-1);
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "carrot",
            GrocerySection = "Grocery",
            Source = "llm",
            Confidence = 0.5,
            CreatedAt = before,
            UpdatedAt = before,
        });
        await _db.SaveChangesAsync();

        await _service.ReclassifyAsync("carrot", "Produce", CancellationToken.None);

        var row = await _db.IngredientCategories.SingleAsync(r => r.NormalizedKey == "carrot");
        Assert.True(row.UpdatedAt > before);
    }

    [Fact]
    public async Task ReclassifyAsync_AlwaysCallsRecomputeForIngredient()
    {
        await _service.ReclassifyAsync("garlic", "Produce", CancellationToken.None);

        _recomputeMock.Verify(
            s => s.RecomputeForIngredientAsync("garlic", It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
