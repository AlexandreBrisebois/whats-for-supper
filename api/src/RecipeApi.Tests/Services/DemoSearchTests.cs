using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DemoSearchTests
{
    [Fact]
    public async Task TypedSearch_UsesLexicalWithoutEvenAttemptingAnEmbedding()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = Seed(db, factory.DefaultFamilyMemberId, "Synthetic lentil soup");
        await db.SaveChangesAsync();
        var provider = new ForbiddenEmbedding();
        var semantic = new PreparedSemantic(db);
        var service = ActivatorUtilities.CreateInstance<RecipeSearchService>(scope.ServiceProvider, provider, semantic, Options());
        var response = await service.SearchAsync(new RecipeSearchRequestDto { Query = "lentil" });
        Assert.Equal(recipe.Id, response.TopPick!.Id);
        Assert.Equal(0, provider.Calls);
        Assert.Equal(0, semantic.Calls);
    }

    [Theory]
    [InlineData("compatible")]
    [InlineData("obsolete")]
    [InlineData("missing")]
    public async Task Similar_UsesPreparedVectorOrLocalFallbackWithoutNewEmbedding(string vector)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var source = Seed(db, factory.DefaultFamilyMemberId, "Synthetic lentil soup");
        var target = Seed(db, factory.DefaultFamilyMemberId, "Synthetic lentil stew");
        var sourceDoc = db.RecipeSearchDocuments.Local.Single(d => d.RecipeId == source.Id);
        var compatible = vector == "compatible";
        sourceDoc.EmbeddingModel = compatible ? "synthetic" : "obsolete";
        if (vector == "missing") sourceDoc.Embedding = null;
        await db.SaveChangesAsync();
        var provider = new ForbiddenEmbedding();
        var semantic = new PreparedSemantic(db, target.Id);
        var service = ActivatorUtilities.CreateInstance<RecipeSearchService>(scope.ServiceProvider, provider, semantic, Options());
        var response = await service.SearchAsync(new RecipeSearchRequestDto { SimilarToRecipeId = source.Id });
        Assert.Equal(target.Id, response.TopPick!.Id);
        Assert.Equal(compatible ? 1 : 0, semantic.Calls);
        Assert.Equal(0, provider.Calls);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Indexing_PublishesLexicalAndPreservesOnlyCurrentPreparedVector(bool edit)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = Seed(db, factory.DefaultFamilyMemberId, "Synthetic lentil soup");
        await db.SaveChangesAsync();
        if (edit) { recipe.Name = "Synthetic tomato soup"; await db.SaveChangesAsync(); }
        var provider = new ForbiddenEmbedding();
        var workflow = ActivatorUtilities.CreateInstance<SearchIndexWorkflow>(scope.ServiceProvider, provider);
        var task = new WorkflowTask { Payload = System.Text.Json.JsonSerializer.Serialize(new { recipeId = recipe.Id }) };
        await workflow.ExecuteAsync(task, CancellationToken.None);
        await workflow.ExecuteAsync(task, CancellationToken.None);
        var doc = await db.RecipeSearchDocuments.FindAsync(recipe.Id);
        Assert.Equal("ready", doc!.IndexStatus);
        Assert.Contains(edit ? "tomato" : "lentil", doc.DocumentText);
        Assert.Equal(edit ? "pending" : "ready", doc.EmbeddingStatus);
        Assert.Equal(edit, doc.Embedding is null);
        Assert.Equal(0, provider.Calls);
    }

    [Fact]
    public async Task ReconciliationAndBackfill_DoNotQueueEmbeddingOnlyRepair()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = Seed(db, factory.DefaultFamilyMemberId, "Synthetic lentil soup");
        db.RecipeSearchDocuments.Local.Single(d => d.RecipeId == recipe.Id).EmbeddingStatus = "pending";
        await db.SaveChangesAsync();
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator.Setup(o => o.TriggerAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>(), It.IsAny<DateTimeOffset?>()))
            .ReturnsAsync(new WorkflowInstance { Id = Guid.NewGuid() });
        var reconciliation = ActivatorUtilities.CreateInstance<SearchReconciliationWorkflow>(scope.ServiceProvider,
            db, orchestrator.Object, new RecipeSearchDocumentBuilder(), NullLogger<SearchReconciliationWorkflow>.Instance);
        await reconciliation.ExecuteAsync(new WorkflowTask { Payload = "{}" }, CancellationToken.None);
        var indexing = ActivatorUtilities.CreateInstance<SearchIndexWorkflow>(scope.ServiceProvider, new ForbiddenEmbedding());
        await indexing.BackfillAsync(orchestrator.Object);
        orchestrator.Verify(o => o.TriggerAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>(), It.IsAny<DateTimeOffset?>()), Times.Never);
    }

    private static Recipe Seed(RecipeDbContext db, Guid member, string name)
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(), Name = name, IsReady = true, ImageCount = 1,
            Ingredients = "[\"lentils\",\"tomato\"]", AddedBy = member,
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
        };
        var content = new RecipeSearchDocumentBuilder().Build(recipe);
        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe, content);
        db.Recipes.Add(recipe);
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id, DocumentText = content.DocumentText, SearchMetadata = content.SearchMetadata,
            SchemaVersion = content.SchemaVersion, SourceFingerprint = fingerprint, IndexStatus = "ready",
            Embedding = [0.25f, -0.5f], EmbeddingFingerprint = fingerprint, EmbeddingModel = "synthetic",
            EmbeddingVersion = "fixture-v1", EmbeddingStatus = "ready"
        });
        return recipe;
    }

    private static RecipeSearchRolloutOptions Options() => new()
    {
        Semantic = new RecipeSemanticSearchOptions { Enabled = true, EmbeddingModel = "synthetic", EmbeddingDimensions = 2, EmbeddingVersion = "fixture-v1" }
    };

    private sealed class ForbiddenEmbedding : IEmbeddingProvider
    {
        public int Calls { get; private set; }
        public Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
        {
            Calls++;
            throw new InvalidOperationException("Test forbids embedding calls.");
        }
    }

    private sealed class PreparedSemantic(RecipeDbContext db, Guid? target = null) : RecipeSemanticSearchRepository(db, new SystemClock())
    {
        public int Calls { get; private set; }
        public override Task<IReadOnlyList<RecipeSemanticCandidate>> SearchAsync(float[] queryEmbedding, RecipeSearchFiltersDto filters,
            RecipeSemanticSearchOptions options, Guid? excludedRecipeId, CancellationToken ct = default, Guid[]? gotoRecipeIds = null)
        {
            Calls++;
            return Task.FromResult<IReadOnlyList<RecipeSemanticCandidate>>(target is Guid id ? [new() { RecipeId = id, Score = 0.9 }] : []);
        }
    }
}
