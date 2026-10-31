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
        _service = new GoToService(new RecipeApi.Services.SystemClock(), _db, logger);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Theory]
    [InlineData(false, 2)]
    [InlineData(true, 1)]
    public async Task List_GotoOnly_UsesConfiguredEligibleMembershipBeforePagination(bool discovery, int expectedTotal)
    {
        var now = DateTimeOffset.UtcNow;
        var ordinary = Enumerable.Range(0, 24).Select(i => new Recipe
        {
            Id = Guid.NewGuid(), Name = $"Ordinary {i}", IsReady = true,
            IsDiscoverable = true, Rating = (RecipeRating)3, CreatedAt = now.AddMinutes(i), UpdatedAt = now
        }).ToList();
        var configured = new Recipe { Id = Guid.NewGuid(), Name = "Configured unrated", IsReady = true,
            IsDiscoverable = true, Rating = 0, CreatedAt = now.AddDays(-2), UpdatedAt = now };
        var privateRecipe = new Recipe { Id = Guid.NewGuid(), Name = "Configured private", IsReady = true,
            IsDiscoverable = false, CreatedAt = now.AddDays(-1), UpdatedAt = now };
        var pending = new Recipe { Id = Guid.NewGuid(), Name = "Pending", IsReady = false,
            CreatedAt = now, UpdatedAt = now };
        var deleted = new Recipe { Id = Guid.NewGuid(), Name = "Deleted", IsReady = true,
            DeletedAt = now, CreatedAt = now, UpdatedAt = now };
        _db.Recipes.AddRange(ordinary.Concat([configured, privateRecipe, pending, deleted]));
        await _db.SaveChangesAsync();
        await _service.SaveGoToListAsync(new GoToListDto { Items =
        [
            new() { RecipeId = configured.Id }, new() { RecipeId = configured.Id },
            new() { RecipeId = privateRecipe.Id }, new() { RecipeId = pending.Id },
            new() { RecipeId = deleted.Id }, new() { RecipeId = Guid.NewGuid() }
        ] });

        using var client = _factory.CreateClient();
        using var response = await client.GetAsync($"/api/recipes?gotoOnly=true&discoverableOnly={discovery}&limit=1");
        response.EnsureSuccessStatusCode();
        using var body = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(expectedTotal, body.RootElement.GetProperty("pagination").GetProperty("total").GetInt32());
        var first = body.RootElement.GetProperty("recipes").EnumerateArray().Single().GetProperty("id").GetGuid();
        Assert.Contains(first, new[] { configured.Id, privateRecipe.Id });
        using var inactive = await client.GetAsync("/api/recipes?gotoOnly=false&limit=100");
        using var inactiveBody = System.Text.Json.JsonDocument.Parse(await inactive.Content.ReadAsStringAsync());
        Assert.Equal(26, inactiveBody.RootElement.GetProperty("pagination").GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task List_GotoOnly_EmptyConfigurationDoesNotFallBack()
    {
        _db.Recipes.Add(new Recipe { Id = Guid.NewGuid(), Name = "Ordinary", IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
        await _db.SaveChangesAsync();
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/api/recipes?gotoOnly=true");
        response.EnsureSuccessStatusCode();
        using var body = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Empty(body.RootElement.GetProperty("recipes").EnumerateArray());
        Assert.Equal(0, body.RootElement.GetProperty("pagination").GetProperty("total").GetInt32());
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
