using System.Net;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace RecipeApi.Tests.Controllers;

public class ManagementControllerTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client  = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── POST /api/management/bulk-import ─────────────────────────────────────

    [Fact]
    public async Task BulkTriggerImport_WithNoUnimportedRecipes_Returns_Accepted_With_Zero_Count()
    {
        // No recipes in the DB — expect 202 with queuedCount = 0
        var response = await _client.PostAsync("/api/management/bulk-import", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("queuedCount", out var count), "missing 'queuedCount'");
        Assert.Equal(0, count.GetInt32());
        Assert.True(root.TryGetProperty("instanceIds", out var ids), "missing 'instanceIds'");
        Assert.Equal(JsonValueKind.Array, ids.ValueKind);
        Assert.Equal(0, ids.GetArrayLength());
    }

    [Fact]
    public async Task BulkTriggerImport_WithUnimportedRecipes_Queues_Each_One()
    {
        // Arrange: seed two recipes with Name == null (unimported)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.AddRange(
                new RecipeApi.Models.Recipe
                {
                    Id = Guid.NewGuid(), Name = null, AddedBy = _factory.DefaultFamilyMemberId,
                    ImageCount = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                },
                new RecipeApi.Models.Recipe
                {
                    Id = Guid.NewGuid(), Name = null, AddedBy = _factory.DefaultFamilyMemberId,
                    ImageCount = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        // Act
        var response = await _client.PostAsync("/api/management/bulk-import", null);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("queuedCount", out var count), "missing 'queuedCount'");
        Assert.Equal(2, count.GetInt32());

        Assert.True(root.TryGetProperty("instanceIds", out var ids), "missing 'instanceIds'");
        Assert.Equal(2, ids.GetArrayLength());
    }

    [Fact]
    public async Task BulkTriggerImport_DoesNot_Queue_Already_Imported_Recipes()
    {
        // Arrange: one imported (Name set) and one unimported (Name null)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.AddRange(
                new RecipeApi.Models.Recipe
                {
                    Id = Guid.NewGuid(), Name = "Already imported", AddedBy = _factory.DefaultFamilyMemberId,
                    ImageCount = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                },
                new RecipeApi.Models.Recipe
                {
                    Id = Guid.NewGuid(), Name = null, AddedBy = _factory.DefaultFamilyMemberId,
                    ImageCount = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsync("/api/management/bulk-import", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(1, doc.RootElement.GetProperty("queuedCount").GetInt32());
    }

    // ── GET /api/management/status ──────────────────────────────────────────

    [Fact]
    public async Task GetStatus_Returns_NotFound_When_No_Workflows_Run()
    {
        var response = await _client.GetAsync("/api/management/status");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
