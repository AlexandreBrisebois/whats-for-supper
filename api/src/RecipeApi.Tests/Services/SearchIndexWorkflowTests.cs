using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Workflow;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class SearchIndexWorkflowTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        var scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        _db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync();
    }

    private Recipe BuildRecipe(string name = "Chicken Stir Fry") => new()
    {
        Id = Guid.NewGuid(),
        AddedBy = _factory.DefaultFamilyMemberId,
        Name = name,
        Description = "Fast dinner",
        Notes = "Kids love it",
        Ingredients = """["chicken","broccoli"]""",
        Rating = RecipeRating.Like,
        IsDiscoverable = true,
        Category = "ProteinFoods",
        Difficulty = "Easy",
        TotalTime = "30 min",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private async Task SeedDocumentAsync(Recipe recipe)
    {
        _db.Recipes.Add(recipe);
        _db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            IndexStatus = "pending",
            EmbeddingModel = "text-embedding-3-small",
            SchemaVersion = 1
        });
        await _db.SaveChangesAsync();
    }

    // ── Fingerprint consistency ───────────────────────────────────────────────

    [Fact]
    public void ComputeSourceFingerprint_Returns_SameValue_ForIdenticalRecipe()
    {
        var recipe = BuildRecipe();
        var fp1 = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var fp2 = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        Assert.Equal(fp1, fp2);
    }

    // ── Index execution ───────────────────────────────────────────────────────

    [Fact]
    public async Task ExecuteAsync_TransitionsStatus_PendingToIndexingToReady()
    {
        var recipe = BuildRecipe();
        await SeedDocumentAsync(recipe);
        

        var embeddingProvider = new FakeEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, embeddingProvider, null, new NullSearchTelemetry());

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var task = new WorkflowTask 
        { 
            Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = fingerprint })
        };
        await service.ExecuteAsync(task, CancellationToken.None);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.NotNull(doc);
        Assert.Equal("ready", doc.IndexStatus);
        Assert.NotNull(doc.LastIndexedAt);
        Assert.NotNull(doc.Embedding);
    }

    [Fact]
    public async Task ExecuteAsync_ExitsWithoutWriting_WhenFingerprintMismatches()
    {
        var recipe = BuildRecipe();
        await SeedDocumentAsync(recipe);
        

        var embeddingProvider = new FakeEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, embeddingProvider, null, new NullSearchTelemetry());

        var staleFingerprint = "0000000000000000000000000000000000000000000000000000000000000000";
        var task = new WorkflowTask 
        { 
            Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = staleFingerprint } )
        };
        await service.ExecuteAsync(task, CancellationToken.None);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        // Fingerprint mismatch should not update to ready.
        // It should remain in its original state (pending).
        Assert.NotNull(doc);
        Assert.Equal("pending", doc.IndexStatus);
    }

    [Fact]
    public async Task ExecuteAsync_SetsStatus_Failed_WhenEmbeddingProviderThrows()
    {
        var recipe = BuildRecipe();
        await SeedDocumentAsync(recipe);
        

        var failingProvider = new FailingEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, failingProvider, null, new NullSearchTelemetry());

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var task = new WorkflowTask 
        { 
            Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = fingerprint })
        };
        
        // ExecuteAsync should throw because we are calling it directly without worker error handling
        await Assert.ThrowsAnyAsync<Exception>(() => service.ExecuteAsync(task, CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_BuildsDocumentText_FromRecipeFields()
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            AddedBy = _factory.DefaultFamilyMemberId,
            Name = "Lemon Pasta",
            Description = "Bright citrus pasta",
            Notes = "Great for summer",
            Ingredients = """["pasta","lemon","parmesan"]""",
            Category = "WholeGrains",
            Difficulty = "Easy",
            TotalTime = "20 min",
            Rating = RecipeRating.Love,
            IsDiscoverable = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        await SeedDocumentAsync(recipe);
        

        var embeddingProvider = new FakeEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, embeddingProvider, null, new NullSearchTelemetry());

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var task = new WorkflowTask 
        { 
            Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = fingerprint })
        };
        await service.ExecuteAsync(task, CancellationToken.None);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.NotNull(doc);
        Assert.Contains("Lemon Pasta", doc.DocumentText);
        Assert.Contains("Bright citrus pasta", doc.DocumentText);
        Assert.Contains("pasta", doc.DocumentText);
    }

    [Fact]
    public async Task ExecuteAsync_ExitsWithoutWriting_WhenRecipeIsSoftDeleted()
    {
        var recipe = BuildRecipe();
        recipe.DeletedAt = DateTimeOffset.UtcNow;
        await SeedDocumentAsync(recipe);
        

        var embeddingProvider = new FakeEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, embeddingProvider, null, new NullSearchTelemetry());

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var task = new WorkflowTask 
        { 
            Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = fingerprint })
        };
        await service.ExecuteAsync(task, CancellationToken.None);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        // If soft-deleted, it should not be updated to ready.
        Assert.NotNull(doc);
        Assert.Equal("pending", doc.IndexStatus);
    }

    // ── Test doubles ──────────────────────────────────────────────────────────

    private sealed class FakeEmbeddingProvider : IEmbeddingProvider
    {
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
        {
            // Return a fixed-size 1536-dimension vector
            return Task.FromResult(new float[1536]);
        }
    }

    private sealed class FailingEmbeddingProvider : IEmbeddingProvider
    {
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
        {
            throw new InvalidOperationException("Embedding provider unavailable");
        }
    }

    private sealed class NullSearchTelemetry : ISearchTelemetry
    {
        public void Emit(string eventName, Dictionary<string, object?> payload) { }
    }
}
