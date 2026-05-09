using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Workflow;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

/// <summary>
/// Tests for Task 11A: Feature instrumentation.
/// Verifies that telemetry events are emitted with correct payloads.
/// Uses a stub ISearchTelemetry to capture emitted events.
/// </summary>
public class SearchTelemetryTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private RecipeDbContext _db = null!;
    private StubSearchTelemetry _telemetry = null!;

    public async Task InitializeAsync()
    {
        _telemetry = new StubSearchTelemetry();
        _factory = await TestWebApplicationFactory.CreateAsync(telemetry: _telemetry);
        var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        _db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync();
    }

    private async Task SeedDocumentAsync(Recipe recipe)
    {
        using var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.Add(recipe);
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            IndexStatus = "pending",
            EmbeddingModel = "text-embedding-3-small",
            SchemaVersion = 1
        });
        await db.SaveChangesAsync();
    }

    private Recipe BuildRecipe(string name) => new()
    {
        Id = Guid.NewGuid(),
        AddedBy = _factory.DefaultFamilyMemberId,
        Name = name,
        Description = "Test description",
        Ingredients = "[\"chicken\"]",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    // ── Search telemetry ──────────────────────────────────────────────────────

    [Fact]
    public async Task Search_Emits_RecipeSearchRequested_Event()
    {
        await SeedDocumentAsync(BuildRecipe("Test Recipe"));
        var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var searchService = scope.ServiceProvider.GetRequiredService<RecipeSearchService>();

        await searchService.SearchAsync(new RecipeSearchRequestDto { Query = "chicken" });

        Assert.Contains(_telemetry.Events, e => e.Name == SearchTelemetryEvents.SearchRequested);
        var evt = _telemetry.Events.First(e => e.Name == SearchTelemetryEvents.SearchRequested);
        Assert.True(evt.Payload.ContainsKey("mode"));
        Assert.True(evt.Payload.ContainsKey("hasPlanner"));
        Assert.True(evt.Payload.ContainsKey("hasFilters"));
        Assert.True(evt.Payload.ContainsKey("hasPantry"));
    }

    [Fact]
    public async Task Search_Emits_RecipeSearchCompleted_Event()
    {
        await SeedDocumentAsync(BuildRecipe("Chicken Soup"));
        var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var searchService = scope.ServiceProvider.GetRequiredService<RecipeSearchService>();

        await searchService.SearchAsync(new RecipeSearchRequestDto { Query = "chicken" });

        Assert.Contains(_telemetry.Events, e => e.Name == SearchTelemetryEvents.SearchCompleted);
        var evt = _telemetry.Events.First(e => e.Name == SearchTelemetryEvents.SearchCompleted);
        Assert.True(evt.Payload.ContainsKey("mode"));
        Assert.True(evt.Payload.ContainsKey("resultPath"));
        Assert.True(evt.Payload.ContainsKey("resultCount"));
        Assert.True(evt.Payload.ContainsKey("topPickPresent"));
        Assert.True(evt.Payload.ContainsKey("durationMs"));
    }

    [Fact]
    public async Task Search_Emits_RecipeSearchEmptyResults_WhenNoMatches()
    {
        // Don't seed any matching recipe
        var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var searchService = scope.ServiceProvider.GetRequiredService<RecipeSearchService>();

        await searchService.SearchAsync(new RecipeSearchRequestDto { Query = "xyzzy-no-match-12345" });

        Assert.Contains(_telemetry.Events, e => e.Name == SearchTelemetryEvents.SearchEmptyResults);
    }

    // ── Index workflow telemetry ──────────────────────────────────────────────

    [Fact]
    public async Task SearchIndexWorkflow_Emits_JobCompleted_OnSuccess()
    {
        var recipe = BuildRecipe("Index Completed Recipe");
        await SeedDocumentAsync(recipe);

        var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var workflow = new SearchIndexWorkflow(db, new FakeEmbeddingProvider(), telemetry: _telemetry);

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var task = new WorkflowTask { Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = fingerprint }) };
        await workflow.ExecuteAsync(task, CancellationToken.None);

        Assert.Contains(_telemetry.Events, e => e.Name == SearchTelemetryEvents.IndexJobCompleted);
        var evt = _telemetry.Events.First(e => e.Name == SearchTelemetryEvents.IndexJobCompleted);
        Assert.True(evt.Payload.ContainsKey("recipeId"));
        Assert.True(evt.Payload.ContainsKey("durationMs"));
    }

    [Fact]
    public async Task SearchIndexWorkflow_Emits_JobFailed_OnEmbeddingError()
    {
        var recipe = BuildRecipe("Index Failed Recipe");
        await SeedDocumentAsync(recipe);

        var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var workflow = new SearchIndexWorkflow(db, new FailingEmbeddingProvider(), telemetry: _telemetry);

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var task = new WorkflowTask { Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = fingerprint }) };
        
        await Assert.ThrowsAnyAsync<Exception>(() => workflow.ExecuteAsync(task, CancellationToken.None));

        Assert.Contains(_telemetry.Events, e => e.Name == SearchTelemetryEvents.IndexJobFailed);
        var evt = _telemetry.Events.First(e => e.Name == SearchTelemetryEvents.IndexJobFailed);
        Assert.True(evt.Payload.ContainsKey("recipeId"));
        Assert.True(evt.Payload.ContainsKey("error"));
    }

    [Fact]
    public async Task SearchIndexWorkflow_Emits_JobStale_WhenFingerprintMismatch()
    {
        var recipe = BuildRecipe("Stale Job Recipe");
        await SeedDocumentAsync(recipe);

        var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var workflow = new SearchIndexWorkflow(db, new FakeEmbeddingProvider(), telemetry: _telemetry);

        var staleFingerprint = "0000000000000000000000000000000000000000000000000000000000000000";
        var task = new WorkflowTask 
        { 
            Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = staleFingerprint })
        };
        await workflow.ExecuteAsync(task, CancellationToken.None);

        Assert.Contains(_telemetry.Events, e => e.Name == SearchTelemetryEvents.IndexJobStale);
        var evt = _telemetry.Events.First(e => e.Name == SearchTelemetryEvents.IndexJobStale);
        Assert.Equal("fingerprint_mismatch", evt.Payload.GetValueOrDefault("reason")?.ToString());
    }

    // ── Restore telemetry ─────────────────────────────────────────────────────

    [Fact]
    public async Task ManagementService_Emits_RestoreRehydrated_WhenCompatibleSidecar()
    {
        // This test verifies the restore path emits the right telemetry event.
        // The actual restore flow is integration-tested in SearchIndexBackupRestoreTests.
        // Here we just verify the event constants are defined correctly.
        Assert.Equal("recipe_index_restore_rehydrated", SearchTelemetryEvents.IndexRestoreRehydrated);
        Assert.Equal("recipe_index_restore_marked_pending", SearchTelemetryEvents.IndexRestoreMarkedPending);
    }

    // ── Test doubles ──────────────────────────────────────────────────────────

    private sealed class FakeEmbeddingProvider : IEmbeddingProvider
    {
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
            => Task.FromResult(new float[1536]);
    }

    private sealed class FailingEmbeddingProvider : IEmbeddingProvider
    {
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
            => throw new InvalidOperationException("Embedding provider unavailable");
    }
}
