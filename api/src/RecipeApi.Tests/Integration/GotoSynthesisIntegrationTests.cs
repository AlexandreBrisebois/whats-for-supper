using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for Phase 13 Phase C — workflow plumbing.
///   1. POST /api/recipes/describe triggers the goto-synthesis workflow.
///   2. RecipeReadyProcessor ensures image_count=1 (so GET /status returns ready).
///   3. RecipeReadyProcessor does NOT touch family_settings.
/// </summary>
public class GotoSynthesisIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── POST /api/recipes/describe triggers goto-synthesis workflow ───────────

    [Fact]
    public async Task Describe_TriggersGotoSynthesisWorkflow()
    {
        // The TestWebApplicationFactory mocks IWorkflowOrchestrator.
        // We verify the endpoint returns 200 (which means TriggerAsync was called
        // without throwing — the mock is set up to succeed for any workflow id).
        var response = await _client.PostAsJsonAsync("/api/recipes/describe", new
        {
            name = "Our family spaghetti",
            description = "Homemade tomato sauce with meatballs"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("data").GetProperty("id").GetString();
        Assert.True(Guid.TryParse(id, out _));

        // The recipe row must exist in the DB with ImageCount=0 (pending)
        var recipeId = Guid.Parse(id!);
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(recipe);
        Assert.Equal(0, recipe.ImageCount);
        Assert.Equal("Our family spaghetti", recipe.Name);
    }

    // ── RecipeReadyProcessor — happy path ──────────────────────────────────

    [Fact]
    public async Task RecipeReady_MatchingRecipe_SetsImageCount()
    {
        // Arrange: create a stub recipe
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Spaghetti",
            ImageCount = 0,
            IsDiscoverable = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        // Act
        var processor = new RecipeReadyProcessor(_db, NullLogger<RecipeReadyProcessor>.Instance);
        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "recipe_ready",
            ProcessorName = "RecipeReady",
            Payload = JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await processor.ExecuteAsync(task, CancellationToken.None);

        // Assert: recipe image_count = 1
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.Equal(1, recipe!.ImageCount);
    }

    [Fact]
    public async Task RecipeReady_DoesNotTouchFamilySettings()
    {
        // Arrange: create a recipe and a family_goto setting
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Spaghetti",
            ImageCount = 0,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var settingValue = JsonDocument.Parse(
            $$$"""{"description":"Spaghetti","recipeId":"{{{recipeId}}}","status":"pending"}"""
        ).RootElement;
        _db.FamilySettings.Add(new FamilySetting
        {
            Key = "family_goto",
            Value = settingValue,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        // Act
        var processor = new RecipeReadyProcessor(_db, NullLogger<RecipeReadyProcessor>.Instance);
        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "recipe_ready",
            ProcessorName = "RecipeReady",
            Payload = JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await processor.ExecuteAsync(task, CancellationToken.None);

        // Assert: family_goto setting remains UNCHANGED (it still has the "status" field we are migrating away from)
        var setting = _db.FamilySettings.First(s => s.Key == "family_goto");
        Assert.Equal("pending", setting.Value.GetProperty("status").GetString());
    }

    [Fact]
    public async Task RecipeReady_AlreadyComplete_IsNoOp()
    {
        var recipeId = Guid.NewGuid();
        var originalUpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Complete Recipe",
            ImageCount = 5,
            CreatedAt = originalUpdatedAt,
            UpdatedAt = originalUpdatedAt
        });
        await _db.SaveChangesAsync();

        var processor = new RecipeReadyProcessor(_db, NullLogger<RecipeReadyProcessor>.Instance);
        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "recipe_ready",
            ProcessorName = "RecipeReady",
            Payload = JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await processor.ExecuteAsync(task, CancellationToken.None);

        // Recipe image_count must remain 5 and UpdatedAt must remain unchanged
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.Equal(5, recipe!.ImageCount);
        Assert.Equal(originalUpdatedAt, recipe.UpdatedAt);
    }
}
