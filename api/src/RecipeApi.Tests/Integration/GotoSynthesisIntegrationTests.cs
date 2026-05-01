using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for Phase 13 Phase C — workflow plumbing.
///   1. POST /api/recipes/describe triggers the goto-synthesis workflow.
///   2. MarkGotoReadyProcessor flips status=ready and image_count=1.
///   3. MarkGotoReadyProcessor is a no-op when no family_goto setting exists.
///   4. MarkGotoReadyProcessor is a no-op when recipeId doesn't match.
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

    // ── MarkGotoReadyProcessor — happy path ──────────────────────────────────

    [Fact]
    public async Task MarkGotoReady_MatchingRecipeId_SetsReadyAndImageCount()
    {
        // Arrange: create a stub recipe and a family_goto setting pointing to it
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
        var processor = new MarkGotoReadyProcessor(_db, NullLogger<MarkGotoReadyProcessor>.Instance);
        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "mark_goto_ready",
            ProcessorName = "MarkGotoReady",
            Payload = JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await processor.ExecuteAsync(task, CancellationToken.None);

        // Assert: setting status = "ready"
        var setting = _db.FamilySettings.First(s => s.Key == "family_goto");
        Assert.Equal("ready", setting.Value.GetProperty("status").GetString());

        // Assert: recipe image_count = 1
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.Equal(1, recipe!.ImageCount);
    }

    // ── MarkGotoReadyProcessor — no family_goto setting ──────────────────────

    [Fact]
    public async Task MarkGotoReady_NoSetting_IsNoOp()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Orphan Recipe",
            ImageCount = 0,
            IsDiscoverable = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        var processor = new MarkGotoReadyProcessor(_db, NullLogger<MarkGotoReadyProcessor>.Instance);
        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "mark_goto_ready",
            ProcessorName = "MarkGotoReady",
            Payload = JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        // Should not throw
        var result = await processor.ExecuteAsync(task, CancellationToken.None);

        // Recipe image_count must remain 0
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.Equal(0, recipe!.ImageCount);
    }

    // ── MarkGotoReadyProcessor — recipeId mismatch ───────────────────────────

    [Fact]
    public async Task MarkGotoReady_RecipeIdMismatch_IsNoOp()
    {
        var gotoRecipeId = Guid.NewGuid();
        var otherRecipeId = Guid.NewGuid();

        _db.Recipes.Add(new Recipe
        {
            Id = otherRecipeId,
            Name = "Other Recipe",
            ImageCount = 0,
            IsDiscoverable = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        // family_goto points to a DIFFERENT recipe
        var settingValue = JsonDocument.Parse(
            $$$"""{"description":"Spaghetti","recipeId":"{{{gotoRecipeId}}}","status":"pending"}"""
        ).RootElement;
        _db.FamilySettings.Add(new FamilySetting
        {
            Key = "family_goto",
            Value = settingValue,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        var processor = new MarkGotoReadyProcessor(_db, NullLogger<MarkGotoReadyProcessor>.Instance);
        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "mark_goto_ready",
            ProcessorName = "MarkGotoReady",
            Payload = JsonSerializer.Serialize(new { recipeId = otherRecipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await processor.ExecuteAsync(task, CancellationToken.None);

        // Setting status must remain "pending"
        var setting = _db.FamilySettings.First(s => s.Key == "family_goto");
        Assert.Equal("pending", setting.Value.GetProperty("status").GetString());

        // Other recipe image_count must remain 0
        var recipe = await _db.Recipes.FindAsync(otherRecipeId);
        Assert.Equal(0, recipe!.ImageCount);
    }
}
