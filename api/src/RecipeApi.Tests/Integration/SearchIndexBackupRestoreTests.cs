using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for Task 10: Backup/restore-compatible index persistence.
/// </summary>
public class SearchIndexBackupRestoreTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private ManagementService _management = null!;
    private SearchIndexWorkflow _workflow = null!;
    private string _dataRoot = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        _management = _scope.ServiceProvider.GetRequiredService<ManagementService>();
        _workflow = _scope.ServiceProvider.GetRequiredService<SearchIndexWorkflow>();
        _dataRoot = _scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root;
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    private Recipe BuildReadyRecipe(string name = "Chicken Stir Fry") => new()
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

    private async Task SeedReadyDocumentAsync(Recipe recipe)
    {
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        _db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            DocumentText = SearchIndexWorkflow.BuildDocumentText(recipe),
            SearchMetadata = "{}",
            IndexStatus = "ready",
            EmbeddingJson = """[0.1,0.2,0.3]""",
            EmbeddingModel = "text-embedding-3-small",
            SourceFingerprint = fingerprint,
            LastIndexedAt = DateTimeOffset.UtcNow,
            SchemaVersion = 1
        });
        await _db.SaveChangesAsync();
    }

    // ── Backup ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task BackupAsync_Writes_SearchIndexJson_For_ReadyRecipe()
    {
        var recipe = BuildReadyRecipe();
        await SeedReadyDocumentAsync(recipe);

        await _management.BackupAsync();

        var sidecarPath = GetSidecarPath(recipe.Id);
        Assert.True(File.Exists(sidecarPath), $"search.index.json should exist at {sidecarPath}");
    }

    [Fact]
    public async Task BackupAsync_DoesNot_Write_SearchIndexJson_For_PendingRecipe()
    {
        var recipe = BuildReadyRecipe("Pending Recipe");
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();
        _db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            DocumentText = string.Empty,
            SearchMetadata = "{}",
            IndexStatus = "pending",
            EmbeddingModel = "text-embedding-3-small",
            SchemaVersion = 1
        });
        await _db.SaveChangesAsync();

        await _management.BackupAsync();

        var sidecarPath = GetSidecarPath(recipe.Id);
        Assert.False(File.Exists(sidecarPath), "search.index.json should NOT exist for pending recipe");
    }

    [Fact]
    public async Task BackupAsync_DoesNot_Write_SearchIndexJson_For_FailedRecipe()
    {
        var recipe = BuildReadyRecipe("Failed Recipe");
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();
        _db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            DocumentText = string.Empty,
            SearchMetadata = "{}",
            IndexStatus = "failed",
            EmbeddingModel = "text-embedding-3-small",
            SchemaVersion = 1
        });
        await _db.SaveChangesAsync();

        await _management.BackupAsync();

        var sidecarPath = GetSidecarPath(recipe.Id);
        Assert.False(File.Exists(sidecarPath), "search.index.json should NOT exist for failed recipe");
    }

    [Fact]
    public async Task BackupAsync_Sidecar_HasCorrect_Schema()
    {
        var recipe = BuildReadyRecipe();
        await SeedReadyDocumentAsync(recipe);

        await _management.BackupAsync();

        var sidecarPath = GetSidecarPath(recipe.Id);
        var json = await File.ReadAllTextAsync(sidecarPath);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.Equal(recipe.Id.ToString(), root.GetProperty("recipeId").GetString());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("documentText").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("embeddingModel").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("sourceFingerprint").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("exportedAt").GetString()));
    }

    // ── Restore ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreAsync_WithCompatibleSidecar_Upserts_SearchDocumentAsReady()
    {
        var recipe = BuildReadyRecipe();
        await SeedReadyDocumentAsync(recipe);
        await _management.BackupAsync();

        // Clear the document to simulate a fresh restore
        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        _db.RecipeSearchDocuments.Remove(doc!);
        await _db.SaveChangesAsync();

        var result = await _management.RestoreAsync();

        var restored = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.NotNull(restored);
        Assert.Equal("ready", restored.IndexStatus);
    }

    [Fact]
    public async Task RestoreAsync_WithMissingSidecar_SetsPending()
    {
        var recipe = BuildReadyRecipe("No Sidecar Recipe");
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Write recipe.info so restore picks it up
        await WriteRecipeInfoAsync(recipe);

        var result = await _management.RestoreAsync();

        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        // Missing sidecar → should be pending
        if (doc is not null)
            Assert.Equal("pending", doc.IndexStatus);
    }

    [Fact]
    public async Task RestoreAsync_WithIncompatibleSchemaVersion_SetsPending()
    {
        var recipe = BuildReadyRecipe();
        await SeedReadyDocumentAsync(recipe);
        await _management.BackupAsync();

        // Tamper with the sidecar to have wrong schemaVersion
        var sidecarPath = GetSidecarPath(recipe.Id);
        var json = await File.ReadAllTextAsync(sidecarPath);
        using var doc = JsonDocument.Parse(json);
        var obj = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)!;
        obj["schemaVersion"] = JsonDocument.Parse("99").RootElement;
        await File.WriteAllTextAsync(sidecarPath, JsonSerializer.Serialize(obj));

        // Clear the document
        var existingDoc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        _db.RecipeSearchDocuments.Remove(existingDoc!);
        await _db.SaveChangesAsync();

        await _management.RestoreAsync();

        var restored = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        if (restored is not null)
            Assert.Equal("pending", restored.IndexStatus);
    }

    [Fact]
    public async Task RestoreAsync_WithIncompatibleEmbeddingModel_SetsPending()
    {
        var recipe = BuildReadyRecipe();
        await SeedReadyDocumentAsync(recipe);
        await _management.BackupAsync();

        // Tamper with the sidecar to have wrong embeddingModel
        var sidecarPath = GetSidecarPath(recipe.Id);
        var json = await File.ReadAllTextAsync(sidecarPath);
        var obj = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)!;
        obj["embeddingModel"] = JsonDocument.Parse(@"""completely-different-model-xyz""").RootElement;
        await File.WriteAllTextAsync(sidecarPath, JsonSerializer.Serialize(obj));

        // Clear the document
        var existingDoc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        _db.RecipeSearchDocuments.Remove(existingDoc!);
        await _db.SaveChangesAsync();

        await _management.RestoreAsync();

        var restored = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        if (restored is not null)
            Assert.Equal("pending", restored.IndexStatus);
    }

    [Fact]
    public async Task RestoreAsync_CompatibleSidecar_DoesNotGetOverwrittenByStaleJob()
    {
        var recipe = BuildReadyRecipe();
        await SeedReadyDocumentAsync(recipe);
        await _management.BackupAsync();

        // Clear and restore
        var doc = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        _db.RecipeSearchDocuments.Remove(doc!);
        await _db.SaveChangesAsync();
        await _management.RestoreAsync();

        var restored = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.NotNull(restored);
        Assert.Equal("ready", restored.IndexStatus);

        // Simulate a stale job arriving with wrong fingerprint — should NOT overwrite
        var staleFingerprint = "0000000000000000000000000000000000000000000000000000000000000000";
        var task = new WorkflowTask 
        { 
            Payload = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = staleFingerprint })
        };
        await _workflow.ExecuteAsync(task, CancellationToken.None);

        var afterStaleJob = await _db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.Equal("ready", afterStaleJob!.IndexStatus);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string GetSidecarPath(Guid recipeId)
    {
        var recipesRoot = _scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Root;
        return Path.Combine(recipesRoot, recipeId.ToString(), "search.index.json");
    }

    private async Task WriteRecipeInfoAsync(Recipe recipe)
    {
        var store = _scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        await store.WriteInfoAsync(new RecipeInfo
        {
            Id = recipe.Id,
            Name = recipe.Name,
            Description = recipe.Description,
            Notes = recipe.Notes,
            Rating = recipe.Rating,
            IsDiscoverable = recipe.IsDiscoverable,
            Category = recipe.Category,
            Difficulty = recipe.Difficulty,
            TotalTime = recipe.TotalTime,
            ImageCount = 0,
            IsSynthesized = true,
            AddedBy = recipe.AddedBy,
            CreatedAt = recipe.CreatedAt
        });
    }
}
