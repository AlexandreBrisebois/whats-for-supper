using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class GoToIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private GoToService _service = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<GoToService>>();
        _service = new GoToService(_db, logger);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task GetGoToListAsync_NoData_ReturnsEmpty()
    {
        var result = await _service.GetGoToListAsync();
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task SaveThenGet_RoundTrips()
    {
        var dto = new GoToListDto
        {
            Items = new List<GoToItemDto>
            {
                new() { RecipeId = Guid.NewGuid(), Description = "Spaghetti" },
                new() { RecipeId = Guid.NewGuid(), Description = "Tacos" }
            }
        };

        await _service.SaveGoToListAsync(dto);
        var retrieved = await _service.GetGoToListAsync();

        Assert.Equal(2, retrieved.Items.Count);
        Assert.Equal("Spaghetti", retrieved.Items[0].Description);
        Assert.Equal("Tacos", retrieved.Items[1].Description);
    }

    [Fact]
    public async Task GetActiveGoToAsync_FiltersReadyRecipes()
    {
        var readyId = Guid.NewGuid();
        var pendingId = Guid.NewGuid();

        // Seed recipes
        _db.Recipes.AddRange(
            new Recipe { Id = readyId, Name = "Ready", IsReady = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new Recipe { Id = pendingId, Name = "Pending", IsReady = false, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        );
        await _db.SaveChangesAsync();

        var dto = new GoToListDto
        {
            Items = new List<GoToItemDto>
            {
                new() { RecipeId = readyId, Description = "Ready Recipe" },
                new() { RecipeId = pendingId, Description = "Pending Recipe" }
            }
        };
        await _service.SaveGoToListAsync(dto);

        // Act
        var active = await _service.GetActiveGoToAsync();

        // Assert
        Assert.NotNull(active);
        Assert.Equal(readyId, active.RecipeId);
    }

    [Fact]
    public async Task GetActiveGoToAsync_ReturnsNull_WhenNoneReady()
    {
        var pendingId = Guid.NewGuid();

        _db.Recipes.Add(new Recipe { Id = pendingId, Name = "Pending", IsReady = false, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
        await _db.SaveChangesAsync();

        var dto = new GoToListDto
        {
            Items = new List<GoToItemDto> { new() { RecipeId = pendingId, Description = "Pending" } }
        };
        await _service.SaveGoToListAsync(dto);

        var active = await _service.GetActiveGoToAsync();
        Assert.Null(active);
    }
}
