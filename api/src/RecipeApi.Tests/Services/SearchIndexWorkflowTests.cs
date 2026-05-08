using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
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

    // ── Fingerprint consistency ───────────────────────────────────────────────

    [Fact]
    public void ComputeSourceFingerprint_Returns_SameValue_ForIdenticalRecipe()
    {
        var recipe = BuildRecipe();
        var fp1 = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var fp2 = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        Assert.Equal(fp1, fp2);
    }

    // ── Enqueue logic ─────────────────────────────────────────────────────────

    [Fact]
    public async Task EnqueueAsync_Creates_PendingDocument_WhenNoneExists()
    {
        var recipe = BuildRecipe();
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var service = new SearchIndexWorkflow(_db);
        await service.EnqueueAsync(recipe.Id);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.NotNull(doc);
        Assert.Equal("pending", doc.IndexStatus);
    }

    [Fact]
    public async Task EnqueueAsync_IsNoOp_WhenDocumentAlreadyPendingWithSameFingerprint()
    {
        var recipe = BuildRecipe();
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var service = new SearchIndexWorkflow(_db);
        await service.EnqueueAsync(recipe.Id);
        await service.EnqueueAsync(recipe.Id); // second call — same fingerprint

        var count = await _db.RecipeSearchDocuments.CountAsync(d => d.RecipeId == recipe.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task EnqueueAsync_IsTriggered_WhenRecipeIsCreated()
    {
        var recipe = BuildRecipe("New Created Recipe");
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var service = new SearchIndexWorkflow(_db);
        await service.EnqueueAsync(recipe.Id);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.NotNull(doc);
        Assert.Equal("pending", doc.IndexStatus);
    }

    [Fact]
    public async Task EnqueueAsync_SetsFingerprint_OnDocument()
    {
        var recipe = BuildRecipe();
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var service = new SearchIndexWorkflow(_db);
        await service.EnqueueAsync(recipe.Id);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.NotNull(doc!.SourceFingerprint);
        Assert.Equal(64, doc.SourceFingerprint!.Length);
    }

    // ── Index execution ───────────────────────────────────────────────────────

    [Fact]
    public async Task ExecuteAsync_TransitionsStatus_PendingToIndexingToReady()
    {
        var recipe = BuildRecipe();
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var embeddingProvider = new FakeEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, embeddingProvider);

        await service.EnqueueAsync(recipe.Id);
        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        await service.ExecuteAsync(recipe.Id, fingerprint);

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
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var embeddingProvider = new FakeEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, embeddingProvider);

        await service.EnqueueAsync(recipe.Id);

        // Mutate recipe after enqueue — fingerprint will be stale
        recipe.Name = "Changed Name";
        recipe.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        var staleFingerprint = "0000000000000000000000000000000000000000000000000000000000000000";
        await service.ExecuteAsync(recipe.Id, staleFingerprint);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        // Should still be pending (not overwritten to ready)
        Assert.Equal("pending", doc!.IndexStatus);
    }

    [Fact]
    public async Task ExecuteAsync_SetsStatus_Failed_WhenEmbeddingProviderThrows()
    {
        var recipe = BuildRecipe();
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var failingProvider = new FailingEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, failingProvider);

        await service.EnqueueAsync(recipe.Id);
        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        await service.ExecuteAsync(recipe.Id, fingerprint);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.Equal("failed", doc!.IndexStatus);
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
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var embeddingProvider = new FakeEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, embeddingProvider);

        await service.EnqueueAsync(recipe.Id);
        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        await service.ExecuteAsync(recipe.Id, fingerprint);

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
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var embeddingProvider = new FakeEmbeddingProvider();
        var service = new SearchIndexWorkflow(_db, embeddingProvider);

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        await service.ExecuteAsync(recipe.Id, fingerprint);

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.Null(doc);
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
}
